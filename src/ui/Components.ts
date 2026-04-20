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

// --------------------- Machine activation effects ----------------------
// Visual flourish played on the targeted region (or each region for globals)
// when a machine is activated. Each machine gets its own distinct animation.

interface MachineFxOpts { radius?: number; }

export function spawnMachineEffect(
  scene: Phaser.Scene,
  machineId: string,
  x: number, y: number,
  opts: MachineFxOpts = {},
): void {
  const r = opts.radius ?? 44;
  switch (machineId) {
    case 'rain':     return fxRain(scene, x, y, r);
    case 'storm':    return fxStorm(scene, x, y, r);
    case 'magma':    return fxMagma(scene, x, y, r);
    case 'ember':    return fxEmber(scene, x, y, r);
    case 'bloom':    return fxBloom(scene, x, y, r);
    case 'seeder':   return fxSeeder(scene, x, y, r);
    case 'wind':     return fxWind(scene, x, y, r);
    case 'purifier': return fxPurifier(scene, x, y, r);
    case 'peace':    return fxPeace(scene, x, y, r);
    case 'solar':    return fxSolar(scene, x, y, r);
    case 'root':     return fxRoot(scene, x, y, r);
    case 'tide':     return fxTide(scene, x, y, r);
    case 'relay':    return fxRelay(scene, x, y, r);
    case 'lullaby':  return fxLullaby(scene, x, y, r);
    default:         return fxPurifier(scene, x, y, r);
  }
}

function fxRain(scene: Phaser.Scene, x: number, y: number, r: number) {
  for (let i = 0; i < 22; i++) {
    const sx = x + (Math.random() - 0.5) * r * 2;
    const sy = y - r - 10 - Math.random() * 20;
    const drop = scene.add.rectangle(sx, sy, 2, 10, 0x9fd8ff, 0.9)
      .setDepth(55).setBlendMode(Phaser.BlendModes.ADD);
    scene.tweens.add({
      targets: drop,
      y: sy + r * 2 + 20, alpha: 0,
      duration: 600 + Math.random() * 250,
      delay: Math.random() * 400,
      ease: 'Cubic.easeIn',
      onComplete: () => drop.destroy(),
    });
  }
  // Splash ripples
  scene.time.delayedCall(500, () => {
    const ring = scene.add.graphics().setDepth(55);
    scene.tweens.addCounter({
      from: 0, to: r, duration: 600, ease: 'Cubic.easeOut',
      onUpdate: (tw) => {
        const rr = tw.getValue() as number;
        ring.clear().lineStyle(2, 0x9fd8ff, 1 - rr / r).strokeCircle(x, y + 10, rr);
      },
      onComplete: () => ring.destroy(),
    });
  });
}

function fxStorm(scene: Phaser.Scene, x: number, y: number, r: number) {
  // Lightning zigzags
  for (let k = 0; k < 3; k++) {
    scene.time.delayedCall(k * 180, () => {
      const g = scene.add.graphics().setDepth(56).setBlendMode(Phaser.BlendModes.ADD);
      const ox = x + (Math.random() - 0.5) * r;
      g.lineStyle(2, 0xd7c5ff, 1);
      g.beginPath();
      g.moveTo(ox, y - r);
      let cx = ox, cy = y - r;
      for (let i = 0; i < 5; i++) {
        cx += (Math.random() - 0.5) * 14;
        cy += r * 2 / 5;
        g.lineTo(cx, cy);
      }
      g.strokePath();
      scene.tweens.add({
        targets: g, alpha: 0, duration: 420, ease: 'Cubic.easeIn',
        onComplete: () => g.destroy(),
      });
    });
  }
  // Dark cloud flash
  const cloud = scene.add.image(x, y - r - 4, 'glow-cyan')
    .setScale(0.9).setTint(0x7d7aa8).setAlpha(0).setDepth(54).setBlendMode(Phaser.BlendModes.ADD);
  scene.tweens.add({ targets: cloud, alpha: 0.7, yoyo: true, duration: 300, repeat: 2,
    onComplete: () => cloud.destroy() });
}

