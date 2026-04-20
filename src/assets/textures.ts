// Procedural texture generation: builds all UI/world artwork in code so the game
// has zero external image dependencies and a perfectly cohesive style.
import Phaser from 'phaser';
import { CONDITIONS } from '../data/conditions';

type C = CanvasRenderingContext2D;

function makeCanvas(w: number, h: number): { c: HTMLCanvasElement; ctx: C } {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return { c, ctx: c.getContext('2d')! };
}

function addTexture(scene: Phaser.Scene, key: string, c: HTMLCanvasElement) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, c);
}

// ---------- Helpers ----------
function roundRect(ctx: C, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function rivetCircle(ctx: C, x: number, y: number, r: number) {
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
  g.addColorStop(0, '#f0d090');
  g.addColorStop(0.5, '#a07840');
  g.addColorStop(1, '#3a2818');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}

// ---------- Panel: stone-bronze frame used everywhere ----------
function drawPanel(ctx: C, x: number, y: number, w: number, h: number, opts: {
  rivets?: boolean; corner?: number; bronze?: boolean;
} = {}) {
  const r = opts.corner ?? 14;
  // outer bronze bevel
  const outer = ctx.createLinearGradient(0, y, 0, y + h);
  outer.addColorStop(0, '#5a4528');
  outer.addColorStop(0.5, '#8a6a3c');
  outer.addColorStop(1, '#3a2c18');
  ctx.fillStyle = outer;
  roundRect(ctx, x, y, w, h, r); ctx.fill();
  // inner stone
  const inner = ctx.createLinearGradient(0, y, 0, y + h);
  inner.addColorStop(0, '#1f2436');
  inner.addColorStop(0.5, '#161a26');
  inner.addColorStop(1, '#0d1018');
  ctx.fillStyle = inner;
  roundRect(ctx, x + 6, y + 6, w - 12, h - 12, Math.max(2, r - 5)); ctx.fill();
  // inner highlight line
  ctx.strokeStyle = 'rgba(232,184,120,0.35)';
  ctx.lineWidth = 1;
  roundRect(ctx, x + 7, y + 7, w - 14, h - 14, Math.max(2, r - 6)); ctx.stroke();
  // rivets
  if (opts.rivets !== false) {
    const m = 14;
    rivetCircle(ctx, x + m, y + m, 4);
    rivetCircle(ctx, x + w - m, y + m, 4);
    rivetCircle(ctx, x + m, y + h - m, 4);
    rivetCircle(ctx, x + w - m, y + h - m, 4);
  }
}

export function makePanelTexture(scene: Phaser.Scene, key: string, w: number, h: number) {
  const { c, ctx } = makeCanvas(w, h);
  drawPanel(ctx, 0, 0, w, h);
  addTexture(scene, key, c);
}

// ---------- Buttons ----------
export function makeButtonTextures(scene: Phaser.Scene, key: string, w: number, h: number) {
  for (const state of ['idle', 'hover', 'down', 'disabled'] as const) {
    const { c, ctx } = makeCanvas(w, h);
    // bronze plate
    const top = state === 'down' ? '#6a4f28' : state === 'hover' ? '#d8a868' : '#a8804a';
    const mid = state === 'down' ? '#4a3818' : state === 'hover' ? '#b88858' : '#8a6638';
    const bot = state === 'down' ? '#2a1d10' : '#3a2c18';
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, top); grad.addColorStop(0.5, mid); grad.addColorStop(1, bot);
    ctx.fillStyle = grad;
    roundRect(ctx, 0, 0, w, h, 10); ctx.fill();
    // inner stone
    const innerH = h - 14;
    const ig = ctx.createLinearGradient(0, 7, 0, 7 + innerH);
    if (state === 'disabled') {
      ig.addColorStop(0, '#1a1a22'); ig.addColorStop(1, '#0a0a10');
    } else {
      ig.addColorStop(0, '#252a3c'); ig.addColorStop(1, '#10131c');
    }
    ctx.fillStyle = ig;
    roundRect(ctx, 7, 7, w - 14, innerH, 6); ctx.fill();
    // glow line
    if (state === 'hover') {
      ctx.strokeStyle = 'rgba(143,214,255,0.55)'; ctx.lineWidth = 1.5;
      roundRect(ctx, 8, 8, w - 16, innerH - 2, 5); ctx.stroke();
    } else {
      ctx.strokeStyle = 'rgba(232,184,120,0.4)'; ctx.lineWidth = 1;
      roundRect(ctx, 8, 8, w - 16, innerH - 2, 5); ctx.stroke();
    }
    // rivets
    rivetCircle(ctx, 10, 10, 3); rivetCircle(ctx, w - 10, 10, 3);
    rivetCircle(ctx, 10, h - 10, 3); rivetCircle(ctx, w - 10, h - 10, 3);
    if (state === 'disabled') { ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(0, 0, w, h); }
    addTexture(scene, `${key}-${state}`, c);
  }
}

// ---------- Stat panel (top bar slot) ----------
export function makeStatPanel(scene: Phaser.Scene, key: string, w: number, h: number) {
  const { c, ctx } = makeCanvas(w, h);
  drawPanel(ctx, 0, 0, w, h, { corner: 10, rivets: true });
  addTexture(scene, key, c);
}

// ---------- Machine card ----------
export function makeMachineCard(scene: Phaser.Scene, key: string, w: number, h: number, accent: string, selected = false) {
  const { c, ctx } = makeCanvas(w, h);
  // outer frame
  const og = ctx.createLinearGradient(0, 0, 0, h);
  og.addColorStop(0, selected ? '#e8b878' : '#5a4528');
  og.addColorStop(0.5, selected ? '#a87838' : '#7a5530');
  og.addColorStop(1, '#3a2818');
  ctx.fillStyle = og;
  roundRect(ctx, 0, 0, w, h, 12); ctx.fill();
  // inner
  const ig = ctx.createLinearGradient(0, 0, 0, h);
  ig.addColorStop(0, '#1c2236'); ig.addColorStop(1, '#0a0e18');
  ctx.fillStyle = ig;
  roundRect(ctx, 5, 5, w - 10, h - 10, 8); ctx.fill();
  // accent glow
  const r = ctx.createRadialGradient(w / 2, h * 0.32, 4, w / 2, h * 0.32, w * 0.55);
  r.addColorStop(0, accent + 'cc');
  r.addColorStop(0.4, accent + '40');
  r.addColorStop(1, '#00000000');
  ctx.fillStyle = r;
  ctx.fillRect(0, 0, w, h);
  // selection ring
  if (selected) {
    ctx.strokeStyle = '#ffe89a'; ctx.lineWidth = 2;
    roundRect(ctx, 6, 6, w - 12, h - 12, 7); ctx.stroke();
  } else {
    ctx.strokeStyle = 'rgba(232,184,120,0.3)'; ctx.lineWidth = 1;
    roundRect(ctx, 6, 6, w - 12, h - 12, 7); ctx.stroke();
  }
  rivetCircle(ctx, 9, 9, 3); rivetCircle(ctx, w - 9, 9, 3);
  rivetCircle(ctx, 9, h - 9, 3); rivetCircle(ctx, w - 9, h - 9, 3);
  addTexture(scene, key, c);
}

