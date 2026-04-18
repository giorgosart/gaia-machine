import Phaser from 'phaser';
import { audio } from '../audio/AudioEngine';
import { COLORS, FONTS, HEX, VH, VW } from '../config';
import { Settings } from '../state';
import { ThemedButton } from '../ui/Components';

export class MainMenuScene extends Phaser.Scene {
  private rotatingPlanet?: Phaser.GameObjects.Container;
  private particles?: Phaser.GameObjects.Group;
  constructor() { super('MainMenu'); }

  create() {
    // Background
    this.add.image(VW / 2, VH / 2, 'bg-stars').setDisplaySize(VW, VH);
    // Animated planet silhouette behind menu
    this.rotatingPlanet = this.add.container(VW / 2 - 350, VH / 2 + 30);
    const planet = this.add.image(0, 0, 'world-platform').setScale(0.85).setAlpha(0.85);
    this.rotatingPlanet.add(planet);
    // glow halo
    const glow = this.add.image(0, 0, 'glow-cyan').setScale(2.6).setAlpha(0.45).setBlendMode(Phaser.BlendModes.ADD);
    this.rotatingPlanet.addAt(glow, 0);
    this.tweens.add({ targets: planet, angle: 360, duration: 90000, repeat: -1 });
    this.tweens.add({ targets: glow, alpha: 0.7, scale: 2.9, yoyo: true, duration: 4500, repeat: -1, ease: 'Sine.easeInOut' });

    // Drifting energy particles
    this.spawnParticles();

    // Title logo
    const logo = this.add.image(VW / 2, 170, 'title-logo').setScale(1.0);
    this.tweens.add({ targets: logo, y: 175, yoyo: true, duration: 3500, repeat: -1, ease: 'Sine.easeInOut' });

    // Tagline
    this.add.text(VW / 2, 270, 'Tend the Living Machine of Earth', {
      fontFamily: FONTS.title, fontSize: '26px', color: HEX.bronzeLight,
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setShadow(0, 2, '#000', 4, true, true);

    // Menu panel
    const panelX = VW / 2 + 350, panelY = VH / 2 + 40;
    this.add.image(panelX, panelY, 'panel-menu');
    this.add.text(panelX, panelY - 230, 'OBSERVATORY', {
      fontFamily: FONTS.title, fontSize: '24px', color: HEX.gold, stroke: '#000', strokeThickness: 3,
      letterSpacing: 4 as any,
    }).setOrigin(0.5);

    const startY = panelY - 150;
    const gap = 80;

    new ThemedButton(this, {
      x: panelX, y: startY + gap * 0, text: 'Start Game',
      onClick: () => this.transitionTo('Game'),
    });
    new ThemedButton(this, {
      x: panelX, y: startY + gap * 1, text: 'How to Play',
      onClick: () => { this.scene.launch('Help', { from: 'MainMenu' }); this.scene.pause(); },
    });
    new ThemedButton(this, {
      x: panelX, y: startY + gap * 2, text: 'Settings',
      onClick: () => this.openSettingsPopup(panelX, panelY),
    });
    new ThemedButton(this, {
      x: panelX, y: startY + gap * 3, text: 'Credits',
      onClick: () => this.openCreditsPopup(panelX, panelY),
    });

    // Music/SFX toggles in corner
    this.makeAudioToggles();

    // Music
    audio.resume();
    audio.setMusicEnabled(Settings.music);
    audio.setSfxEnabled(Settings.sfx);
    audio.duck(1);
    audio.playMusic('menu');

    // Footer hint
    this.add.text(VW / 2, VH - 30, 'Click to begin · Press ESC in-game to pause', {
      fontFamily: FONTS.ui, fontSize: '14px', color: HEX.textDim,
    }).setOrigin(0.5);
  }

  private makeAudioToggles() {
    const x = 50, y = VH - 80;
    const mkToggle = (label: string, get: () => boolean, set: (v: boolean) => void, dx: number) => {
      const c = this.add.container(x + dx, y);
      const bg = this.add.image(0, 0, 'btn-icon-idle');
      const txt = this.add.text(0, 0, label, { fontFamily: FONTS.title, fontSize: '14px', color: HEX.gold }).setOrigin(0.5);
      const stateTxt = this.add.text(45, 0, get() ? 'ON' : 'OFF', { fontFamily: FONTS.ui, fontSize: '14px', color: get() ? HEX.ok : HEX.danger }).setOrigin(0, 0.5);
      c.add([bg, txt, stateTxt]);
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerover', () => { bg.setTexture('btn-icon-hover'); audio.hover(); });
      bg.on('pointerout', () => { bg.setTexture('btn-icon-idle'); });
      bg.on('pointerup', () => {
        const v = !get(); set(v);
        stateTxt.setText(v ? 'ON' : 'OFF');
        stateTxt.setColor(v ? HEX.ok : HEX.danger);
        audio.click();
      });
    };
    mkToggle('MUS', () => Settings.music, (v) => { Settings.music = v; audio.setMusicEnabled(v); }, 0);
    mkToggle('SFX', () => Settings.sfx, (v) => { Settings.sfx = v; audio.setSfxEnabled(v); }, 130);
  }

  private spawnParticles() {
    for (let i = 0; i < 30; i++) {
      const p = this.add.image(Math.random() * VW, Math.random() * VH, 'glow-cyan')
        .setScale(0.05 + Math.random() * 0.08)
        .setAlpha(0.05 + Math.random() * 0.15)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({
        targets: p, y: p.y - 200 - Math.random() * 200, x: p.x + (Math.random() - 0.5) * 100,
        alpha: 0, duration: 8000 + Math.random() * 6000, repeat: -1, repeatDelay: Math.random() * 3000,
        onRepeat: () => { p.x = Math.random() * VW; p.y = VH + 50; p.alpha = 0.15; },
      });
    }
  }

  private openCreditsPopup(x: number, y: number) {
    const overlay = this.add.container(0, 0).setDepth(100);
    const dim = this.add.rectangle(VW / 2, VH / 2, VW, VH, 0x000000, 0.6).setInteractive();
    overlay.add(dim);
    const panel = this.add.image(VW / 2, VH / 2, 'panel-modal').setScale(0.7);
    overlay.add(panel);
    const title = this.add.text(VW / 2, VH / 2 - 180, 'CREDITS', { fontFamily: FONTS.title, fontSize: '40px', color: HEX.gold, stroke: '#000', strokeThickness: 3 }).setOrigin(0.5);
    overlay.add(title);
    const body = this.add.text(VW / 2, VH / 2 - 30,
      'Planetary Engine\n\nA divine strategy simulation\n\nDesign · Code · Art · Music\nProcedurally forged for this jam build\n\nThank you for tending the world.',
      { fontFamily: FONTS.ui, fontSize: '20px', color: HEX.text, align: 'center', lineSpacing: 6 }
    ).setOrigin(0.5);
    overlay.add(body);
    const close = new ThemedButton(this, {
      x: VW / 2, y: VH / 2 + 180, text: 'Return',
      onClick: () => overlay.destroy(true),
    });
    overlay.add(close);
  }

  private openSettingsPopup(_x: number, _y: number) {
    const overlay = this.add.container(0, 0).setDepth(100);
    const dim = this.add.rectangle(VW / 2, VH / 2, VW, VH, 0x000000, 0.6).setInteractive();
    overlay.add(dim);
    const panel = this.add.image(VW / 2, VH / 2, 'panel-modal').setScale(0.6);
    overlay.add(panel);
    overlay.add(this.add.text(VW / 2, VH / 2 - 150, 'SETTINGS', { fontFamily: FONTS.title, fontSize: '40px', color: HEX.gold, stroke: '#000', strokeThickness: 3 }).setOrigin(0.5));
    const mkRow = (label: string, y: number, get: () => boolean, set: (v: boolean) => void) => {
      overlay.add(this.add.text(VW / 2 - 150, y, label, { fontFamily: FONTS.title, fontSize: '24px', color: HEX.text }).setOrigin(0, 0.5));
      const btn = new ThemedButton(this, {
        x: VW / 2 + 120, y, text: get() ? 'ON' : 'OFF', textureKey: 'btn-small',
        onClick: () => { const v = !get(); set(v); btn.setLabel(v ? 'ON' : 'OFF'); },
      });
      overlay.add(btn);
    };
    mkRow('Music', VH / 2 - 50, () => Settings.music, v => { Settings.music = v; audio.setMusicEnabled(v); });
    mkRow('Sound Effects', VH / 2 + 20, () => Settings.sfx, v => { Settings.sfx = v; audio.setSfxEnabled(v); });
    overlay.add(new ThemedButton(this, {
      x: VW / 2, y: VH / 2 + 130, text: 'Close',
      onClick: () => overlay.destroy(true),
    }));
  }

  private transitionTo(scene: string) {
    const fade = this.add.rectangle(VW / 2, VH / 2, VW, VH, 0x000000, 0).setDepth(200);
    this.tweens.add({
      targets: fade, alpha: 1, duration: 500, ease: 'Cubic.easeIn',
      onComplete: () => { audio.stopMusic(); this.scene.start(scene); },
    });
  }
}
