import Phaser from 'phaser';
import { audio } from '../audio/AudioEngine';
import { COLORS, FONTS, HEX, VH, VW } from '../config';
import { Settings } from '../state';
import { spawnAmbientBubbles, spawnCometStreaks, spawnStarShimmer, ThemedButton } from '../ui/Components';

export class MainMenuScene extends Phaser.Scene {
  constructor() { super('MainMenu'); }

  create() {
    // Background
    this.add.image(VW / 2, VH / 2, 'bg-stars').setDisplaySize(VW, VH);

    // Drifting energy bubbles, shimmering stars, occasional comets.
    spawnStarShimmer(this, VW, VH);
    spawnAmbientBubbles(this, VW, VH);
    spawnCometStreaks(this, VW, VH);

    // Title logo
    const logo = this.add.image(VW / 2, 110, 'title-logo').setScale(1.0);
    this.tweens.add({ targets: logo, y: 115, yoyo: true, duration: 3500, repeat: -1, ease: 'Sine.easeInOut' });

    // Tagline
    this.add.text(VW / 2, 185, 'Tend the Living Machine of Earth', {
      fontFamily: FONTS.title, fontSize: '26px', color: HEX.bronzeLight,
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setShadow(0, 2, '#000', 4, true, true);

    // Menu buttons — centred vertically & horizontally below the title.
    const panelX = VW / 2;
    const panelY = VH / 2 + 40;
    const gap = 80;
    const startY = panelY - gap * 1.5;

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
