import Phaser from 'phaser';
import { COLORS, FONTS, HEX, VH, VW } from '../config';
import { ThemedButton } from '../ui/Components';

export class HelpScene extends Phaser.Scene {
  fromScene = 'MainMenu';
  constructor() { super('Help'); }

  init(data: { from: string }) { this.fromScene = data?.from ?? 'MainMenu'; }

  create() {
    this.add.rectangle(VW / 2, VH / 2, VW, VH, 0x000000, 0.7).setInteractive();
    this.add.image(VW / 2, VH / 2, 'panel-modal');

    this.add.text(VW / 2, VH / 2 - 240, 'HOW TO PLAY', {
      fontFamily: FONTS.title, fontSize: '40px', color: HEX.gold,
      stroke: '#000', strokeThickness: 4, letterSpacing: 6 as any,
    }).setOrigin(0.5);

    const lines = [
      ['Objective', 'Survive 20 eras while keeping Planetary Harmony above 50%.'],
      ['Top Stats', 'Climate, Nature, Humans, Tectonics and Pollution show the world\'s aggregate vital signs.'],
      ['Machines', 'Each turn, choose ONE divine machine. Some target a single region; others act globally.'],
      ['Targeting', 'Click a machine card, then click a region (if needed), then press Confirm.'],
      ['Events', 'The world reacts. Droughts, floods, eruptions and miracles can shift harmony each era.'],
      ['Win', 'Reach Era 20 with Harmony ≥ 50% — the Engine sings in tune.'],
      ['Lose', 'If Harmony falls to 15% or below, the world unspools.'],
      ['Controls', 'Mouse to play · ESC or P to pause · ENTER / SPACE to confirm.'],
    ];
    let y = VH / 2 - 165;
    for (const [t, b] of lines) {
      this.add.text(VW / 2 - 380, y, t, { fontFamily: FONTS.title, fontSize: '18px', color: HEX.bronzeLight }).setOrigin(0, 0);
      this.add.text(VW / 2 - 220, y, b, { fontFamily: FONTS.ui, fontSize: '16px', color: HEX.text, wordWrap: { width: 600 } }).setOrigin(0, 0);
      y += 46;
    }

    new ThemedButton(this, {
      x: VW / 2, y: VH / 2 + 240, text: 'Return',
      onClick: () => this.close(),
    });

    this.input.keyboard?.on('keydown-ESC', () => this.close());
  }

  close() {
    this.scene.stop();
    this.scene.resume(this.fromScene);
  }
}