function fxMagma(scene: Phaser.Scene, x: number, y: number, r: number) {
  // Rising magma blobs + shockwave
  for (let i = 0; i < 14; i++) {
    const ang = Math.random() * Math.PI * 2;
    const dx = Math.cos(ang) * (r * 0.4);
    const dy = Math.sin(ang) * (r * 0.3);
    const blob = scene.add.image(x + dx, y + dy, 'glow-red')
      .setScale(0.12 + Math.random() * 0.1).setTint(0xff7a2a).setDepth(55).setBlendMode(Phaser.BlendModes.ADD);
    scene.tweens.add({
      targets: blob,
      y: blob.y - 30 - Math.random() * 30, alpha: 0, scale: 0.04,
      duration: 700 + Math.random() * 300,
      delay: Math.random() * 200,
      ease: 'Cubic.easeOut',
      onComplete: () => blob.destroy(),
    });
  }
  const ring = scene.add.graphics().setDepth(55);
  scene.tweens.addCounter({
    from: 0, to: r * 1.2, duration: 600, ease: 'Cubic.easeOut',
    onUpdate: (tw) => {
      const rr = tw.getValue() as number;
      ring.clear().lineStyle(3, 0xff5a3a, 1 - rr / (r * 1.2)).strokeCircle(x, y, rr);
    },
    onComplete: () => ring.destroy(),
  });
}

function fxEmber(scene: Phaser.Scene, x: number, y: number, r: number) {
  for (let i = 0; i < 26; i++) {
    const ang = Math.random() * Math.PI * 2;
    const dist = Math.random() * r;
    const ex = x + Math.cos(ang) * dist;
    const ey = y + Math.sin(ang) * dist;
    const ember = scene.add.circle(ex, ey, 1.5 + Math.random() * 1.5, 0xffb067, 1)
      .setDepth(55).setBlendMode(Phaser.BlendModes.ADD);
    scene.tweens.add({
      targets: ember,
      y: ey - 40 - Math.random() * 40,
      x: ex + (Math.random() - 0.5) * 20,
      alpha: 0,
      duration: 900 + Math.random() * 400,
      delay: Math.random() * 300,
      ease: 'Sine.easeOut',
      onComplete: () => ember.destroy(),
    });
  }
}

function fxBloom(scene: Phaser.Scene, x: number, y: number, r: number) {
  const petals = ['#ffb8d0', '#ffd977', '#b6f3a5', '#d6b2ff'];
  for (let i = 0; i < 14; i++) {
    const ang = (i / 14) * Math.PI * 2 + Math.random() * 0.3;
    const dist = r * (0.3 + Math.random() * 0.55);
    const px = x + Math.cos(ang) * dist;
    const py = y + Math.sin(ang) * dist;
    const color = parseInt(petals[i % petals.length].slice(1), 16);
    const petal = scene.add.circle(x, y, 3, color, 1).setDepth(55);
    scene.tweens.add({
      targets: petal,
      x: px, y: py, radius: 5,
      duration: 450, ease: 'Back.easeOut',
      onComplete: () => {
        scene.tweens.add({
          targets: petal, alpha: 0, scale: 1.6,
          duration: 900, ease: 'Sine.easeOut',
          onComplete: () => petal.destroy(),
        });
      },
    });
  }
  // Central burst
  const burst = scene.add.image(x, y, 'glow-green').setScale(0.2).setAlpha(0.8).setDepth(54).setBlendMode(Phaser.BlendModes.ADD);
  scene.tweens.add({ targets: burst, scale: 0.6, alpha: 0, duration: 800, onComplete: () => burst.destroy() });
}

function fxSeeder(scene: Phaser.Scene, x: number, y: number, r: number) {
  // Seeds drift down and sprout
  for (let i = 0; i < 10; i++) {
    const sx = x + (Math.random() - 0.5) * r * 1.6;
    const startY = y - r - 20;
    const endY = y + r * 0.2 + Math.random() * 8;
    const seed = scene.add.circle(sx, startY, 2, 0xeadb9a, 1).setDepth(55);
    scene.tweens.add({
      targets: seed, y: endY,
      duration: 700 + Math.random() * 300,
      delay: Math.random() * 200,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        // sprout
        const sprout = scene.add.circle(sx, endY, 2, 0x8be28b, 1).setDepth(55);
        seed.destroy();
        scene.tweens.add({
          targets: sprout, radius: 6, alpha: 0,
          duration: 700, ease: 'Sine.easeOut',
          onComplete: () => sprout.destroy(),
        });
      },
    });
  }
}

