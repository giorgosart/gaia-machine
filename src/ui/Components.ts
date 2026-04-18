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

// --------------------- Ambient background effects ----------------------
// Shared celestial atmosphere: drifting energy bubbles, shimmering stars,
// and the occasional streaking comet. Used by MainMenu and Game scenes so
// the world feels alive in both.

/**
 * Drifting upward "energy bubbles" — soft additive glows that rise and fade.
 * Returns the group so callers can destroy or depth-sort if needed.
 */
export function spawnAmbientBubbles(
  scene: Phaser.Scene,
  w: number,
  h: number,
  count = 30,
): Phaser.GameObjects.Image[] {
  const bubbles: Phaser.GameObjects.Image[] = [];
  for (let i = 0; i < count; i++) {
    const p = scene.add.image(Math.random() * w, Math.random() * h, 'glow-cyan')
      .setScale(0.05 + Math.random() * 0.08)
      .setAlpha(0.05 + Math.random() * 0.15)
      .setBlendMode(Phaser.BlendModes.ADD);
    scene.tweens.add({
      targets: p,
      y: p.y - 200 - Math.random() * 200,
      x: p.x + (Math.random() - 0.5) * 100,
      alpha: 0,
      duration: 8000 + Math.random() * 6000,
      repeat: -1,
      repeatDelay: Math.random() * 3000,
      onRepeat: () => { p.x = Math.random() * w; p.y = h + 50; p.alpha = 0.15; },
    });
    bubbles.push(p);
  }
  return bubbles;
}

/**
 * Overlay a sparse layer of twinkling stars on top of the static starfield.
 * Stars gently pulse in brightness to give the background a living shimmer
 * without redrawing the main texture.
 */
export function spawnStarShimmer(
  scene: Phaser.Scene,
  w: number,
  h: number,
  count = 120,
): void {
  for (let i = 0; i < count; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const r = 1.4 + Math.random() * 2.2;
    const star = scene.add.circle(x, y, r, 0xffffff, 1)
      .setBlendMode(Phaser.BlendModes.ADD);
    scene.tweens.add({
      targets: star,
      alpha: 0.15 + Math.random() * 0.25,
      scale: 0.5 + Math.random() * 0.4,
      duration: 900 + Math.random() * 2200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: Math.random() * 2000,
    });
  }
}

/**
 * Schedule occasional comets that streak across the sky with a glowing tail.
 * Direction and altitude are randomised per comet. Runs for the scene's
 * lifetime and cleans up its timer automatically when the scene shuts down.
 */
export function spawnCometStreaks(
  scene: Phaser.Scene,
  w: number,
  h: number,
  opts: { minDelay?: number; maxDelay?: number } = {},
): void {
  const minDelay = opts.minDelay ?? 6000;
  const maxDelay = opts.maxDelay ?? 14000;
  const fire = () => {
    const leftToRight = Math.random() < 0.5;
    const startX = leftToRight ? -80 : w + 80;
    const endX   = leftToRight ? w + 80 : -80;
    const startY = 60 + Math.random() * (h * 0.55);
    const endY   = startY + (80 + Math.random() * 180) * (Math.random() < 0.5 ? 1 : -1);
    const angle  = Math.atan2(endY - startY, endX - startX);

    const container = scene.add.container(startX, startY);
    // Tail — elongated glow
    const tail = scene.add.image(-44, 0, 'glow-cyan')
      .setScale(1.1, 0.18)
      .setAlpha(0.55)
      .setTint(0xcfe8ff)
      .setBlendMode(Phaser.BlendModes.ADD);
    // Head — brighter tight glow
    const head = scene.add.image(0, 0, 'glow-cyan')
      .setScale(0.32)
      .setAlpha(0.9)
      .setTint(0xffffff)
      .setBlendMode(Phaser.BlendModes.ADD);
    container.add([tail, head]);
    container.rotation = angle;

    const dist = Math.hypot(endX - startX, endY - startY);
    const duration = 1400 + (dist / w) * 600;
    scene.tweens.add({
      targets: container,
      x: endX, y: endY,
      duration,
      ease: 'Sine.easeIn',
      onComplete: () => container.destroy(),
    });
    // Fade out near end
    scene.tweens.add({
      targets: container,
      alpha: 0,
      delay: duration * 0.75,
      duration: duration * 0.25,
    });
  };
  const schedule = () => {
    scene.time.delayedCall(minDelay + Math.random() * (maxDelay - minDelay), () => {
      fire();
      schedule();
    });
  };
  // Small initial delay so comets don't always fire the instant a scene opens.
  scene.time.delayedCall(2000 + Math.random() * 4000, () => { fire(); schedule(); });
}

