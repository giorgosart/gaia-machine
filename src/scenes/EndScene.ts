import Phaser from 'phaser';
import { audio } from '../audio/AudioEngine';
import { COLORS, FONTS, HEX, VH, VW } from '../config';
import type { WorldState } from '../data/data';
import { Game } from '../state';
import { ThemedButton } from '../ui/Components';

export class EndScene extends Phaser.Scene {
  result: 'win' | 'lose' = 'win';
  world!: WorldState;
  constructor() { super('End'); }

  init(data: { result: 'win' | 'lose'; world: WorldState }) {
    this.result = data.result;
    this.world = data.world;
  }

  create() {
    audio.stopMusic();
    this.add.image(VW / 2, VH / 2, 'bg-stars').setDisplaySize(VW, VH);

    // dramatic glow
    const win = this.result === 'win';
    const glow = this.add.image(VW / 2, VH / 2, win ? 'glow-gold' : 'glow-red')
      .setScale(5).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.4);
    this.tweens.add({ targets: glow, alpha: 0.7, scale: 5.5, yoyo: true, duration: 3000, repeat: -1 });

    // floating planet
    const planet = this.add.image(VW / 2, VH / 2 + 30, 'world-platform').setScale(0.6).setAlpha(win ? 1 : 0.5);
    if (!win) planet.setTint(0xff7a5a);
    this.tweens.add({ targets: planet, angle: 360, duration: 60000, repeat: -1 });

    const px = VW / 2, py = VH / 2;
    this.add.image(px, py - 40, 'panel-modal').setScale(0.7);

    this.add.text(px, py - 220, win ? 'HARMONY ACHIEVED' : 'THE ENGINE FALTERS', {
      fontFamily: FONTS.title, fontSize: '54px',
      color: win ? HEX.goldBright : HEX.danger,
      stroke: '#000', strokeThickness: 5,
      letterSpacing: 6 as any,
    }).setOrigin(0.5);

    this.add.text(px, py - 150, win
      ? 'You guided Earth through twenty eras of trial and triumph.'
      : 'Beneath your hand the great machine fell out of song.',
      { fontFamily: FONTS.ui, fontSize: '18px', color: HEX.text }
    ).setOrigin(0.5);

    const stats = [
      ['Final Harmony', `${Math.round(this.world.harmony)}%`],
      ['Eras Survived', `${Math.min(this.world.era - 1, this.world.totalEras)} / ${this.world.totalEras}`],
      ['Climate', `${Math.round(this.world.climate)}%`],
      ['Nature', `${Math.round(this.world.nature)}%`],
      ['Humans', `${Math.round(this.world.humans)}%`],
      ['Pollution', `${Math.round(this.world.pollution)}%`],
    ];
    stats.forEach((s, i) => {
      const row = i;
      const yy = py - 70 + row * 32;
      this.add.text(px - 160, yy, s[0], { fontFamily: FONTS.title, fontSize: '18px', color: HEX.bronzeLight }).setOrigin(0, 0.5);
      this.add.text(px + 160, yy, s[1], { fontFamily: FONTS.ui, fontSize: '18px', color: HEX.goldBright, stroke: '#000', strokeThickness: 2 }).setOrigin(1, 0.5);
    });

    new ThemedButton(this, { x: px - 170, y: py + 180, text: 'Play Again',
      onClick: () => { Game.world = null; this.scene.start('Game'); } });
    new ThemedButton(this, { x: px + 170, y: py + 180, text: 'Main Menu',
      onClick: () => { Game.world = null; this.scene.start('MainMenu'); } });

    if (win) audio.win(); else audio.lose();
  }
}
