import Phaser from 'phaser';
import { audio } from '../audio/AudioEngine';
import { COLORS, FONTS, HEX, VH, VW } from '../config';
import { Game, Settings } from '../state';
import { ThemedButton } from '../ui/Components';

export class PauseScene extends Phaser.Scene {
  constructor() { super('Pause'); }

  create() {
    // Dim background that lets gameplay show through
    this.add.rectangle(VW / 2, VH / 2, VW, VH, 0x000000, 0.6).setInteractive();

    // Floating energy particles
    for (let i = 0; i < 14; i++) {
      const p = this.add.image(Math.random() * VW, Math.random() * VH, 'glow-cyan')
        .setScale(0.05 + Math.random() * 0.1).setAlpha(0.05 + Math.random() * 0.15)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: p, y: p.y - 200, alpha: 0, duration: 6000 + Math.random() * 4000, repeat: -1 });
    }

    const px = VW / 2, py = VH / 2;
    this.add.image(px, py, 'panel-pause');

    this.add.text(px, py - 220, 'PAUSED', {
      fontFamily: FONTS.title, fontSize: '46px', color: HEX.gold,
      stroke: '#000', strokeThickness: 4, letterSpacing: 6 as any,
    }).setOrigin(0.5);

    this.add.text(px, py - 170, 'The Engine awaits your command.', {
      fontFamily: FONTS.ui, fontSize: '16px', color: HEX.text,
    }).setOrigin(0.5);

    const startY = py - 100;
    const gap = 75;
    new ThemedButton(this, { x: px, y: startY + gap * 0, text: 'Resume', onClick: () => this.resumeGame() });
    new ThemedButton(this, { x: px, y: startY + gap * 1, text: 'Restart Run', onClick: () => this.restart() });
    new ThemedButton(this, { x: px, y: startY + gap * 2, text: 'How to Play', onClick: () => { this.scene.launch('Help', { from: 'Pause' }); this.scene.pause(); } });

    // Mini settings: music/sfx toggles
    const mkToggle = (label: string, get: () => boolean, set: (v: boolean) => void, dx: number) => {
      const cy = py + 150;
      const c = this.add.container(px + dx, cy);
      const txt = this.add.text(-50, 0, label, { fontFamily: FONTS.title, fontSize: '14px', color: HEX.gold }).setOrigin(0, 0.5);
      const stateBtn = new ThemedButton(this, {
        x: 60, y: 0, text: get() ? 'ON' : 'OFF', textureKey: 'btn-small',
        onClick: () => { const v = !get(); set(v); stateBtn.setLabel(v ? 'ON' : 'OFF'); },
      });
      stateBtn.setScale(0.55);
      c.add([txt, stateBtn]);
    };
    mkToggle('Music', () => Settings.music, v => { Settings.music = v; audio.setMusicEnabled(v); }, -110);
    mkToggle('SFX', () => Settings.sfx, v => { Settings.sfx = v; audio.setSfxEnabled(v); }, 110);

    new ThemedButton(this, { x: px, y: py + 220, text: 'Return to Main Menu', onClick: () => this.toMenu() });

    this.input.keyboard?.on('keydown-ESC', () => this.resumeGame());
  }

  resumeGame() {
    audio.duck(1);
    this.scene.stop();
    this.scene.resume('Game');
  }

  restart() {
    audio.stopMusic();
    Game.world = undefined;
    this.scene.stop('Game');
    this.scene.stop();
    this.scene.start('RunSetup');
  }

  toMenu() {
    audio.stopMusic();
    Game.world = undefined;
    this.scene.stop('Game');
    this.scene.stop();
    this.scene.start('MainMenu');
  }
}
