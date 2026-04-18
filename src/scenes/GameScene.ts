// The main gameplay scene: full UI matching the reference image.
// Top stat bar, world platform with regions, event banner, side panels,
// machine selection bar, confirm button, trend indicators.
import Phaser from 'phaser';
import { audio } from '../audio/AudioEngine';
import { COLORS, FONTS, HEX, VH, VW } from '../config';
import { MACHINES, REGIONS, type MachineDef, type RegionState, type WorldState } from '../data/data';
import { createWorld, describeStat, isMachineReady, nextTurn, statColor } from '../sim/Simulation';
import { Game, Settings } from '../state';
import { spawnFloater, spawnRuneRing, StatMeter, ThemedButton } from '../ui/Components';

interface RegionVisual {
  state: RegionState;
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
  machineMarkers: Phaser.GameObjects.Image[];
  ring: Phaser.GameObjects.Graphics;
  flagIcon: Phaser.GameObjects.Image | null;
}

interface MachineCardUI {
  def: MachineDef;
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Image;
  icon: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
  short: Phaser.GameObjects.Text;
  cooldownTxt: Phaser.GameObjects.Text;
}

export class GameScene extends Phaser.Scene {
  world!: WorldState;
  // top stat panels
  statMeters: Record<string, StatMeter> = {};
  statValues: Record<string, Phaser.GameObjects.Text> = {};
  // center
  worldCenter = { x: 800, y: 470 };
  worldRadius = 280;
  regionVisuals: RegionVisual[] = [];
  selectedRegion: RegionState | null = null;
  bannerText!: Phaser.GameObjects.Text;
  bannerContainer!: Phaser.GameObjects.Container;
  // side panels
  eventTitle!: Phaser.GameObjects.Text;
  eventDesc!: Phaser.GameObjects.Text;
  eventIcon!: Phaser.GameObjects.Image;
  eraText!: Phaser.GameObjects.Text;
  harmonyText!: Phaser.GameObjects.Text;
  harmonyMeter!: StatMeter;
  objectiveText!: Phaser.GameObjects.Text;
  // bottom
  machineCards: MachineCardUI[] = [];
  selectedMachine: MachineDef | null = null;
  confirmBtn!: ThemedButton;
  // trends
  trendTexts: Phaser.GameObjects.Text[] = [];
  // misc
  busy = false;

  constructor() { super('Game'); }

  create() {
    this.world = Game.world ?? createWorld();
    Game.world = this.world;

    // Background
    this.add.image(VW / 2, VH / 2, 'bg-stars').setDisplaySize(VW, VH);
    // subtle vignette via dark overlay edges (drawn graphics)
    const vg = this.add.graphics();
    vg.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.0, 0.0, 0.7, 0.7);
    vg.fillRect(0, 0, VW, VH);

    this.buildTopBar();
    this.buildWorld();
    this.buildEventBanner();
    this.buildSidePanels();
    this.buildBottomBar();
    this.buildTrends();
    this.buildPauseButton();

    // Initial UI sync
    this.refreshAll();

    // Input: ESC for pause, Enter to confirm
    this.input.keyboard?.on('keydown-ESC', () => this.openPause());
    this.input.keyboard?.on('keydown-P', () => this.openPause());
    this.input.keyboard?.on('keydown-ENTER', () => { if (this.confirmBtn.enabled) this.confirmAction(); });
    this.input.keyboard?.on('keydown-SPACE', () => { if (this.confirmBtn.enabled) this.confirmAction(); });

    // Music
    audio.resume();
    audio.setMusicEnabled(Settings.music);
    audio.setSfxEnabled(Settings.sfx);
    audio.duck(1);
    audio.playMusic('game');

    // Intro fade
    const fade = this.add.rectangle(VW / 2, VH / 2, VW, VH, 0x000000, 1).setDepth(200);
    this.tweens.add({ targets: fade, alpha: 0, duration: 600, ease: 'Cubic.easeOut', onComplete: () => fade.destroy() });

