import Phaser from 'phaser';
import { generateAllAssets } from '../assets/textures';
import { COLORS, FONTS, HEX, VW, VH } from '../config';

export class PreloadScene extends Phaser.Scene {
  constructor() { super('Preload'); }
  create() {
    // Themed loading text
    const txt = this.add.text(VW / 2, VH / 2 - 20, 'Awakening the Engine', {
      fontFamily: FONTS.title, fontSize: '40px', color: HEX.gold, stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5);
    const sub = this.add.text(VW / 2, VH / 2 + 30, 'Forging celestial circuitry…', {
      fontFamily: FONTS.ui, fontSize: '18px', color: HEX.text,
    }).setOrigin(0.5);
    this.tweens.add({ targets: [txt, sub], alpha: 0.5, yoyo: true, duration: 800, repeat: -1 });

    // Generate after a frame so UI shows
    this.time.delayedCall(60, () => {
      generateAllAssets(this);
      this.time.delayedCall(200, () => this.scene.start('MainMenu'));
    });
  }
}