function fxWind(scene: Phaser.Scene, x: number, y: number, r: number) {
  for (let i = 0; i < 5; i++) {
    scene.time.delayedCall(i * 100, () => {
      const sy = y - r + (i * r * 2) / 5;
      const arc = scene.add.graphics().setDepth(55).setBlendMode(Phaser.BlendModes.ADD);
      arc.lineStyle(2, 0xdff2ff, 0.9);
      arc.beginPath();
      arc.arc(x - r * 0.2, sy, r * 0.5, Math.PI * 0.2, Math.PI * 0.8, false);
      arc.strokePath();
      arc.x = -r;
      scene.tweens.add({
        targets: arc, x: r * 1.2, alpha: 0,
        duration: 700, ease: 'Cubic.easeOut',
        onComplete: () => arc.destroy(),
      });
    });
  }
}

function fxPurifier(scene: Phaser.Scene, x: number, y: number, r: number) {
  // Clean white sweep
  for (let i = 0; i < 3; i++) {
    const ring = scene.add.graphics().setDepth(55).setBlendMode(Phaser.BlendModes.ADD);
    scene.tweens.addCounter({
      from: 0, to: r, duration: 700,
      delay: i * 180,
      ease: 'Cubic.easeOut',
      onUpdate: (tw) => {
        const rr = tw.getValue() as number;
        ring.clear().lineStyle(2, 0xe8f6ff, 1 - rr / r).strokeCircle(x, y, rr);
      },
      onComplete: () => ring.destroy(),
    });
  }
  // Sparkles
  for (let i = 0; i < 12; i++) {
    const ang = Math.random() * Math.PI * 2;
    const dist = Math.random() * r;
    const sp = scene.add.circle(x + Math.cos(ang) * dist, y + Math.sin(ang) * dist, 1.6, 0xffffff, 1)
      .setDepth(56).setBlendMode(Phaser.BlendModes.ADD);
    scene.tweens.add({ targets: sp, alpha: 0, scale: 2.2,
      duration: 700 + Math.random() * 300, delay: Math.random() * 200,
      onComplete: () => sp.destroy() });
  }
}

function fxPeace(scene: Phaser.Scene, x: number, y: number, r: number) {
  // Expanding golden mandala
  const rings = 3;
  for (let i = 0; i < rings; i++) {
    const g = scene.add.graphics().setDepth(55).setBlendMode(Phaser.BlendModes.ADD);
    scene.tweens.addCounter({
      from: 0, to: r * 1.1, duration: 900, delay: i * 150, ease: 'Sine.easeOut',
      onUpdate: (tw) => {
        const rr = tw.getValue() as number;
        const a = 1 - rr / (r * 1.1);
        g.clear().lineStyle(2, 0xf7d97b, a);
        g.strokeCircle(x, y, rr);
        // inscribed rotating marks
        for (let k = 0; k < 6; k++) {
          const ang = (k / 6) * Math.PI * 2 + rr * 0.03;
          g.fillStyle(0xfff0b0, a);
          g.fillCircle(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr, 2);
        }
      },
      onComplete: () => g.destroy(),
    });
  }
}

function fxSolar(scene: Phaser.Scene, x: number, y: number, r: number) {
  // Central sun + radiating rays
  const sun = scene.add.image(x, y, 'glow-gold').setScale(0.15).setAlpha(0).setDepth(55).setBlendMode(Phaser.BlendModes.ADD);
  scene.tweens.add({ targets: sun, scale: 0.55, alpha: 0.9, yoyo: true, duration: 500,
    onComplete: () => sun.destroy() });
  for (let i = 0; i < 10; i++) {
    const ang = (i / 10) * Math.PI * 2;
    const g = scene.add.graphics().setDepth(55).setBlendMode(Phaser.BlendModes.ADD);
    g.lineStyle(2, 0xffe27a, 0.9);
    g.lineBetween(x + Math.cos(ang) * 8, y + Math.sin(ang) * 8,
                  x + Math.cos(ang) * r, y + Math.sin(ang) * r);
    scene.tweens.add({ targets: g, alpha: 0, duration: 750, ease: 'Cubic.easeOut',
      onComplete: () => g.destroy() });
  }
}