// ---------- Icons (for stats and machines) ----------
type IconKind = 'climate' | 'nature' | 'humans' | 'tectonics' | 'pollution'
  | 'rain' | 'magma' | 'bloom' | 'wind' | 'purifier' | 'peace'
  | 'storm' | 'solar' | 'root' | 'tide' | 'ember' | 'relay' | 'seeder' | 'lullaby'
  | 'energy';

export function makeIcon(scene: Phaser.Scene, key: string, kind: IconKind, size = 64) {
  const { c, ctx } = makeCanvas(size, size);
  const cx = size / 2, cy = size / 2;
  // soft halo
  const halo = ctx.createRadialGradient(cx, cy, 2, cx, cy, size / 2);
  halo.addColorStop(0, 'rgba(143,214,255,0.35)');
  halo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = halo; ctx.fillRect(0, 0, size, size);

  ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.lineCap = 'round';

  const draw = {
    climate() {
      // sun + cloud
      ctx.strokeStyle = '#f0c860'; ctx.fillStyle = '#f0c860';
      ctx.beginPath(); ctx.arc(cx - 6, cy - 4, 9, 0, Math.PI * 2); ctx.fill();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx - 6 + Math.cos(a) * 11, cy - 4 + Math.sin(a) * 11);
        ctx.lineTo(cx - 6 + Math.cos(a) * 16, cy - 4 + Math.sin(a) * 16); ctx.stroke();
      }
      ctx.fillStyle = '#cfd8e8';
      ctx.beginPath();
      ctx.arc(cx + 4, cy + 8, 8, 0, Math.PI * 2);
      ctx.arc(cx + 14, cy + 8, 7, 0, Math.PI * 2);
      ctx.arc(cx + 9, cy + 4, 9, 0, Math.PI * 2);
      ctx.fill();
    },
    nature() {
      // tree
      ctx.fillStyle = '#7a5028';
      ctx.fillRect(cx - 3, cy + 4, 6, 16);
      ctx.fillStyle = '#3a7a4a';
      ctx.beginPath();
      ctx.arc(cx, cy - 4, 14, 0, Math.PI * 2);
      ctx.arc(cx - 8, cy + 2, 10, 0, Math.PI * 2);
      ctx.arc(cx + 8, cy + 2, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#5ac870'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(cx, cy - 4, 14, 0, Math.PI * 2); ctx.stroke();
    },
    humans() {
      // tower / pyramid
      ctx.fillStyle = '#c89557';
      ctx.beginPath();
      ctx.moveTo(cx, cy - 14);
      ctx.lineTo(cx + 18, cy + 14);
      ctx.lineTo(cx - 18, cy + 14);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#3a2818'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 10, cy + 6); ctx.lineTo(cx + 10, cy + 6);
      ctx.moveTo(cx - 5, cy - 4); ctx.lineTo(cx + 5, cy - 4);
      ctx.stroke();
      ctx.fillStyle = '#f0c860';
      ctx.beginPath(); ctx.arc(cx, cy - 16, 3, 0, Math.PI * 2); ctx.fill();
    },
    tectonics() {
      // mountain + crack
      ctx.fillStyle = '#7a7080';
      ctx.beginPath();
      ctx.moveTo(cx - 18, cy + 14);
      ctx.lineTo(cx - 4, cy - 12);
      ctx.lineTo(cx + 6, cy + 2);
      ctx.lineTo(cx + 14, cy - 6);
      ctx.lineTo(cx + 20, cy + 14);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#e84030'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 4, cy - 8); ctx.lineTo(cx - 2, cy + 2);
      ctx.lineTo(cx + 2, cy + 6); ctx.lineTo(cx, cy + 14);
      ctx.stroke();
    },
    pollution() {
      // skull-like haze
      ctx.fillStyle = '#7a4a30';
      ctx.beginPath();
      ctx.arc(cx - 6, cy + 4, 10, 0, Math.PI * 2);
      ctx.arc(cx + 6, cy + 4, 10, 0, Math.PI * 2);
      ctx.arc(cx, cy - 2, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1a1a22';
      ctx.beginPath(); ctx.arc(cx - 5, cy - 1, 2.5, 0, Math.PI * 2);
      ctx.arc(cx + 5, cy - 1, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#9a7a5a'; ctx.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(cx, cy - 16 + i * 4, 6 + i * 2, Math.PI, Math.PI * 2);
        ctx.stroke();
      }
    },
    rain() {
      ctx.fillStyle = '#cfd8e8';
      ctx.beginPath();
      ctx.arc(cx - 4, cy - 6, 8, 0, Math.PI * 2);
      ctx.arc(cx + 6, cy - 6, 7, 0, Math.PI * 2);
      ctx.arc(cx, cy - 10, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#5ac8e6'; ctx.lineWidth = 2.5;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(cx + i * 5, cy + 4);
        ctx.lineTo(cx + i * 5 - 2, cy + 14); ctx.stroke();
      }
    },
    magma() {
      // volcano
      ctx.fillStyle = '#3a2818';
      ctx.beginPath();
      ctx.moveTo(cx - 18, cy + 14);
      ctx.lineTo(cx - 6, cy - 8);
      ctx.lineTo(cx + 6, cy - 8);
      ctx.lineTo(cx + 18, cy + 14);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e8853a';
      ctx.beginPath(); ctx.arc(cx, cy - 12, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f0c860';
      ctx.beginPath(); ctx.arc(cx, cy - 14, 3, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#e84030'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx - 4, cy - 8); ctx.lineTo(cx - 8, cy + 8); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + 4, cy - 8); ctx.lineTo(cx + 8, cy + 8); ctx.stroke();
    },
    bloom() {
      // flower
      ctx.fillStyle = '#d870a0';
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * 8, cy + Math.sin(a) * 8, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#f0c860';
      ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#3a7a4a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx, cy + 8); ctx.lineTo(cx, cy + 20); ctx.stroke();
    },
    wind() {
      ctx.strokeStyle = '#cfd8e8'; ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx - 16, cy - 8);
      ctx.bezierCurveTo(cx, cy - 14, cx + 6, cy - 4, cx + 14, cy - 6);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - 16, cy);
      ctx.bezierCurveTo(cx + 4, cy - 6, cx + 12, cy + 6, cx + 18, cy + 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - 16, cy + 8);
      ctx.bezierCurveTo(cx, cy + 4, cx + 6, cy + 12, cx + 14, cy + 10);
      ctx.stroke();
    },
    purifier() {
      // hex shield
      ctx.fillStyle = '#5ac8e6';
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
        const x = cx + Math.cos(a) * 16; const y = cy + Math.sin(a) * 16;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.globalAlpha = 0.45; ctx.fill(); ctx.globalAlpha = 1;
      ctx.strokeStyle = '#8fd6ff'; ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#fff4cc';
      ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fill();
    },
    peace() {
      // resonator: concentric circles + dot
      ctx.strokeStyle = '#8fd6ff'; ctx.lineWidth = 2;
      for (let i = 1; i <= 3; i++) {
        ctx.globalAlpha = 1 - i * 0.25;
        ctx.beginPath(); ctx.arc(cx, cy, 4 + i * 5, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#ffe89a';
      ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fill();
    },
    // ---------- NEW STAGE MACHINE ICONS ----------
    storm() {
      // lightning bolt inside cloud
      ctx.fillStyle = '#8aaacc';
      ctx.beginPath();
      ctx.arc(cx - 6, cy - 4, 9, 0, Math.PI * 2);
      ctx.arc(cx + 8, cy - 4, 8, 0, Math.PI * 2);
      ctx.arc(cx, cy - 9, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff4cc';
      ctx.beginPath();
      ctx.moveTo(cx - 2, cy - 2); ctx.lineTo(cx + 4, cy - 2);
      ctx.lineTo(cx - 2, cy + 6); ctx.lineTo(cx + 6, cy + 6);
      ctx.lineTo(cx - 4, cy + 18); ctx.lineTo(cx + 1, cy + 8);
      ctx.lineTo(cx - 4, cy + 8); ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#6aa8ff'; ctx.lineWidth = 1.5; ctx.stroke();
    },
    solar() {
      // magnifying lens beam
      ctx.strokeStyle = '#f0c860'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(cx - 4, cy - 4, 10, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = 'rgba(255,232,154,0.45)';
      ctx.beginPath(); ctx.arc(cx - 4, cy - 4, 9, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#e8853a'; ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(cx + 4, cy + 4); ctx.lineTo(cx + 18, cy + 18); ctx.stroke();
      // rays
      for (let i = 0; i < 6; i++) {
        const a = (-Math.PI / 2) + (i / 6) * Math.PI * 1.1;
        ctx.beginPath();
        ctx.moveTo(cx - 4 + Math.cos(a) * 12, cy - 4 + Math.sin(a) * 12);
        ctx.lineTo(cx - 4 + Math.cos(a) * 18, cy - 4 + Math.sin(a) * 18);
        ctx.stroke();
      }
    },
    root() {
      // branching root tree
      ctx.strokeStyle = '#3a7a4a'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
      const drawBranch = (x: number, y: number, a: number, len: number, depth: number) => {
        if (depth === 0 || len < 3) return;
        const ex = x + Math.cos(a) * len;
        const ey = y + Math.sin(a) * len;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke();
        drawBranch(ex, ey, a - 0.5, len * 0.7, depth - 1);
        drawBranch(ex, ey, a + 0.5, len * 0.7, depth - 1);
      };
      drawBranch(cx, cy - 18, Math.PI / 2, 12, 3);
      ctx.strokeStyle = '#6abf6a'; ctx.lineWidth = 1.5;
      drawBranch(cx - 6, cy - 12, Math.PI / 2 + 0.3, 6, 2);
      drawBranch(cx + 6, cy - 12, Math.PI / 2 - 0.3, 6, 2);
    },
    tide() {
      // wave layered
      ctx.strokeStyle = '#2a78a8'; ctx.lineWidth = 2.5;
      for (let i = 0; i < 3; i++) {
        const yy = cy - 6 + i * 8;
        ctx.beginPath();
        ctx.moveTo(cx - 18, yy);
        ctx.bezierCurveTo(cx - 9, yy - 6, cx + 2, yy + 6, cx + 9, yy);
        ctx.bezierCurveTo(cx + 14, yy - 3, cx + 18, yy + 2, cx + 18, yy);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(90,200,230,0.3)';
      ctx.fillRect(cx - 18, cy + 8, 36, 8);
    },
    ember() {
      // industrial chimney with ember
      ctx.fillStyle = '#5a4528';
      ctx.fillRect(cx - 5, cy - 4, 10, 18);
      ctx.fillStyle = '#7a5030';
      ctx.fillRect(cx - 8, cy - 8, 16, 6);
      // embers
      ctx.fillStyle = '#e8853a';
      ctx.beginPath(); ctx.arc(cx - 2, cy - 14, 3, 0, Math.PI * 2);
      ctx.arc(cx + 4, cy - 18, 2.5, 0, Math.PI * 2);
      ctx.arc(cx, cy - 12, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f0c860';
      ctx.beginPath(); ctx.arc(cx - 2, cy - 14, 1.4, 0, Math.PI * 2); ctx.fill();
      // smoke
      ctx.fillStyle = 'rgba(120,100,80,0.5)';
      ctx.beginPath(); ctx.arc(cx + 6, cy - 12, 5, 0, Math.PI * 2); ctx.fill();
    },
    relay() {
      // migratory bird trio
      ctx.strokeStyle = '#b07a3a'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      const bird = (x: number, y: number, s: number) => {
        ctx.beginPath();
        ctx.moveTo(x - 7 * s, y);
        ctx.quadraticCurveTo(x - 3 * s, y - 5 * s, x, y);
        ctx.quadraticCurveTo(x + 3 * s, y - 5 * s, x + 7 * s, y);
        ctx.stroke();
      };
      bird(cx, cy - 4, 1.0);
      bird(cx - 10, cy + 6, 0.7);
      bird(cx + 10, cy + 6, 0.7);
    },
    seeder() {
      // cluster of snowflake/dot seeds in a cloud
      ctx.fillStyle = '#8aa0b8';
      ctx.beginPath();
      ctx.arc(cx - 6, cy - 6, 8, 0, Math.PI * 2);
      ctx.arc(cx + 8, cy - 6, 7, 0, Math.PI * 2);
      ctx.arc(cx, cy - 10, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff4cc';
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath(); ctx.arc(cx + i * 5, cy + 6 + (i & 1 ? 2 : 0), 1.8, 0, Math.PI * 2); ctx.fill();
      }
      ctx.strokeStyle = '#8fd6ff'; ctx.lineWidth = 1.2;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(cx + i * 5 - 2, cy + 10); ctx.lineTo(cx + i * 5, cy + 16); ctx.stroke();
      }
    },
    lullaby() {
      // concentric hum rings over a tiny planet
      ctx.fillStyle = '#8060c0';
      ctx.beginPath(); ctx.arc(cx, cy + 4, 6, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#c0a0ff'; ctx.lineWidth = 2;
      for (let i = 1; i <= 3; i++) {
        ctx.globalAlpha = 1 - i * 0.22;
        ctx.beginPath(); ctx.arc(cx, cy + 4, 6 + i * 5, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#ffe89a';
      ctx.beginPath(); ctx.arc(cx - 3, cy + 2, 1.5, 0, Math.PI * 2); ctx.fill();
    },
    energy() {
      // divine energy: diamond crystal
      ctx.fillStyle = '#8fd6ff';
      ctx.beginPath();
      ctx.moveTo(cx, cy - 14);
      ctx.lineTo(cx + 10, cy);
      ctx.lineTo(cx, cy + 16);
      ctx.lineTo(cx - 10, cy);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#fff4cc'; ctx.lineWidth = 2;
      ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(cx, cy - 14); ctx.lineTo(cx, cy + 16); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - 10, cy); ctx.lineTo(cx + 10, cy); ctx.stroke();
    },
  };
  draw[kind]();
  addTexture(scene, key, c);
}

// ---------- Condition badge: tiny tinted glyph disc ----------
export function makeConditionBadge(scene: Phaser.Scene, key: string, glyph: string, color: number, size = 28) {
  const { c, ctx } = makeCanvas(size, size);
  const cx = size / 2, cy = size / 2, r = size / 2 - 1;
  const r1 = (color >> 16) & 0xff, g1 = (color >> 8) & 0xff, b1 = color & 0xff;
  const rim = `rgb(${Math.min(255, r1 + 40)},${Math.min(255, g1 + 40)},${Math.min(255, b1 + 40)})`;
  const body = `rgba(${r1},${g1},${b1},0.92)`;
  ctx.fillStyle = 'rgba(0,0,0,0.85)';
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = body;
  ctx.beginPath(); ctx.arc(cx, cy, r - 2, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = rim; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(cx, cy, r - 1, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#fff4cc';
  ctx.font = `bold ${Math.floor(size * 0.62)}px serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(glyph, cx, cy + 1);
  addTexture(scene, key, c);
}

// ---------- World platform background ----------
// The planet's atmospheric shell: ocean disc surrounded by soft stratospheric
// bands (troposphere → stratosphere → ozone glow) instead of a metallic frame.
//
// Coordinate note: `size` is the intended on-screen diameter. The canvas is
// rendered slightly larger so the outer ozone halo isn't clipped at the edges
// of the texture. Downstream code keeps using `size` as the placement radius
// reference because all features are drawn relative to it.
export function makeWorldPlatform(scene: Phaser.Scene, key: string, size: number) {
  const pad = Math.ceil(size * 0.08); // room for the outer halo
  const dim = size + pad * 2;
  const { c, ctx } = makeCanvas(dim, dim);
  const cx = dim / 2, cy = dim / 2;
  const oceanR = size * 0.42;

  // 1) Outer ozone halo — soft teal/gold bloom that fades into space.
  const halo = ctx.createRadialGradient(cx, cy, oceanR * 0.98, cx, cy, size * 0.54);
  halo.addColorStop(0.00, 'rgba(120,220,220,0.00)');
  halo.addColorStop(0.25, 'rgba(140,220,210,0.18)');
  halo.addColorStop(0.55, 'rgba(180,220,180,0.12)');
  halo.addColorStop(0.85, 'rgba(110,150,180,0.05)');
  halo.addColorStop(1.00, 'rgba(20,40,80,0.0)');
  ctx.fillStyle = halo;
  ctx.beginPath(); ctx.arc(cx, cy, size * 0.54, 0, Math.PI * 2); ctx.fill();

  // 2) Stratosphere — a thin, cool cyan band that rings the planet.
  const strato = ctx.createRadialGradient(cx, cy, oceanR * 0.995, cx, cy, size * 0.48);
  strato.addColorStop(0.00, 'rgba(180,230,255,0.55)');
  strato.addColorStop(0.40, 'rgba(120,180,230,0.35)');
  strato.addColorStop(1.00, 'rgba(60,100,160,0.00)');
  ctx.fillStyle = strato;
  ctx.beginPath(); ctx.arc(cx, cy, size * 0.48, 0, Math.PI * 2); ctx.fill();

  // 3) Troposphere rim — bright inner crescent of atmosphere where light
  //    catches the edge of the planet (slight top-left bias for faux lighting).
  const tropo = ctx.createRadialGradient(
    cx - size * 0.06, cy - size * 0.06, oceanR * 0.92,
    cx, cy, oceanR * 1.04,
  );
  tropo.addColorStop(0.00, 'rgba(255,255,255,0.0)');
  tropo.addColorStop(0.85, 'rgba(200,240,255,0.35)');
  tropo.addColorStop(1.00, 'rgba(160,220,255,0.0)');
  ctx.fillStyle = tropo;
  ctx.beginPath(); ctx.arc(cx, cy, oceanR * 1.04, 0, Math.PI * 2); ctx.fill();

  // 4) Thin ozone arc — subtle violet-gold line just above the surface.
  ctx.strokeStyle = 'rgba(220,200,140,0.18)';
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(cx, cy, oceanR * 1.015, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(170,210,230,0.22)';
  ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.arc(cx, cy, oceanR * 1.035, 0, Math.PI * 2); ctx.stroke();

  // 5) Inner ocean — same deep-water disc as before.
  const ocean = ctx.createRadialGradient(
    cx - size * 0.1, cy - size * 0.1, size * 0.05,
    cx, cy, oceanR,
  );
  ocean.addColorStop(0, '#3a8ab8');
  ocean.addColorStop(0.5, '#1f5278');
  ocean.addColorStop(1, '#0a2238');
  ctx.fillStyle = ocean;
  ctx.beginPath(); ctx.arc(cx, cy, oceanR, 0, Math.PI * 2); ctx.fill();

  addTexture(scene, key, c);
}

// ---------- Stylized continental world map ----------
// Draws interlocking continent shapes inside the ocean disc so regions read as
// real landmasses on a shared planet rather than isolated blobs.
// Public for PreloadScene; uses an inline layout that mirrors data.ts REGIONS.

// Shared continent layout + polygon generator. Exported so GameScene can build
// a matching hit polygon for each region.
export type ContinentLayout = { id: string; terrain: Terrain; nx: number; ny: number; baseR: number };
export const CONTINENT_LAYOUT: ContinentLayout[] = [
  // Broad polar cap — elongated east-west, sits high on the globe.
  { id: 'north_wilds', terrain: 'tundra',   nx:  0.02, ny: -0.99, baseR: 0.12 },
  // Tilted highland belt tapering north-east.
  { id: 'iron_peaks',  terrain: 'mountain', nx:  0.80, ny: -0.54, baseR: 0.11 },
  // Broad arid continental arc along the eastern flank.
  { id: 'sunlands',    terrain: 'desert',   nx:  -0.62, ny:  -0.58, baseR: 0.12 },
  // Lush forested interior, broad and slightly tilted.
  { id: 'verdant',     terrain: 'forest',   nx:  -0.80, ny:  0.30, baseR: 0.11 },
  // Wide fertile basin across the southern latitudes.
  { id: 'lowlands',    terrain: 'plains',   nx: -0.15, ny:  0.92, baseR: 0.12 },
  // Coastal archipelago / small jungle landmass to the south-west.
  { id: 'green_isle',  terrain: 'jungle',   nx: 0.28, ny:  0.48, baseR: 0.08 },
  // Fractured volcanic territory on the western shelf.
  { id: 'ashen',       terrain: 'volcanic', nx: 0.98, ny: 0.28, baseR: 0.10 },
  // Abyssal marine zone at the globe's heart, surrounded by landmasses.
  { id: 'deep_sea',    terrain: 'water',    nx:  0.00, ny:  0.00, baseR: 0.11 },
];

// Per-region silhouette character. Drives aspect, rotation, coastline
// jaggedness, and directional bay so each continent feels geographically
// distinct rather than a rounded token.
type ShapeDef = {
  aspectX: number;   // horizontal stretch
  aspectY: number;   // vertical stretch
  rot: number;       // rotation (radians)
  jag: number;       // coastline roughness, 0..1
  bayDir: number;    // angle (radians) of a pronounced inlet/bay
  bayDepth: number;  // how deep that inlet carves, 0..0.4
};

const SHAPE_DEFS: Record<string, ShapeDef> = {
  // Broad polar landmass, gently rugged, with a southward sea-facing coast.
  north_wilds: { aspectX: 1.55, aspectY: 0.70, rot:  0.05, jag: 0.55, bayDir:  Math.PI * 0.5,  bayDepth: 0.18 },
  // Tilted highland spine — elongated, angular coastlines.
  iron_peaks:  { aspectX: 1.20, aspectY: 0.90, rot: -0.50, jag: 0.70, bayDir:  Math.PI * 1.7,  bayDepth: 0.22 },
  // Long arid continental belt with a smoother inland arc.
  sunlands:    { aspectX: 1.40, aspectY: 1.00, rot:  0.20, jag: 0.40, bayDir:  Math.PI * 1.0,  bayDepth: 0.20 },
  // Broad forested interior tapering south.
  verdant:     { aspectX: 1.30, aspectY: 1.00, rot: -0.15, jag: 0.55, bayDir:  Math.PI * 0.25, bayDepth: 0.16 },
  // Wide basin — elongated east-west, river-carved coasts.
  lowlands:    { aspectX: 1.60, aspectY: 0.75, rot:  0.08, jag: 0.45, bayDir: -Math.PI * 0.5,  bayDepth: 0.18 },
  // Small irregular island group — very jagged silhouette.
  green_isle:  { aspectX: 1.10, aspectY: 0.95, rot:  0.35, jag: 0.90, bayDir:  Math.PI * 1.2,  bayDepth: 0.26 },
  // Fractured volcanic coastline, tall and broken.
  ashen:       { aspectX: 0.95, aspectY: 1.30, rot:  0.35, jag: 0.95, bayDir:  Math.PI * 0.0,  bayDepth: 0.24 },
  // Marine zone — soft irregular basin shape (used only for hit area).
  deep_sea:    { aspectX: 1.20, aspectY: 0.95, rot:  0.10, jag: 0.35, bayDir:  Math.PI * 1.5,  bayDepth: 0.14 },
};

// Stable hash-based pseudo-random so the map shape is identical across runs.
function continentRand(seed: string, i: number): number {
  let h = 2166136261;
  const s = `${seed}|${i}`;
  for (let k = 0; k < s.length; k++) { h ^= s.charCodeAt(k); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 10000) / 10000;
}

// Point count for each continent outline. Higher = smoother macro curve
// with more coastal micro-detail.
const CONTINENT_POINTS = 48;

/**
 * Returns the continent polygon in container-local space (relative to the
 * region's container position). `displaySize` is the rendered diameter of the
 * world-continents texture (e.g. 720 * 0.85 platformScale). `inflate` pads the
 * hit area slightly beyond the visible coastline.
 *
 * Shape is built from:
 *   - an elliptical base (aspectX, aspectY, rotation)
 *   - three sine/cosine harmonics for multi-scale coastline variation
 *   - a directional Gaussian inlet for a pronounced bay / strait
 * so every region gets an asymmetrical, continent-like silhouette rather
 * than a rounded blob.
 */
export function getRegionLocalPolygon(id: string, displaySize: number, inflate = 1): { x: number; y: number }[] {
  const L = CONTINENT_LAYOUT.find(l => l.id === id);
  if (!L) return [];
  const S = SHAPE_DEFS[id] ?? { aspectX: 1, aspectY: 1, rot: 0, jag: 0.5, bayDir: 0, bayDepth: 0 };
  const R = displaySize * L.baseR * inflate;
  const N = CONTINENT_POINTS;
  const s0 = continentRand(L.id, 1) * Math.PI * 2;
  const s1 = continentRand(L.id, 2) * Math.PI * 2;
  const s2 = continentRand(L.id, 3) * Math.PI * 2;
  const s3 = continentRand(L.id, 4) * Math.PI * 2;
  const jag = S.jag;
  const amp1 = 0.14 + 0.10 * jag;            // macro bays/capes
  const amp2 = 0.06 + 0.10 * jag;            // mid-scale inlets
  const amp3 = 0.02 + 0.08 * jag;            // small coastal detail
  const cs = Math.cos(S.rot), sn = Math.sin(S.rot);
  // Planet-disc clamp: continent centre offset (globe-centre-relative) and
  // maximum allowed distance from the globe centre. Coastline points that
  // stray outside the ocean disc are projected back to the planet's rim, so
  // the hit polygon matches the visibly-clipped landmass.
  const planetEdge = displaySize * 0.42;
  const offX = L.nx * displaySize * 0.345;
  const offY = L.ny * displaySize * 0.345;
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    // Multi-octave coastline noise — gives natural, non-repeating variation.
    let rr = 1.0
      + amp1 * Math.sin(a * 1 + s0)
      + amp1 * 0.55 * Math.cos(a * 2 + s1)
      + amp2 * Math.sin(a * 3 + s2)
      + amp2 * 0.5  * Math.cos(a * 5 + s3)
      + amp3 * Math.sin(a * 8 + s0 * 0.5);
    // Directional inlet — a single smooth bay that carves one coast.
    const d = Math.cos(a - S.bayDir);
    if (d > 0) rr -= S.bayDepth * Math.pow(d, 3);
    // Clamp so the polygon never crosses itself.
    rr = Math.max(0.55, rr);
    // Elliptical base, then rotate.
    const px = Math.cos(a) * rr * S.aspectX;
    const py = Math.sin(a) * rr * S.aspectY;
    const rx = px * cs - py * sn;
    const ry = px * sn + py * cs;
    let lx = rx * R;
    let ly = ry * R;
    // Clamp to the planet's ocean disc so coastlines never extend past the rim.
    const gx = offX + lx, gy = offY + ly;
    const dist = Math.hypot(gx, gy);
    if (dist > planetEdge) {
      const sc = planetEdge / dist;
      lx = gx * sc - offX;
      ly = gy * sc - offY;
    }
    pts.push({ x: lx, y: ly });
  }
  return pts;
}

export function makeWorldContinents(scene: Phaser.Scene, key: string, size: number) {
  const { c, ctx } = makeCanvas(size, size);
  const cx = size / 2, cy = size / 2;
  const oceanR = size * 0.42;
  // placement radius in texture space; mirrors worldRadius(210) / platformScale(0.85)
  const placeR = size * 0.345;

  type Layout = ContinentLayout;
  const layout = CONTINENT_LAYOUT;

  const biome: Record<Exclude<Terrain, 'water'>, { light: string; mid: string; dark: string }> = {
    tundra:   { light: '#eef3f8', mid: '#a6b4c4', dark: '#6a7a90' },
    mountain: { light: '#a9a0ae', mid: '#6a6476', dark: '#3a3442' },
    desert:   { light: '#f0cf86', mid: '#c89858', dark: '#7a5228' },
    forest:   { light: '#5ab070', mid: '#2e7038', dark: '#123a1e' },
    plains:   { light: '#c4d066', mid: '#8aa038', dark: '#586820' },
    jungle:   { light: '#44b870', mid: '#1e7838', dark: '#0c3a1c' },
    volcanic: { light: '#c26848', mid: '#7c2e1e', dark: '#301010' },
  };

  const rand = continentRand;

  // Build continent Path2D from the shared polygon generator so texture
  // rendering and hit-zone detection stay in perfect sync.
  const continentPath = (L: Layout, inflate = 1): Path2D => {
    const x = cx + L.nx * placeR;
    const y = cy + L.ny * placeR;
    // In texture space, displaySize === size (no platform scale applied).
    const local = getRegionLocalPolygon(L.id, size, inflate);
    const path = new Path2D();
    const N = local.length;
    // Smooth closed curve through the computed polygon points (quadratic
    // mid-point interpolation keeps coastlines naturally curved).
    const first = local[0], last = local[N - 1];
    path.moveTo(x + (last.x + first.x) / 2, y + (last.y + first.y) / 2);
    for (let i = 0; i < N; i++) {
      const p1 = local[i], p2 = local[(i + 1) % N];
      const mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
      path.quadraticCurveTo(x + p1.x, y + p1.y, x + mx, y + my);
    }
    path.closePath();
    return path;
  };

  // Clip everything to the ocean disc.
  ctx.save();
  const oceanClip = new Path2D();
  oceanClip.arc(cx, cy, oceanR, 0, Math.PI * 2);
  ctx.clip(oceanClip);

  // 1) The Deep — darker abyssal zone that reads as open ocean, not land.
  const deep = layout.find(l => l.terrain === 'water')!;
  {
    const x = cx + deep.nx * placeR, y = cy + deep.ny * placeR;
    const r = size * deep.baseR * 1.3;
    const g = ctx.createRadialGradient(x, y, r * 0.1, x, y, r);
    g.addColorStop(0, 'rgba(4,14,32,0.85)');
    g.addColorStop(0.6, 'rgba(8,22,42,0.45)');
    g.addColorStop(1, 'rgba(8,22,42,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    // Trench arcs
    ctx.strokeStyle = 'rgba(200,220,255,0.18)';
    for (let i = 0; i < 4; i++) {
      const a0 = rand(deep.id, i + 10) * Math.PI * 2;
      ctx.lineWidth = 1 + rand(deep.id, i + 20) * 1.2;
      ctx.beginPath();
      ctx.arc(x, y, r * (0.28 + i * 0.16), a0, a0 + 0.8 + rand(deep.id, i + 30) * 0.6);
      ctx.stroke();
    }
  }

  // Light map-ocean grain under landmasses
  ctx.save();
  ctx.globalAlpha = 0.08;
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2;
    const r = oceanR * (0.2 + (i % 5) * 0.18);
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
    ctx.fillStyle = '#8fd6ff';
    ctx.beginPath(); ctx.arc(x, y, 1.2, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();

  // 2) Continent fills (land only). Slightly inflated base path for soft halo.
  const lands = layout.filter(l => l.terrain !== 'water');
  lands.forEach(L => {
    const haloPath = continentPath(L, 1.06);
    // soft coastal halo (lighter ocean ring around landmass)
    ctx.save();
    ctx.fillStyle = 'rgba(120,180,220,0.18)';
    ctx.filter = 'blur(6px)';
    ctx.fill(haloPath);
    ctx.restore();
  });

  lands.forEach(L => {
    const path = continentPath(L, 1.0);
    const x = cx + L.nx * placeR;
    const y = cy + L.ny * placeR;
    const R = size * L.baseR;
    const bm = biome[L.terrain as Exclude<Terrain, 'water'>];
    // Drop shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 3;
    // Biome gradient fill
    const g = ctx.createRadialGradient(x - R * 0.3, y - R * 0.35, R * 0.05, x, y, R * 1.25);
    g.addColorStop(0, bm.light);
    g.addColorStop(0.55, bm.mid);
    g.addColorStop(1, bm.dark);
    ctx.fillStyle = g;
    ctx.fill(path);
    ctx.restore();

    // Biome detail clipped to landmass
    ctx.save();
    ctx.clip(path);
    drawBiomeDetail(ctx, L, x, y, R, bm, rand);
    ctx.restore();

    // Coastline — subtle dark outline + faint inner highlight
    ctx.save();
    ctx.strokeStyle = 'rgba(10,18,30,0.55)';
    ctx.lineWidth = 1.5;
    ctx.stroke(path);
    ctx.strokeStyle = 'rgba(232,184,120,0.18)';
    ctx.lineWidth = 0.8;
    ctx.stroke(path);
    ctx.restore();
  });

  // 2b) Scattered sub-islands near the jungle archipelago so Emerald Isles
  // reads as a coastal island group rather than a single patch.
  {
    const isle = lands.find(l => l.id === 'green_isle');
    if (isle) {
      const ix = cx + isle.nx * placeR;
      const iy = cy + isle.ny * placeR;
      const bm = biome.jungle;
      for (let i = 0; i < 6; i++) {
        const a = rand(isle.id, i + 50) * Math.PI * 2;
        const d = size * (0.06 + rand(isle.id, i + 60) * 0.05);
        const sx = ix + Math.cos(a) * d;
        const sy = iy + Math.sin(a) * d;
        const sr = size * (0.012 + rand(isle.id, i + 70) * 0.018);
        // island halo
        ctx.save();
        ctx.fillStyle = 'rgba(120,180,220,0.22)';
        ctx.filter = 'blur(4px)';
        ctx.beginPath(); ctx.ellipse(sx, sy, sr * 1.6, sr * 1.2, rand(isle.id, i + 80) * Math.PI, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        // island body
        const g2 = ctx.createRadialGradient(sx - sr * 0.3, sy - sr * 0.3, 0, sx, sy, sr);
        g2.addColorStop(0, bm.light);
        g2.addColorStop(1, bm.dark);
        ctx.fillStyle = g2;
        ctx.beginPath(); ctx.ellipse(sx, sy, sr, sr * 0.75, rand(isle.id, i + 90) * Math.PI, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(10,18,30,0.45)';
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
    }
  }

  // 3) Faint cartographer grid for old-map feel
  ctx.save();
  ctx.strokeStyle = 'rgba(232,184,120,0.10)';
  ctx.lineWidth = 0.8;
  for (let i = 1; i < 5; i++) {
    ctx.beginPath();
    ctx.arc(cx, cy, oceanR * (i / 5), 0, Math.PI * 2);
    ctx.stroke();
  }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * oceanR * 0.15, cy + Math.sin(a) * oceanR * 0.15);
    ctx.lineTo(cx + Math.cos(a) * oceanR, cy + Math.sin(a) * oceanR);
    ctx.stroke();
  }
  ctx.restore();

  ctx.restore();
  addTexture(scene, key, c);
}

// Biome-specific decoration drawn clipped inside a continent shape.
function drawBiomeDetail(
  ctx: C,
  L: { id: string; terrain: Terrain },
  x: number, y: number, R: number,
  bm: { light: string; mid: string; dark: string },
  rand: (s: string, i: number) => number,
) {
  const t = L.terrain;
  if (t === 'forest' || t === 'jungle') {
    for (let i = 0; i < 40; i++) {
      const px = x + (rand(L.id, i) - 0.5) * R * 1.8;
      const py = y + (rand(L.id, i + 200) - 0.5) * R * 1.6;
      ctx.fillStyle = i % 2 ? bm.dark : '#7ac080';
      ctx.beginPath(); ctx.arc(px, py, 2.2 + rand(L.id, i + 400) * 2.2, 0, Math.PI * 2); ctx.fill();
    }
  } else if (t === 'mountain') {
    for (let i = 0; i < 10; i++) {
      const px = x + (rand(L.id, i) - 0.5) * R * 1.5;
      const py = y + (rand(L.id, i + 100) - 0.3) * R * 0.9;
      const h = 14 + rand(L.id, i + 200) * 10;
      ctx.fillStyle = '#4a4450';
      ctx.beginPath();
      ctx.moveTo(px - h * 0.7, py + h * 0.7);
      ctx.lineTo(px, py - h * 0.9);
      ctx.lineTo(px + h * 0.7, py + h * 0.7);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#eef0f6';
      ctx.beginPath();
      ctx.moveTo(px - h * 0.25, py - h * 0.35);
      ctx.lineTo(px, py - h * 0.9);
      ctx.lineTo(px + h * 0.25, py - h * 0.35);
      ctx.closePath(); ctx.fill();
    }
  } else if (t === 'desert') {
    for (let i = 0; i < 6; i++) {
      ctx.strokeStyle = 'rgba(120,80,32,0.55)';
      ctx.lineWidth = 2;
      const yy = y + (i - 3) * R * 0.28;
      ctx.beginPath();
      ctx.moveTo(x - R, yy);
      ctx.bezierCurveTo(x - R * 0.3, yy - R * 0.14, x + R * 0.3, yy + R * 0.14, x + R, yy);
      ctx.stroke();
    }
  } else if (t === 'tundra') {
    for (let i = 0; i < 35; i++) {
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      const px = x + (rand(L.id, i) - 0.5) * R * 1.9;
      const py = y + (rand(L.id, i + 300) - 0.5) * R * 1.7;
      ctx.beginPath(); ctx.arc(px, py, 2 + rand(L.id, i + 500) * 3, 0, Math.PI * 2); ctx.fill();
    }
  } else if (t === 'plains') {
    for (let i = 0; i < 60; i++) {
      ctx.strokeStyle = 'rgba(90,108,40,0.55)';
      ctx.lineWidth = 1;
      const px = x + (rand(L.id, i) - 0.5) * R * 1.9;
      const py = y + (rand(L.id, i + 200) - 0.5) * R * 1.6;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py - 5); ctx.stroke();
    }
    // rivers
    ctx.strokeStyle = 'rgba(120,180,220,0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - R * 0.8, y - R * 0.4);
    ctx.bezierCurveTo(x - R * 0.2, y - R * 0.1, x + R * 0.2, y + R * 0.2, x + R * 0.8, y + R * 0.5);
    ctx.stroke();
  } else if (t === 'volcanic') {
    for (let i = 0; i < 14; i++) {
      ctx.fillStyle = i % 3 === 0 ? '#f2a848' : '#5a1a14';
      const px = x + (rand(L.id, i) - 0.5) * R * 1.8;
      const py = y + (rand(L.id, i + 200) - 0.5) * R * 1.6;
      ctx.beginPath(); ctx.arc(px, py, 2 + rand(L.id, i + 400) * 3, 0, Math.PI * 2); ctx.fill();
    }
    // central caldera
    ctx.fillStyle = 'rgba(255,160,80,0.6)';
    ctx.beginPath(); ctx.arc(x, y, R * 0.18, 0, Math.PI * 2); ctx.fill();
  }
}

// ---------- Title logo ----------
export function makeTitleLogo(scene: Phaser.Scene, key: string, w: number, h: number) {
  const { c, ctx } = makeCanvas(w, h);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  // background glow
  const g = ctx.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w * 0.6);
  g.addColorStop(0, 'rgba(143,214,255,0.25)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  // title
  ctx.font = `700 ${Math.floor(h * 0.55)}px Cinzel, "Trajan Pro", "Trebuchet MS", serif`;
  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillText('PLANETARY ENGINE', w / 2 + 4, h * 0.5 + 4);
  // gold gradient fill
  const tg = ctx.createLinearGradient(0, h * 0.2, 0, h * 0.8);
  tg.addColorStop(0, '#fff4cc'); tg.addColorStop(0.5, '#f0c860'); tg.addColorStop(1, '#a87838');
  ctx.fillStyle = tg;
  ctx.fillText('PLANETARY ENGINE', w / 2, h * 0.5);
  // bronze stroke
  ctx.strokeStyle = '#3a2818'; ctx.lineWidth = 2;
  ctx.strokeText('PLANETARY ENGINE', w / 2, h * 0.5);
  addTexture(scene, key, c);
}

// ---------- Star field background ----------
export function makeStarField(scene: Phaser.Scene, key: string, w: number, h: number) {
  const { c, ctx } = makeCanvas(w, h);
  // gradient cosmos
  const g = ctx.createRadialGradient(w / 2, h / 2, 80, w / 2, h / 2, Math.max(w, h) * 0.7);
  g.addColorStop(0, '#152348');
  g.addColorStop(0.5, '#0a1530');
  g.addColorStop(1, '#04060d');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  // stars
  for (let i = 0; i < 600; i++) {
    const x = Math.random() * w, y = Math.random() * h;
    const r = Math.random() * 1.4 + 0.2;
    ctx.fillStyle = `rgba(255,${230 + Math.random() * 25 | 0},${180 + Math.random() * 50 | 0},${0.3 + Math.random() * 0.7})`;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  // nebula clouds
  for (let i = 0; i < 6; i++) {
    const x = Math.random() * w, y = Math.random() * h;
    const r = 100 + Math.random() * 200;
    const ng = ctx.createRadialGradient(x, y, 0, x, y, r);
    const hue = Math.random() < 0.5 ? '143,214,255' : '200,149,87';
    ng.addColorStop(0, `rgba(${hue},0.15)`);
    ng.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = ng;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  addTexture(scene, key, c);
}

// ---------- Region tile (terrain) ----------
export type Terrain = 'forest' | 'desert' | 'mountain' | 'tundra' | 'plains' | 'water' | 'volcanic' | 'jungle';
const TERRAIN_COLORS: Record<Terrain, [string, string]> = {
  forest: ['#3a7a4a', '#1f4528'],
  desert: ['#d8a868', '#7a5a30'],
  mountain: ['#9a8ea0', '#4a4250'],
  tundra: ['#cad4e0', '#5a6878'],
  plains: ['#aabd5a', '#5a6a28'],
  water: ['#3a8ab8', '#152848'],
  volcanic: ['#a8483a', '#3a1818'],
  jungle: ['#2a8a4a', '#0e3818'],
};

export function makeRegionTexture(scene: Phaser.Scene, key: string, terrain: Terrain, w = 200, h = 140) {
  const { c, ctx } = makeCanvas(w, h);
  const [light, dark] = TERRAIN_COLORS[terrain];
  // base blob
  ctx.save();
  const path = new Path2D();
  // organic blob
  const cx = w / 2, cy = h / 2;
  const points = 12;
  for (let i = 0; i < points; i++) {
    const a = (i / points) * Math.PI * 2;
    const r = (Math.min(w, h) * 0.4) * (0.85 + Math.sin(i * 1.3) * 0.12 + Math.random() * 0.08);
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r * 0.85;
    if (i === 0) path.moveTo(x, y); else path.lineTo(x, y);
  }
  path.closePath();
  // soft shadow
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 12; ctx.shadowOffsetY = 4;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, light); g.addColorStop(1, dark);
  ctx.fillStyle = g; ctx.fill(path);
  ctx.restore();
  // texture details based on terrain
  ctx.save();
  ctx.clip(path);
  if (terrain === 'forest' || terrain === 'jungle') {
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * w, y = Math.random() * h;
      ctx.fillStyle = i % 2 === 0 ? '#1f4528' : '#5a9050';
      ctx.beginPath(); ctx.arc(x, y, 3 + Math.random() * 3, 0, Math.PI * 2); ctx.fill();
    }
  } else if (terrain === 'mountain') {
    for (let i = 0; i < 5; i++) {
      const x = 30 + i * 30 + Math.random() * 20, y = h * 0.6;
      ctx.fillStyle = '#5a5260';
      ctx.beginPath();
      ctx.moveTo(x - 18, y + 20); ctx.lineTo(x, y - 22); ctx.lineTo(x + 18, y + 20); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#dfe6f0';
      ctx.beginPath();
      ctx.moveTo(x - 6, y - 12); ctx.lineTo(x, y - 22); ctx.lineTo(x + 6, y - 12); ctx.closePath();
      ctx.fill();
    }
  } else if (terrain === 'desert') {
    for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = '#a8783a'; ctx.lineWidth = 2;
      ctx.beginPath();
      const yy = 30 + i * 20;
      ctx.moveTo(10, yy);
      ctx.bezierCurveTo(w * 0.3, yy - 8, w * 0.6, yy + 8, w - 10, yy);
      ctx.stroke();
    }
  } else if (terrain === 'tundra') {
    for (let i = 0; i < 12; i++) {
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath();
      ctx.arc(Math.random() * w, Math.random() * h, 4 + Math.random() * 4, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (terrain === 'plains') {
    for (let i = 0; i < 30; i++) {
      ctx.strokeStyle = '#7a8a30'; ctx.lineWidth = 1;
      const x = Math.random() * w, y = Math.random() * h;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 5); ctx.stroke();
    }
  } else if (terrain === 'volcanic') {
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = '#e8853a';
      const x = Math.random() * w, y = Math.random() * h;
      ctx.beginPath(); ctx.arc(x, y, 2 + Math.random() * 3, 0, Math.PI * 2); ctx.fill();
    }
  } else if (terrain === 'water') {
    for (let i = 0; i < 6; i++) {
      ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1.5;
      const yy = 20 + i * 18;
      ctx.beginPath();
      ctx.moveTo(10, yy);
      ctx.bezierCurveTo(w * 0.3, yy - 4, w * 0.6, yy + 4, w - 10, yy);
      ctx.stroke();
    }
  }
  ctx.restore();
  // outline
  ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 2; ctx.stroke(path);
  ctx.strokeStyle = 'rgba(232,184,120,0.3)'; ctx.lineWidth = 1; ctx.stroke(path);
  addTexture(scene, key, c);
}

// ---------- Generic glow circle (for highlights/particles) ----------
export function makeGlow(scene: Phaser.Scene, key: string, size: number, color: string) {
  const { c, ctx } = makeCanvas(size, size);
  const r = size / 2;
  const g = ctx.createRadialGradient(r, r, 0, r, r, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
  addTexture(scene, key, c);
}

// ---------- Banner (event) ----------
export function makeEventBanner(scene: Phaser.Scene, key: string, w: number, h: number) {
  const { c, ctx } = makeCanvas(w, h);
  // central diamond/banner shape
  ctx.beginPath();
  const inset = 30;
  ctx.moveTo(inset, 0);
  ctx.lineTo(w - inset, 0);
  ctx.lineTo(w, h / 2);
  ctx.lineTo(w - inset, h);
  ctx.lineTo(inset, h);
  ctx.lineTo(0, h / 2);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#8a6638'); g.addColorStop(0.5, '#5a4528'); g.addColorStop(1, '#2a1d10');
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = '#e8b878'; ctx.lineWidth = 2; ctx.stroke();
  // inner stone strip
  ctx.beginPath();
  ctx.moveTo(inset + 6, 6);
  ctx.lineTo(w - inset - 6, 6);
  ctx.lineTo(w - 10, h / 2);
  ctx.lineTo(w - inset - 6, h - 6);
  ctx.lineTo(inset + 6, h - 6);
  ctx.lineTo(10, h / 2);
  ctx.closePath();
  const ig = ctx.createLinearGradient(0, 0, 0, h);
  ig.addColorStop(0, '#1f2436'); ig.addColorStop(1, '#0a0e18');
  ctx.fillStyle = ig; ctx.fill();
  // gold accents
  ctx.fillStyle = '#f0c860';
  rivetCircle(ctx, inset, h / 2, 4); rivetCircle(ctx, w - inset, h / 2, 4);
  addTexture(scene, key, c);
}

// ---------- Run all generators (called from PreloadScene) ----------
export function generateAllAssets(scene: Phaser.Scene) {
  // backgrounds
  makeStarField(scene, 'bg-stars', 1600, 900);
  makeWorldPlatform(scene, 'world-platform', 720);
  makeWorldContinents(scene, 'world-continents', 720);
  makeTitleLogo(scene, 'title-logo', 900, 180);
  // panels
  makePanelTexture(scene, 'panel-stat', 240, 110);
  makePanelTexture(scene, 'panel-event', 360, 220);
  makePanelTexture(scene, 'panel-objective', 360, 240);
  makePanelTexture(scene, 'panel-banner', 700, 80);
  makePanelTexture(scene, 'panel-bottom', 1100, 200);
  makePanelTexture(scene, 'panel-machines', 340, 680);
  makePanelTexture(scene, 'panel-trend', 320, 110);
  makePanelTexture(scene, 'panel-modal', 1000, 600);
  makePanelTexture(scene, 'panel-menu', 520, 560);
  makePanelTexture(scene, 'panel-pause', 600, 540);
  // event banner shape
  makeEventBanner(scene, 'banner-shape', 700, 60);
  // buttons
  makeButtonTextures(scene, 'btn', 300, 64);
  makeButtonTextures(scene, 'btn-confirm', 320, 70);
  makeButtonTextures(scene, 'btn-small', 200, 50);
  makeButtonTextures(scene, 'btn-icon', 60, 60);
  // machine cards (selected/idle done dynamically)
  // icons
  (['climate', 'nature', 'humans', 'tectonics', 'pollution',
    'rain', 'magma', 'bloom', 'wind', 'purifier', 'peace',
    'storm', 'solar', 'root', 'tide', 'ember', 'relay', 'seeder', 'lullaby',
    'energy'] as const)
    .forEach(k => makeIcon(scene, `icon-${k}`, k, 64));
  // condition badges
  for (const id of Object.keys(CONDITIONS)) {
    const def = CONDITIONS[id as keyof typeof CONDITIONS];
    makeConditionBadge(scene, `badge-${id}`, def.glyph, def.color, 28);
  }
  // glows / particles
  makeGlow(scene, 'glow-cyan', 256, 'rgba(143,214,255,0.55)');
  makeGlow(scene, 'glow-gold', 256, 'rgba(240,200,96,0.6)');
  makeGlow(scene, 'glow-red', 256, 'rgba(232,80,60,0.6)');
  makeGlow(scene, 'glow-green', 256, 'rgba(90,200,112,0.6)');
  // region terrains
  (['forest', 'desert', 'mountain', 'tundra', 'plains', 'water', 'volcanic', 'jungle'] as const)
    .forEach(t => makeRegionTexture(scene, `region-${t}`, t, 220, 160));
  // machine card backings
  makeMachineCard(scene, 'card-idle', 170, 160, '#5ac8e6', false);
  makeMachineCard(scene, 'card-selected', 170, 160, '#f0c860', true);
}
