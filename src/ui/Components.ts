// Themed UI components: Button, label panels, meters - reused across scenes.
import Phaser from 'phaser';
import { audio } from '../audio/AudioEngine';
import { COLORS, FONTS, HEX } from '../config';

export interface ButtonOpts {
  x: number; y: number;
  w?: number; h?: number;
  text: string;
  fontSize?: number;
  textureKey?: string; // base key like 'btn' (uses btn-idle, -hover, -down, -disabled)
  enabled?: boolean;
  onClick?: () => void;
}

export class ThemedButton extends Phaser.GameObjects.Container {
  bg: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
  enabled: boolean;
  baseKey: string;
  constructor(scene: Phaser.Scene, opts: ButtonOpts) {
    super(scene, opts.x, opts.y);
    this.baseKey = opts.textureKey ?? 'btn';
    this.enabled = opts.enabled ?? true;
    this.bg = scene.add.image(0, 0, `${this.baseKey}-idle`).setOrigin(0.5);
    this.add(this.bg);
    const fs = opts.fontSize ?? 22;
    this.label = scene.add.text(0, 0, opts.text, {
      fontFamily: FONTS.title,
      fontSize: `${fs}px`,
      color: HEX.goldBright,
      stroke: '#3a2818',
      strokeThickness: 2,
    }).setOrigin(0.5).setShadow(0, 2, '#000', 4, true, true);
    this.add(this.label);

    const w = this.bg.width, h = this.bg.height;
    this.setSize(w, h);
    // Use the bg image as the interactive target. Image hit-testing respects
    // origin (0.5) natively, so the entire visible button responds — including
    // the area under the label text (which is non-interactive Text).
    this.bg.setInteractive({ useHandCursor: true });

    this.bg.on('pointerover', () => {
      if (!this.enabled) return;
      this.bg.setTexture(`${this.baseKey}-hover`);
      this.label.setColor(HEX.textBright);
      audio.hover();
      scene.tweens.add({ targets: this, scale: 1.03, duration: 120, ease: 'Sine.easeOut' });
    });
    this.bg.on('pointerout', () => {
      if (!this.enabled) return;
      this.bg.setTexture(`${this.baseKey}-idle`);
      this.label.setColor(HEX.goldBright);
      scene.tweens.add({ targets: this, scale: 1, duration: 120, ease: 'Sine.easeOut' });
    });
    this.bg.on('pointerdown', () => {
      if (!this.enabled) return;
      this.bg.setTexture(`${this.baseKey}-down`);
      scene.tweens.add({ targets: this, scale: 0.97, duration: 80, ease: 'Sine.easeOut' });
    });
    this.bg.on('pointerup', () => {
      if (!this.enabled) return;
      this.bg.setTexture(`${this.baseKey}-hover`);
      scene.tweens.add({ targets: this, scale: 1.03, duration: 120, ease: 'Sine.easeOut' });
      audio.click();
      opts.onClick && opts.onClick();
    });
    this.setEnabled(this.enabled);
    scene.add.existing(this);
  }
  setEnabled(on: boolean) {
    this.enabled = on;
    this.bg.setTexture(on ? `${this.baseKey}-idle` : `${this.baseKey}-disabled`);
    this.label.setAlpha(on ? 1 : 0.5);
    if (!on) this.bg.disableInteractive();
    else this.bg.setInteractive({ useHandCursor: true });
  }
  setLabel(t: string) { this.label.setText(t); }
}

// Stat meter – horizontal bar with bronze frame
export class StatMeter extends Phaser.GameObjects.Container {
  fill: Phaser.GameObjects.Rectangle;
  frame: Phaser.GameObjects.Graphics;
  w: number; h: number;
  constructor(scene: Phaser.Scene, x: number, y: number, w: number, h: number) {
    super(scene, x, y);
    this.w = w; this.h = h;
    this.frame = scene.add.graphics();
    this.frame.fillStyle(0x0a0e18, 1).fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    this.frame.lineStyle(2, COLORS.bronze, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    this.add(this.frame);
    this.fill = scene.add.rectangle(-w / 2 + 3, 0, 0, h - 6, COLORS.green).setOrigin(0, 0.5);
    this.add(this.fill);
    scene.add.existing(this);
  }
  setValue(v: number, color: number) {
    const target = (this.w - 6) * Math.max(0, Math.min(1, v / 100));
    this.scene.tweens.add({ targets: this.fill, width: target, duration: 350, ease: 'Cubic.easeOut' });
    this.fill.fillColor = color;
  }
}

// Floating delta label
export function spawnFloater(scene: Phaser.Scene, x: number, y: number, text: string, color = HEX.goldBright) {
  const t = scene.add.text(x, y, text, {
    fontFamily: FONTS.title,
    fontSize: '22px',
    color,
    stroke: '#000',
    strokeThickness: 3,
  }).setOrigin(0.5).setShadow(0, 2, '#000', 4, true, true);
  scene.tweens.add({
    targets: t, y: y - 60, alpha: 0, duration: 1300, ease: 'Cubic.easeOut',
    onComplete: () => t.destroy(),
  });
}

// Scanning rune ring used in transitions
export function spawnRuneRing(scene: Phaser.Scene, x: number, y: number, color = COLORS.divine) {
  const g = scene.add.graphics();
  g.x = x; g.y = y;
  let r = 10; let alpha = 1;
  scene.tweens.addCounter({
    from: 10, to: 220, duration: 700, ease: 'Cubic.easeOut',
    onUpdate: (tw) => {
      r = tw.getValue() as number;
      alpha = 1 - (r - 10) / 210;
      g.clear();
      g.lineStyle(3, color, alpha);
      g.strokeCircle(0, 0, r);
      g.lineStyle(1, color, alpha * 0.6);
      g.strokeCircle(0, 0, r * 0.7);
    },
    onComplete: () => g.destroy(),
  });
}
