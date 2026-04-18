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
import { getRegionLocalPolygon } from '../assets/textures';
import { getRegionLocalPolygon } from '../assets/textures';

interface RegionVisual {
  state: RegionState;
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.GameObject;
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
  worldCenter = { x: 800, y: 540 };
  worldRadius = 210;
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
    const panelWidth = 240;
    const gap = 10;
    const totalWidth = labels.length * panelWidth + (labels.length - 1) * gap;
    const startX = (VW - totalWidth) / 2;
    const y = 60;
    labels.forEach((k, i) => {
      const x = startX + i * (panelWidth + gap) + panelWidth / 2;
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
    // Platform (ornate bronze frame + inner ocean). This rotates slowly.
    const platform = this.add.image(x, y, 'world-platform').setScale(0.85);
    this.tweens.add({ targets: platform, angle: 360, duration: 220000, repeat: -1 });
    // Continental world map — static layer above the rotating platform so the
    // landmasses keep their orientation while the bronze rim spins.
    this.add.image(x, y, 'world-continents').setScale(0.85);

    // Place regions on the continent anchors
    this.world.regions.forEach((r) => {
      const rd = REGIONS.find(rg => rg.id === r.id)!;
      const rx = x + rd.nx * this.worldRadius;
      const ry = y + rd.ny * this.worldRadius;
      const cont = this.add.container(rx, ry);

      // Build a hit polygon that matches this region's continent shape exactly.
      // displaySize = texture size (720) × platform scale (0.85); polygon
      // points are in container-local space so they align with the continent
      // art regardless of screen position.
      const PLATFORM_DISPLAY = 720 * 0.85;
      const polyPts = getRegionLocalPolygon(r.id, PLATFORM_DISPLAY, 1.05);
      const hit = this.add.zone(0, 0, 1, 1);
      cont.add(hit);
      // Fallback to a circle if the polygon is empty (shouldn't happen).
      const hitR = 75;
      const polygon = polyPts.length
        ? new Phaser.Geom.Polygon(polyPts.flatMap(p => [p.x, p.y]))
        : null;

      // Selection ring (hidden until selected)
      const ring = this.add.graphics();
      ring.lineStyle(3, COLORS.gold, 0);
      cont.add(ring);

      // Hover highlight ring — drawn fresh on hover via a separate graphics
      const hover = this.add.graphics();
      cont.add(hover);

      // Label, offset radially outward so it never sits on a neighbor continent.
      const ang = Math.atan2(rd.ny, rd.nx);
      const lx = Math.cos(ang) * 58;
      const ly = Math.sin(ang) * 58;
      const label = this.add.text(lx, ly, r.name, {
        fontFamily: FONTS.title, fontSize: '13px', color: HEX.goldBright,
        stroke: '#000', strokeThickness: 3,
      }).setOrigin(0.5);
      const pad = 8;
      const pillW = label.width + pad * 2;
      const pillH = label.height + 4;
      const pill = this.add.graphics();
      pill.fillStyle(0x0b1622, 0.78);
      pill.fillRoundedRect(lx - pillW / 2, ly - pillH / 2, pillW, pillH, 6);
      pill.lineStyle(1, COLORS.bronzeLight, 0.55);
      pill.strokeRoundedRect(lx - pillW / 2, ly - pillH / 2, pillW, pillH, 6);
      cont.add(pill);
      cont.add(label);

      // Optional machine marker pinned to continent centre
      const markers: Phaser.GameObjects.Image[] = [];
      if (Math.random() < 0.55) {
        const machineKey = ['rain', 'magma', 'bloom', 'wind', 'purifier', 'peace'][Math.floor(Math.random() * 6)];
        const m = this.add.image(0, -4, `icon-${machineKey}`).setScale(0.38).setAlpha(0.9);
        cont.add(m); markers.push(m);
      }

      // Interaction (on the invisible hit zone)
      if (polygon) {
        hit.setInteractive(polygon, Phaser.Geom.Polygon.Contains);
      } else {
        hit.setInteractive(new Phaser.Geom.Circle(0, 0, hitR), Phaser.Geom.Circle.Contains);
      }
      if (hit.input) hit.input.cursor = 'pointer';
      hit.on('pointerover', () => {
        if (!this.selectedMachine || this.selectedMachine.target === 'global') return;
        hover.clear();
        if (polygon) {
          hover.lineStyle(2, COLORS.divine, 0.7);
          hover.strokePoints(polygon.points, true);
        } else {
          hover.lineStyle(2, COLORS.divine, 0.7).strokeCircle(0, 0, hitR + 6);
        }
        audio.hover();
      });
      hit.on('pointerout', () => {
        hover.clear();
      });
      hit.on('pointerup', () => {
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

      this.regionVisuals.push({
        state: r,
        container: cont,
        sprite: hit,
        label,
        machineMarkers: markers,
        ring,
        flagIcon: null,
      });
    });
  }

  selectRegion(r: RegionState) {
    this.selectedRegion = r;
    audio.select();
    const PLATFORM_DISPLAY = 720 * 0.85;
    this.regionVisuals.forEach(rv => {
      rv.ring.clear();
      if (rv.state === r) {
        const pts = getRegionLocalPolygon(rv.state.id, PLATFORM_DISPLAY, 1.05);
        if (pts.length) {
          const poly = new Phaser.Geom.Polygon(pts.flatMap(p => [p.x, p.y]));
          rv.ring.lineStyle(3, COLORS.gold, 1);
          rv.ring.strokePoints(poly.points, true);
          rv.ring.lineStyle(1, COLORS.divine, 0.7);
          const pts2 = getRegionLocalPolygon(rv.state.id, PLATFORM_DISPLAY, 1.12);
          const poly2 = new Phaser.Geom.Polygon(pts2.flatMap(p => [p.x, p.y]));
          rv.ring.strokePoints(poly2.points, true);
        } else {
          rv.ring.lineStyle(3, COLORS.gold, 1).strokeCircle(0, 0, 80);
          rv.ring.lineStyle(1, COLORS.divine, 0.7).strokeCircle(0, 0, 88);
        }
        spawnRuneRing(this, rv.container.x, rv.container.y, COLORS.gold);
      }
    });
    this.refreshConfirm();
    this.refreshEventPanel();
  }

  // ===================== EVENT BANNER =====================
  buildEventBanner() {
    const x = VW / 2, y = 150;
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
    const rx = VW - 200, ry = 240;
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

    // RIGHT (bottom): Event panel — directly underneath harmony.
    const lx = rx, ly = ry + 240;
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
  }

  // ===================== LEFT MACHINE COLUMN =====================
  buildBottomBar() {
    // Left-side vertical panel: 2 columns x 3 rows of machine cards.
    const panelX = 200, panelY = 480;
    const panelHalfH = 280;  // panel-machines is 560 tall
    this.add.image(panelX, panelY, 'panel-machines');
    this.add.text(panelX, panelY - panelHalfH + 28, 'CHOOSE A MACHINE', {
      fontFamily: FONTS.title, fontSize: '18px', color: HEX.gold, letterSpacing: 3 as any,
    }).setOrigin(0.5);

    const cards = MACHINES;
    const cols = 2;
    const colGap = 10;
    const rowGap = 15;
    const cardW = 133, cardH = 125; // card-idle scaled 0.78
    const gridW = cols * cardW + (cols - 1) * colGap;
    const firstColX = panelX - gridW / 2 + cardW / 2;
    const rows = Math.ceil(cards.length / cols);
    const gridTop = panelY - panelHalfH + 70; // below title
    cards.forEach((m, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = firstColX + col * (cardW + colGap);
      const cy = gridTop + cardH / 2 + row * (cardH + rowGap);
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
      const short = this.add.text(0, 50, '', {
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

    // Confirm button — bottom of the column, inside panel bounds.
    const confirmY = gridTop + rows * cardH + (rows - 1) * rowGap + 50;
    this.confirmBtn = new ThemedButton(this, {
      x: panelX, y: confirmY, text: 'Confirm', textureKey: 'btn-small',
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

  // ===================== PAUSE =====================
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

    // Region stress overlay — subtle warm/red tint drawn over the continent
    this.regionVisuals.forEach(rv => {
      const r = rv.state;
      const stress = (r.pollution + (100 - r.flora) * 0.5 + Math.abs(r.temperature - 50)) / 3;
      const overlay = (rv as any)._stressOverlay as Phaser.GameObjects.Graphics | undefined;
      if (overlay) overlay.clear();
      const g = overlay ?? this.add.graphics();
      if (!overlay) {
        rv.container.addAt(g, 0);
        (rv as any)._stressOverlay = g;
      }
      if (stress > 60) { g.fillStyle(0xff5533, 0.22).fillCircle(0, 0, 72); }
      else if (stress > 40) { g.fillStyle(0xddbb66, 0.15).fillCircle(0, 0, 72); }
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
        c.short.setText('');
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