    // Periodic alert pulse if harmony low
    this.time.addEvent({ delay: 1500, loop: true, callback: () => this.maybeWarnPulse() });
  }

  // ===================== TOP STAT BAR =====================
  buildTopBar() {
    const labels = ['climate', 'nature', 'humans', 'tectonics', 'pollution'] as const;
    const titles = ['CLIMATE', 'NATURE', 'HUMANS', 'TECTONICS', 'POLLUTION'];
    const startX = 60, gap = 250, y = 80;
    labels.forEach((k, i) => {
      const x = startX + i * gap + 120;
      this.add.image(x, y, 'panel-stat');
      this.add.image(x - 90, y - 18, `icon-${k}`).setScale(0.7);
      this.add.text(x - 50, y - 30, titles[i], {
        fontFamily: FONTS.title, fontSize: '16px', color: HEX.gold,
        letterSpacing: 2 as any,
      }).setOrigin(0, 0.5);
      const stateTxt = this.add.text(x - 50, y - 8, '—', {
        fontFamily: FONTS.ui, fontSize: '14px', color: HEX.text,
      }).setOrigin(0, 0.5);
      this.statValues[k] = stateTxt;
      const meter = new StatMeter(this, x, y + 22, 200, 14);
      this.statMeters[k] = meter;
    });
  }

  // ===================== WORLD =====================
  buildWorld() {
    const { x, y } = this.worldCenter;
    // Ambient glow halo behind platform
    this.add.image(x, y, 'glow-cyan').setScale(2.4).setAlpha(0.3).setBlendMode(Phaser.BlendModes.ADD);
    // Platform
    const platform = this.add.image(x, y, 'world-platform').setScale(0.85);
    // Slow rotation
    this.tweens.add({ targets: platform, angle: 360, duration: 220000, repeat: -1 });

    // Place regions on the inner ocean
    this.world.regions.forEach((r) => {
      const rd = REGIONS.find(rg => rg.id === r.id)!;
      const rx = x + rd.nx * this.worldRadius;
      const ry = y + rd.ny * this.worldRadius;
      const cont = this.add.container(rx, ry);
      const sprite = this.add.image(0, 0, `region-${r.terrain}`).setScale(0.7);
      sprite.setOrigin(0.5);
      cont.add(sprite);
      // selection ring
      const ring = this.add.graphics();
      ring.lineStyle(3, COLORS.gold, 0); // hidden
      cont.add(ring);
      // Label
      const label = this.add.text(0, 60, r.name, {
        fontFamily: FONTS.title, fontSize: '14px', color: HEX.text,
        stroke: '#000', strokeThickness: 3,
      }).setOrigin(0.5);
      cont.add(label);
      // optional machine markers (visible structures embedded in nature)
      const markers: Phaser.GameObjects.Image[] = [];
      if (Math.random() < 0.55) {
        const machineKey = ['rain', 'magma', 'bloom', 'wind', 'purifier', 'peace'][Math.floor(Math.random() * 6)];
        const m = this.add.image(15, -10, `icon-${machineKey}`).setScale(0.45).setAlpha(0.85);
        cont.add(m); markers.push(m);
      }

      // Interaction
      sprite.setInteractive({ useHandCursor: true });
      sprite.on('pointerover', () => {
        if (!this.selectedMachine || this.selectedMachine.target === 'global') return;
        cont.setScale(1.05);
        audio.hover();
      });
      sprite.on('pointerout', () => { cont.setScale(1.0); });
      sprite.on('pointerup', () => {
        if (!this.selectedMachine) {
          this.toast('Choose a machine first.');
          return;
        }
        if (this.selectedMachine.target === 'global') {
          this.toast('This machine acts globally.');
          return;
        }
        this.selectRegion(r);
      });

      this.regionVisuals.push({ state: r, container: cont, sprite, label, machineMarkers: markers, ring, flagIcon: null });
    });
  }

  selectRegion(r: RegionState) {
    this.selectedRegion = r;
    audio.select();
    this.regionVisuals.forEach(rv => {
      rv.ring.clear();
      if (rv.state === r) {
        rv.ring.lineStyle(3, COLORS.gold, 1).strokeCircle(0, 0, 70);
        rv.ring.lineStyle(1, COLORS.divine, 0.7).strokeCircle(0, 0, 78);
        spawnRuneRing(this, rv.container.x, rv.container.y, COLORS.gold);
      }
    });
    this.refreshConfirm();
    this.refreshEventPanel();
  }

  // ===================== EVENT BANNER =====================
  buildEventBanner() {
    const x = VW / 2, y = 175;
    this.bannerContainer = this.add.container(x, y);
    const banner = this.add.image(0, 0, 'banner-shape').setScale(1.0);
    this.bannerContainer.add(banner);
    this.bannerText = this.add.text(0, 0, 'The world breathes…', {
      fontFamily: FONTS.title, fontSize: '22px', color: HEX.goldBright,
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setShadow(0, 2, '#000', 4, true, true);
    this.bannerContainer.add(this.bannerText);
  }

  setBanner(text: string, color = HEX.goldBright) {
    this.bannerText.setText(text);
    this.bannerText.setColor(color);
    this.tweens.add({
      targets: this.bannerContainer, scaleX: 1.05, scaleY: 1.05, yoyo: true, duration: 200, ease: 'Sine.easeOut',
    });
  }

  // ===================== SIDE PANELS =====================
  buildSidePanels() {
    // LEFT: Event panel
    const lx = 220, ly = 360;
    this.add.image(lx, ly, 'panel-event');
    this.add.text(lx, ly - 90, 'CURRENT EVENT', { fontFamily: FONTS.title, fontSize: '16px', color: HEX.gold, letterSpacing: 3 as any }).setOrigin(0.5);
    this.eventIcon = this.add.image(lx - 130, ly - 30, 'icon-climate').setScale(0.7);
    this.eventTitle = this.add.text(lx - 90, ly - 50, 'Awakening', {
      fontFamily: FONTS.title, fontSize: '20px', color: HEX.bronzeLight,
    }).setOrigin(0, 0);
    this.eventDesc = this.add.text(lx - 145, ly - 5, 'A still world hums with potential. Choose a machine and act.', {
      fontFamily: FONTS.ui, fontSize: '15px', color: HEX.text,
      wordWrap: { width: 290 }, lineSpacing: 3,
    }).setOrigin(0, 0);

    // RIGHT: Objective panel
    const rx = VW - 220, ry = 360;
    this.add.image(rx, ry, 'panel-objective');
    this.add.text(rx, ry - 100, 'PLANETARY HARMONY', { fontFamily: FONTS.title, fontSize: '16px', color: HEX.gold, letterSpacing: 3 as any }).setOrigin(0.5);
    this.eraText = this.add.text(rx, ry - 65, 'Era 1 / 20', {
      fontFamily: FONTS.title, fontSize: '20px', color: HEX.bronzeLight,
    }).setOrigin(0.5);
    this.harmonyText = this.add.text(rx, ry - 25, '75%', {
      fontFamily: FONTS.title, fontSize: '48px', color: HEX.goldBright,
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5);
    this.harmonyMeter = new StatMeter(this, rx, ry + 30, 280, 18);
    this.objectiveText = this.add.text(rx, ry + 75, 'Keep harmony above 50% until Era 20.', {
      fontFamily: FONTS.ui, fontSize: '14px', color: HEX.text, align: 'center',
      wordWrap: { width: 300 }, lineSpacing: 3,
    }).setOrigin(0.5, 0);
  }

  // ===================== BOTTOM MACHINE BAR =====================
  buildBottomBar() {
    const y = VH - 130;
    const x = VW / 2;
    this.add.image(x, y, 'panel-bottom');
    this.add.text(x - 530, y - 80, 'CHOOSE A MACHINE', {
      fontFamily: FONTS.title, fontSize: '18px', color: HEX.gold, letterSpacing: 3 as any,
    }).setOrigin(0, 0.5);

    const cardW = 130, gap = 16;
    const cards = MACHINES;
    const totalW = cards.length * cardW + (cards.length - 1) * gap;
    const startX = x - totalW / 2 + cardW / 2 - 100;
    cards.forEach((m, i) => {
      const cx = startX + i * (cardW + gap);
      const cy = y - 5;
      const cont = this.add.container(cx, cy);
      const bg = this.add.image(0, 0, 'card-idle').setScale(0.78);
      cont.add(bg);
      const icon = this.add.image(0, -28, m.iconKey).setScale(0.95);
      cont.add(icon);
      const label = this.add.text(0, 22, m.name, {
        fontFamily: FONTS.title, fontSize: '13px', color: HEX.goldBright,
        stroke: '#000', strokeThickness: 2, align: 'center',
        wordWrap: { width: 110 },
      }).setOrigin(0.5, 0);
      cont.add(label);
      const short = this.add.text(0, 50, m.short, {
        fontFamily: FONTS.ui, fontSize: '11px', color: HEX.text, align: 'center',
        wordWrap: { width: 110 },
      }).setOrigin(0.5, 0);
      cont.add(short);
      const cooldownTxt = this.add.text(0, 0, '', {
        fontFamily: FONTS.title, fontSize: '36px', color: HEX.danger, stroke: '#000', strokeThickness: 4,
      }).setOrigin(0.5);
      cont.add(cooldownTxt);

      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerover', () => {
        if (!this.machineEnabled(m)) return;
        cont.setScale(1.05); audio.hover();
        this.showMachineTooltip(m, cx, cy);
      });
      bg.on('pointerout', () => { cont.setScale(1.0); this.hideMachineTooltip(); });
      bg.on('pointerup', () => {
        if (!this.machineEnabled(m)) { audio.warn(); return; }
        this.selectMachine(m);
      });

      this.machineCards.push({ def: m, container: cont, bg, icon, label, short, cooldownTxt });
    });

    // Confirm button (right of cards)
    this.confirmBtn = new ThemedButton(this, {
      x: x + 480, y: y - 5, text: 'Confirm', textureKey: 'btn-confirm',
      enabled: false,
      onClick: () => this.confirmAction(),
    });
  }

  selectMachine(m: MachineDef) {
    this.selectedMachine = m;
    audio.select();
    if (m.target === 'global') this.selectedRegion = null;
    this.machineCards.forEach(c => {
      c.bg.setTexture(c.def === m ? 'card-selected' : 'card-idle');
    });
    // clear region rings if global
    if (m.target === 'global') {
      this.regionVisuals.forEach(rv => rv.ring.clear());
    }
    this.refreshConfirm();
    this.refreshEventPanel();
  }

  machineEnabled(m: MachineDef): boolean {
    return this.world.era >= m.unlockEra && isMachineReady(this.world, m) && !this.busy;
  }

  refreshConfirm() {
    let ok = !!this.selectedMachine && !this.busy;
    if (this.selectedMachine && this.selectedMachine.target === 'region' && !this.selectedRegion) ok = false;
    this.confirmBtn.setEnabled(ok);
  }

  // Tooltip
  tooltip?: Phaser.GameObjects.Container;
  showMachineTooltip(m: MachineDef, x: number, y: number) {
    this.hideMachineTooltip();
    const c = this.add.container(x, y - 130).setDepth(50);
    const bg = this.add.graphics();
    bg.fillStyle(0x0a0e18, 0.95).fillRoundedRect(-160, -60, 320, 120, 8);
    bg.lineStyle(1.5, COLORS.bronze, 1).strokeRoundedRect(-160, -60, 320, 120, 8);
    c.add(bg);
    c.add(this.add.text(0, -45, m.name, { fontFamily: FONTS.title, fontSize: '16px', color: HEX.gold }).setOrigin(0.5));
    c.add(this.add.text(0, -20, m.desc, {
      fontFamily: FONTS.ui, fontSize: '12px', color: HEX.text, align: 'center',
      wordWrap: { width: 300 }, lineSpacing: 2,
    }).setOrigin(0.5, 0));
    this.tooltip = c;
  }
  hideMachineTooltip() { if (this.tooltip) { this.tooltip.destroy(); this.tooltip = undefined; } }

  // ===================== TRENDS =====================
  buildTrends() {
    const x = VW - 200, y = VH - 250;
    this.add.image(x, y, 'panel-trend');
    this.add.text(x, y - 38, 'PLANETARY TRENDS', { fontFamily: FONTS.title, fontSize: '14px', color: HEX.gold, letterSpacing: 2 as any }).setOrigin(0.5);
    const labels = ['Climate', 'Nature', 'Humans', 'Tectonics', 'Pollution'];
    labels.forEach((l, i) => {
      const tx = x - 130 + (i % 3) * 90;
      const ty = y - 12 + Math.floor(i / 3) * 28;
      this.add.text(tx, ty, l, { fontFamily: FONTS.ui, fontSize: '12px', color: HEX.textDim }).setOrigin(0, 0);
      const t = this.add.text(tx + 60, ty, '·', { fontFamily: FONTS.title, fontSize: '14px', color: HEX.text }).setOrigin(0, 0);
      this.trendTexts.push(t);
    });
  }

  refreshTrends() {
    const t = this.world.trends;
    const arr = [t.climate, t.nature, t.humans, t.tectonics, t.pollution];
    const goodWhenUp = [true, true, true, false, false];
    arr.forEach((d, i) => {
      const txt = this.trendTexts[i];
      if (Math.abs(d) < 0.5) { txt.setText('—'); txt.setColor(HEX.textDim); return; }
      const up = d > 0;
      const sym = up ? '▲' : '▼';
      const isGood = goodWhenUp[i] === up;
      txt.setText(`${sym} ${Math.abs(d).toFixed(0)}`);
      txt.setColor(isGood ? HEX.ok : HEX.danger);
    });
  }

  // ===================== PAUSE BTN =====================
  buildPauseButton() {
    const btn = new ThemedButton(this, {
      x: 80, y: VH - 40, text: '❚❚ Pause', textureKey: 'btn-small',
      onClick: () => this.openPause(),
    });
    btn.setScale(0.85);
    this.add.text(VW - 80, VH - 40, 'ESC pauses · ENTER confirms', { fontFamily: FONTS.ui, fontSize: '12px', color: HEX.textDim }).setOrigin(1, 0.5);
  }

  openPause() {
    if (this.busy) return;
    this.scene.launch('Pause', { from: 'Game' });
    this.scene.pause();
    audio.duck(0.3);
  }

  // ===================== ACTION =====================
  confirmAction() {
    if (!this.selectedMachine) return;
    if (this.selectedMachine.target === 'region' && !this.selectedRegion) return;
    if (this.busy) return;
    this.busy = true;
    this.confirmBtn.setEnabled(false);

    audio.confirm();
    audio.machineActivate(this.selectedMachine.id);

    // Visual: rune ring on target
    if (this.selectedMachine.target === 'region' && this.selectedRegion) {
      const rv = this.regionVisuals.find(r => r.state === this.selectedRegion);
      if (rv) {
        spawnRuneRing(this, rv.container.x, rv.container.y, parseInt(this.selectedMachine.accent.slice(1), 16));
        // pulse
        this.tweens.add({ targets: rv.container, scale: 1.15, yoyo: true, duration: 250, ease: 'Sine.easeOut' });
      }
    } else {
      // global: rings on all
      this.regionVisuals.forEach(rv => spawnRuneRing(this, rv.container.x, rv.container.y, parseInt(this.selectedMachine!.accent.slice(1), 16)));
    }

    this.time.delayedCall(450, () => {
      // Resolve
      const result = nextTurn(this.world, this.selectedMachine, this.selectedRegion);
      audio.turn();

      // Floaters for deltas
      if (this.selectedMachine!.target === 'region' && this.selectedRegion) {
        const rv = this.regionVisuals.find(r => r.state === this.selectedRegion);
        if (rv) result.deltas.forEach((d, i) => {
          this.time.delayedCall(i * 120, () => spawnFloater(this, rv.container.x, rv.container.y - 40, d, HEX.goldBright));
        });
      } else {
        this.regionVisuals.forEach((rv, i) => {
          if (i < 3) result.deltas.forEach((d, j) =>
            this.time.delayedCall(j * 120, () => spawnFloater(this, rv.container.x, rv.container.y - 40, d, HEX.divine)));
        });
      }

      // Alerts
      if (result.alerts.length) {
        const text = result.alerts.join(' · ');
        this.setBanner(text, result.triggeredEvents.some(e => e.evt.severity === 'danger') ? HEX.danger : HEX.goldBright);
        if (result.triggeredEvents.some(e => e.evt.severity === 'danger')) audio.warn();
        // Show first event in left panel
        const e = result.triggeredEvents[0];
        if (e) {
          this.eventTitle.setText(e.evt.title);
          this.eventDesc.setText(e.evt.desc(e.region));
          this.flashRegion(e.region);
        }
      } else {
        this.setBanner('The Engine hums in balance.');
      }

      this.refreshAll();

      // End-state check
      if (result.result !== 'continue') {
        this.time.delayedCall(900, () => {
          this.scene.start('End', { result: result.result, world: this.world });
        });
        return;
      }

      // reset selection
      this.selectedMachine = null;
      this.selectedRegion = null;
      this.machineCards.forEach(c => c.bg.setTexture('card-idle'));
      this.regionVisuals.forEach(rv => rv.ring.clear());
      this.busy = false;
      this.refreshConfirm();
    });
  }

  flashRegion(r?: RegionState) {
    if (!r) return;
    const rv = this.regionVisuals.find(v => v.state === r);
    if (!rv) return;
    const flash = this.add.image(rv.container.x, rv.container.y, 'glow-red').setScale(0.6).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.9);
    this.tweens.add({ targets: flash, alpha: 0, scale: 1.2, duration: 800, ease: 'Cubic.easeOut', onComplete: () => flash.destroy() });
  }

  // ===================== REFRESH =====================
  refreshAll() {
    // Top stats
    const labels = ['climate', 'nature', 'humans', 'tectonics', 'pollution'] as const;
    labels.forEach(k => {
      const v = (this.world as any)[k] as number;
      this.statValues[k].setText(describeStat(k, v));
      this.statValues[k].setColor('#' + statColor(k, v).toString(16).padStart(6, '0'));
      this.statMeters[k].setValue(v, statColor(k, v));
    });
    // Era + harmony
    this.eraText.setText(`Era ${this.world.era} / ${this.world.totalEras}`);
    const h = Math.round(this.world.harmony);
    this.harmonyText.setText(`${h}%`);
    this.harmonyText.setColor(h > 50 ? HEX.goldBright : h > 30 ? HEX.warn : HEX.danger);
    this.harmonyMeter.setValue(h, h > 50 ? COLORS.green : h > 30 ? COLORS.warn : COLORS.danger);
    // objective text
    if (h <= 25) this.objectiveText.setText('CRITICAL: Restore harmony before collapse.');
    else if (this.world.era >= this.world.totalEras - 3) this.objectiveText.setText(`Final eras! Hold harmony above 50% by Era ${this.world.totalEras}.`);
    else this.objectiveText.setText('Keep harmony above 50% until Era ' + this.world.totalEras + '.');

    // Region tints based on health
    this.regionVisuals.forEach(rv => {
      const r = rv.state;
      const stress = (r.pollution + (100 - r.flora) * 0.5 + Math.abs(r.temperature - 50)) / 3;
      if (stress > 60) rv.sprite.setTint(0xff8866);
      else if (stress > 40) rv.sprite.setTint(0xddccaa);
      else rv.sprite.clearTint();
      // flag icon
      if (rv.flagIcon) { rv.flagIcon.destroy(); rv.flagIcon = null; }
      if (r.flag) {
        const k = r.flag === 'fire' ? 'icon-magma' : r.flag === 'flood' ? 'icon-rain' : r.flag === 'bloom' ? 'icon-bloom' : r.flag === 'drought' ? 'icon-climate' : 'icon-pollution';
        const ic = this.add.image(0, -45, k).setScale(0.5);
        rv.container.add(ic);
        rv.flagIcon = ic;
      }
    });

    // Machine cards (cooldown)
    this.machineCards.forEach(c => {
      const cd = this.world.machineCooldowns[c.def.id] || 0;
      const locked = this.world.era < c.def.unlockEra;
      if (cd > 0) { c.cooldownTxt.setText(String(cd)); c.bg.setAlpha(0.55); }
      else { c.cooldownTxt.setText(''); c.bg.setAlpha(locked ? 0.4 : 1); }
      if (locked) {
        c.label.setColor(HEX.textDim);
        c.short.setText(`Unlocks Era ${c.def.unlockEra}`);
      } else {
        c.label.setColor(HEX.goldBright);
        c.short.setText(c.def.short);
      }
    });

    this.refreshTrends();
  }

  refreshEventPanel() {
    if (this.selectedMachine) {
      this.eventTitle.setText(this.selectedMachine.name);
      this.eventDesc.setText(this.selectedMachine.desc);
      this.eventIcon.setTexture(this.selectedMachine.iconKey);
      if (this.selectedMachine.target === 'region' && !this.selectedRegion) {
        this.eventDesc.setText(this.selectedMachine.desc + '\n\n→ Select a region.');
      } else if (this.selectedRegion) {
        this.eventDesc.setText(this.selectedMachine.desc + `\n\n→ Target: ${this.selectedRegion.name}.`);
      }
    }
  }

  // ===================== misc =====================
  toastObj?: Phaser.GameObjects.Text;
  toast(s: string) {
    if (this.toastObj) this.toastObj.destroy();
    this.toastObj = this.add.text(VW / 2, VH - 250, s, {
      fontFamily: FONTS.title, fontSize: '20px', color: HEX.warn,
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(100);
    this.tweens.add({ targets: this.toastObj, alpha: 0, y: VH - 280, duration: 1400, ease: 'Cubic.easeOut',
      onComplete: () => this.toastObj?.destroy() });
  }

  warnPulseTimer = 0;
  maybeWarnPulse() {
    if (this.world.harmony < 30) {
      this.cameras.main.flash(120, 80, 0, 0);
      audio.warn();
    }
  }
}