function fxRoot(scene: Phaser.Scene, x: number, y: number, r: number) {
  // Roots stretching outward from centre
  for (let i = 0; i < 7; i++) {
    const ang = (i / 7) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
    const g = scene.add.graphics().setDepth(55);
    g.lineStyle(2, 0x8a5a34, 1);
    scene.tweens.addCounter({
      from: 0, to: 1, duration: 700, ease: 'Cubic.easeOut',
      onUpdate: (tw) => {
        const t = tw.getValue() as number;
        g.clear().lineStyle(2, 0x8a5a34, 1);
        g.beginPath();
        g.moveTo(x, y);
        let cx = x, cy = y;
        const segs = 6;
        for (let s = 1; s <= segs * t; s++) {
          const dd = (s / segs) * r;
          cx = x + Math.cos(ang + Math.sin(s) * 0.2) * dd;
          cy = y + Math.sin(ang + Math.sin(s) * 0.2) * dd;
          g.lineTo(cx, cy);
        }
        g.strokePath();
      },
      onComplete: () => {
        scene.tweens.add({ targets: g, alpha: 0, duration: 500,
          onComplete: () => g.destroy() });
      },
    });
  }
}

function fxTide(scene: Phaser.Scene, x: number, y: number, r: number) {
  // Concentric wave rings from side to side
  for (let i = 0; i < 3; i++) {
    const g = scene.add.graphics().setDepth(55).setBlendMode(Phaser.BlendModes.ADD);
    scene.tweens.addCounter({
      from: r * 0.2, to: r * 1.15, duration: 900, delay: i * 220, ease: 'Sine.easeOut',
      onUpdate: (tw) => {
        const rr = tw.getValue() as number;
        const a = 1 - (rr - r * 0.2) / (r * 0.95);
        g.clear().lineStyle(2, 0x67d5ff, a);
        g.strokeEllipse(x, y, rr * 2, rr * 1.1);
      },
      onComplete: () => g.destroy(),
    });
  }
}

function fxRelay(scene: Phaser.Scene, x: number, y: number, r: number) {
  // Hex-grid pulses
  for (let i = 0; i < 3; i++) {
    const g = scene.add.graphics().setDepth(55).setBlendMode(Phaser.BlendModes.ADD);
    scene.tweens.addCounter({
      from: 0, to: r, duration: 700, delay: i * 160, ease: 'Cubic.easeOut',
      onUpdate: (tw) => {
        const rr = tw.getValue() as number;
        const a = 1 - rr / r;
        g.clear().lineStyle(2, 0xa8e6ff, a);
        const pts: { x: number; y: number }[] = [];
        for (let k = 0; k < 6; k++) {
          const ang = (k / 6) * Math.PI * 2 + Math.PI / 6;
          pts.push({ x: x + Math.cos(ang) * rr, y: y + Math.sin(ang) * rr });
        }
        g.beginPath();
        g.moveTo(pts[0].x, pts[0].y);
        for (let k = 1; k < 6; k++) g.lineTo(pts[k].x, pts[k].y);
        g.closePath();
        g.strokePath();
      },
      onComplete: () => g.destroy(),
    });
  }
  // data dot
  const dot = scene.add.circle(x, y, 3, 0xffffff, 1).setDepth(56).setBlendMode(Phaser.BlendModes.ADD);
  scene.tweens.add({ targets: dot, scale: 3, alpha: 0, duration: 700, onComplete: () => dot.destroy() });
}

function fxLullaby(scene: Phaser.Scene, x: number, y: number, r: number) {
  // Slow drifting musical notes / soft halos
  for (let i = 0; i < 7; i++) {
    const ang = Math.random() * Math.PI * 2;
    const sx = x + Math.cos(ang) * r * 0.3;
    const sy = y + Math.sin(ang) * r * 0.3;
    const halo = scene.add.image(sx, sy, 'glow-cyan')
      .setScale(0.08).setAlpha(0.7).setTint(0xc9b6ff)
      .setDepth(55).setBlendMode(Phaser.BlendModes.ADD);
    scene.tweens.add({
      targets: halo,
      y: sy - 40 - Math.random() * 20,
      x: sx + (Math.random() - 0.5) * 30,
      scale: 0.2, alpha: 0,
      duration: 1400 + Math.random() * 400,
      delay: i * 80,
      ease: 'Sine.easeOut',
      onComplete: () => halo.destroy(),
    });
  }
}

