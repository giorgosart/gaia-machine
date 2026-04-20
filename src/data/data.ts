// Static data definitions: machines, regions, events.
// Kept data-driven so adding new content is trivial.

import type { Terrain } from '../assets/textures';
import type { RegionCondition } from './conditions';

export interface MachineDef {
  id: string;
  name: string;
  short: string;            // short action descriptor (e.g., "Boost Rain")
  iconKey: string;          // texture key
  accent: string;           // hex string for tint glow
  desc: string;             // tooltip / help description
  target: 'region' | 'global';
  unlockEra: number;        // era >= this to be available
  /** Divine Energy cost to deploy this machine. */
  cost: number;
  /** Short preview hint shown when hovering a valid target. */
  preview?: string;
  /** Short downside hint shown on the card. */
  downside?: string;
  // simulation effect applied to a region (if region-targeted) or all regions (if global)
  apply: (region: RegionState, world: WorldState) => string[]; // returns delta strings for tooltip floats
  cooldown?: number;        // optional cooldown turns
}

export interface RegionDef {
  id: string;
  name: string;
  terrain: Terrain;
  // position on the world platform in normalized coords (-1..1) relative to center
  nx: number;
  ny: number;
  // initial values
  init: Partial<RegionState>;
}

export interface RegionState {
  id: string;
  name: string;
  terrain: Terrain;
  moisture: number;       // 0..100
  temperature: number;    // 0..100  (50 = balanced)
  flora: number;          // 0..100
  fauna: number;          // 0..100
  prosperity: number;     // 0..100  human population/development
  pollution: number;      // 0..100
  tectonic: number;       // 0..100  pressure
  cooldown: number;       // turns of stress
  flag?: 'fire' | 'flood' | 'quake' | 'plague' | 'bloom' | 'drought' | null;
  /** Persistent regional conditions (droughted, unrest, blooming, …) */
  conditions?: RegionCondition[];
}

export interface WorldState {
  era: number;
  totalEras: number;
  harmony: number;        // 0..100
  climate: number;        // aggregate readouts 0..100
  nature: number;
  humans: number;
  tectonics: number;
  pollution: number;
  regions: RegionState[];
  machineCooldowns: Record<string, number>;
  trends: { climate: number; nature: number; humans: number; tectonics: number; pollution: number; harmony: number };
  history: { era: number; harmony: number }[];
  // ---- New stage additions ----
  /** Divine Energy resource. */
  energy: number;
  /** Max energy the caretaker can store (soft cap). */
  energyMax: number;
  /** Per-turn energy gain (set by difficulty). */
  energyPerTurn: number;
  /** Difficulty id: steward / harsh / dying. */
  difficulty: 'steward' | 'harsh' | 'dying';
  /** Active world trait ids. */
  worldTraits: string[];
  /** Upgrade flag strings chosen during run. */
  upgrades: string[];
  /** Pending upgrade offer (if any) that the player still needs to resolve. */
  pendingUpgradeEra?: number;
  /** True when the run continues past the total eras in endless mode. */
  endless: boolean;
  /** Scenario id used to start this run. */
  scenarioId: string;
  /** Last turn's machine/region (for multi-turn synergies). */
  lastMachineId: string | null;
  lastRegionId: string | null;
  /** Cached last-turn summary (populated by simulation). */
  lastSummary?: TurnSummary;
}

export interface TurnSummary {
  era: number;
  harmonyDelta: number;
  topGain: { label: string; delta: number } | null;
  topLoss: { label: string; delta: number } | null;
  riskRegions: { id: string; reason: string }[];
  synergies: string[];
  events: string[];
}

// ---------- Helpers used by machine apply functions ----------
function clamp(v: number, a = 0, b = 100) { return Math.max(a, Math.min(b, v)); }
function adj(r: RegionState, k: keyof RegionState, d: number) {
  const v = (r as any)[k] as number;
  (r as any)[k] = clamp(v + d);
}

// ---------- MACHINES ----------
export const MACHINES: MachineDef[] = [
  {
    id: 'rain',
    name: 'Rain Engine',
    short: 'Boost Rain',
    iconKey: 'icon-rain',
    accent: '#5ac8e6',
    desc: 'Calls divine rain over a region. Boosts moisture and cools heat. Excessive use can flood and damage prosperity.',
    target: 'region',
    unlockEra: 1,
    cost: 1,
    preview: '+Moisture · −Heat',
    downside: 'Floods if already wet',
    apply: (r) => {
      const deltas: string[] = [];
      adj(r, 'moisture', +22); deltas.push('+Moisture');
      adj(r, 'temperature', -6);
      if (r.moisture > 85) {
        adj(r, 'prosperity', -6); deltas.push('Floods!');
        r.flag = 'flood';
      } else {
        adj(r, 'flora', +4);
      }
      return deltas;
    },
  },
  {
    id: 'magma',
    name: 'Magma Valve',
    short: 'Release Pressure',
    iconKey: 'icon-magma',
    accent: '#e8853a',
    desc: 'Vents tectonic stress as controlled magma. Reduces quake risk but raises local heat and can scorch flora.',
    target: 'region',
    unlockEra: 1,
    cost: 1,
    preview: '−Pressure · +Heat',
    downside: 'Scorches flora',
    apply: (r) => {
      const deltas: string[] = [];
      adj(r, 'tectonic', -28); deltas.push('-Pressure');
      adj(r, 'temperature', +10);
      adj(r, 'flora', -8);
      if (r.tectonic < 10) deltas.push('Stable');
      return deltas;
    },
  },
  {
    id: 'bloom',
    name: 'Bloom Engine',
    short: 'Grow Flora',
    iconKey: 'icon-bloom',
    accent: '#6abf6a',
    desc: 'Awakens flora across a region. Greatly raises plant and animal life; risks overgrowth in wet zones.',
    target: 'region',
    unlockEra: 1,
    cost: 1,
    preview: '+Flora · +Fauna',
    downside: 'Overgrowth if wet',
    apply: (r) => {
      const deltas: string[] = [];
      adj(r, 'flora', +24); deltas.push('+Flora');
      adj(r, 'fauna', +10);
      if (r.moisture > 70) { adj(r, 'prosperity', -3); deltas.push('Overgrowth'); }
      return deltas;
    },
  },
  {
    id: 'wind',
    name: 'Wind Array',
    short: 'Shift Winds',
    iconKey: 'icon-wind',
    accent: '#cfd8e8',
    desc: 'Redistributes air currents globally: spreads moisture and disperses pollution across all regions.',
    target: 'global',
    unlockEra: 2,
    cost: 2,
    preview: 'Averages moisture & pollution',
    downside: 'Spreads wetness too',
    apply: (_r, w) => {
      const avgM = w.regions.reduce((s, r) => s + r.moisture, 0) / w.regions.length;
      const avgP = w.regions.reduce((s, r) => s + r.pollution, 0) / w.regions.length;
      w.regions.forEach(r => {
        r.moisture = clamp(r.moisture * 0.55 + avgM * 0.45);
        r.pollution = clamp(r.pollution * 0.6 + avgP * 0.3);
      });
      return ['Winds Shifted'];
    },
  },
  {
    id: 'purifier',
    name: 'Purifier Grid',
    short: 'Clean Pollution',
    iconKey: 'icon-purifier',
    accent: '#8fd6ff',
    desc: 'Targeted purification array. Strongly reduces pollution but stresses local prosperity for a turn.',
    target: 'region',
    unlockEra: 4,
    cost: 2,
    preview: '−Pollution · +Fauna',
    downside: 'Prosperity dips',
    apply: (r) => {
      const deltas: string[] = [];
      adj(r, 'pollution', -32); deltas.push('-Pollution');
      adj(r, 'prosperity', -4);
      adj(r, 'fauna', +4);
      return deltas;
    },
    cooldown: 2,
  },
  {
    id: 'peace',
    name: 'Peace Resonator',
    short: 'Stabilize Humans',
    iconKey: 'icon-peace',
    accent: '#ffe89a',
    desc: 'Soothing resonance calms human regions. Reduces unrest, slowly raises prosperity, slows further growth.',
    target: 'region',
    unlockEra: 5,
    cost: 2,
    preview: '+Prosperity · −Unrest',
    downside: 'Slow payoff',
    apply: (r) => {
      const deltas: string[] = [];
      adj(r, 'prosperity', +14); deltas.push('+Prosperity');
      adj(r, 'pollution', -6);
      r.cooldown = Math.max(0, r.cooldown - 2);
      return deltas;
    },
    cooldown: 2,
  },
  // ------------ NEW STAGE MACHINES ------------
  {
    id: 'storm',
    name: 'Storm Lattice',
    short: 'Route Storms',
    iconKey: 'icon-storm',
    accent: '#6aa8ff',
    desc: 'Advanced moisture router: drains moisture from the driest region and floods the target with rain.',
    target: 'region',
    unlockEra: 3,
    cost: 2,
    preview: '+Big Moisture · −Driest elsewhere',
    downside: 'Flood risk',
    apply: (r, w) => {
      const deltas: string[] = [];
      adj(r, 'moisture', +32); deltas.push('++Moisture');
      adj(r, 'temperature', -4);
      // drain from the globally driest region
      const driest = [...w.regions].filter(x => x.id !== r.id).sort((a, b) => a.moisture - b.moisture)[0];
      if (driest) { driest.moisture = clamp(driest.moisture - 14); deltas.push(`${driest.name[0]}↓`); }
      if (r.moisture > 90) { adj(r, 'prosperity', -8); r.flag = 'flood'; deltas.push('Floods!'); }
      return deltas;
    },
    cooldown: 2,
  },
  {
    id: 'solar',
    name: 'Solar Lens',
    short: 'Focus Sunlight',
    iconKey: 'icon-solar',
    accent: '#f0c860',
    desc: 'Focuses solar heat on a region. Warms cold land and revives flood-damaged prosperity, but risks drought.',
    target: 'region',
    unlockEra: 2,
    cost: 1,
    preview: '+Heat · +Prosperity (cold)',
    downside: 'Drought risk',
    apply: (r) => {
      const deltas: string[] = [];
      adj(r, 'temperature', +14); deltas.push('+Heat');
      if (r.temperature < 55) adj(r, 'prosperity', +6);
      adj(r, 'moisture', -8);
      adj(r, 'pollution', +2);
      if (r.moisture < 25 && r.temperature > 70) { adj(r, 'flora', -6); deltas.push('Scorches'); }
      return deltas;
    },
  },
  {
    id: 'root',
    name: 'Root Network',
    short: 'Anchor Flora',
    iconKey: 'icon-root',
    accent: '#3a7a4a',
    desc: 'Weaves living roots through a region. Long-lasting flora stability; absorbs pollution over several turns.',
    target: 'region',
    unlockEra: 3,
    cost: 2,
    preview: 'Rooted condition · −Pollution over time',
    downside: 'Prosperity slows',
    apply: (r) => {
      // The sim applies the condition; here we also give a small immediate bump.
      const deltas: string[] = [];
      adj(r, 'flora', +10); deltas.push('+Flora');
      adj(r, 'pollution', -4);
      adj(r, 'prosperity', -2);
      return deltas;
    },
    cooldown: 2,
  },
  {
    id: 'tide',
    name: 'Tide Engine',
    short: 'Tune the Ocean',
    iconKey: 'icon-tide',
    accent: '#2a78a8',
    desc: 'Channels deep-sea currents. Boosts The Deep and bleeds pollution out of coastal regions.',
    target: 'global',
    unlockEra: 4,
    cost: 2,
    preview: 'Deep + coastal boost',
    downside: 'Flood risk on coasts',
    apply: (_r, w) => {
      const deep = w.regions.find(r => r.id === 'deep_sea');
      if (deep) { deep.fauna = clamp(deep.fauna + 10); deep.flora = clamp(deep.flora + 4); }
      w.regions.forEach(r => {
        if (r.id === 'deep_sea') return;
        r.pollution = clamp(r.pollution - 6);
        r.moisture = clamp(r.moisture + 4);
      });
      return ['Tides Sung'];
    },
    cooldown: 3,
  },
  {
    id: 'ember',
    name: 'Ember Forge',
    short: 'Stoke Industry',
    iconKey: 'icon-ember',
    accent: '#e8853a',
    desc: 'Ignites industry in a region. Enormous prosperity gain — at grim ecological cost.',
    target: 'region',
    unlockEra: 4,
    cost: 2,
    preview: '++Prosperity · −Tectonics',
    downside: '++Pollution · −Flora',
    apply: (r) => {
      const deltas: string[] = [];
      adj(r, 'prosperity', +22); deltas.push('++Prosperity');
      adj(r, 'tectonic', -6);
      adj(r, 'pollution', +20); deltas.push('++Pollution');
      adj(r, 'flora', -10);
      return deltas;
    },
  },
  {
    id: 'relay',
    name: 'Fauna Relay',
    short: 'Migrate Herds',
    iconKey: 'icon-relay',
    accent: '#b07a3a',
    desc: 'Channels wildlife from the healthiest neighbouring region into the target. Donor loses some fauna briefly.',
    target: 'region',
    unlockEra: 3,
    cost: 1,
    preview: '+Fauna · Donor ↓',
    downside: 'Donor destabilised',
    apply: (r, w) => {
      // donor = any region with highest fauna (not the target). Prefers neighbours.
      const deltas: string[] = [];
      const pool = w.regions.filter(x => x.id !== r.id);
      pool.sort((a, b) => b.fauna - a.fauna);
      const donor = pool[0];
      if (donor) {
        const moved = Math.min(18, donor.fauna * 0.3);
        donor.fauna = clamp(donor.fauna - moved);
        r.fauna = clamp(r.fauna + moved + 4);
        deltas.push(`+Fauna from ${donor.name[0]}`);
      }
      return deltas;
    },
  },
  {
    id: 'seeder',
    name: 'Cloud Seeder',
    short: 'Seed Skies',
    iconKey: 'icon-seeder',
    accent: '#8fd6ff',
    desc: 'Seeds atmospheric patterns in a region. Smooths drought extremes over several turns.',
    target: 'region',
    unlockEra: 3,
    cost: 1,
    preview: 'Seeded condition · gentle moisture',
    downside: 'Weaker direct rain',
    apply: (r) => {
      const deltas: string[] = [];
      adj(r, 'moisture', +6);
      adj(r, 'temperature', -2);
      deltas.push('Seeded');
      return deltas;
    },
  },
  {
    id: 'lullaby',
    name: 'Core Lullaby',
    short: 'Still the Core',
    iconKey: 'icon-lullaby',
    accent: '#8060c0',
    desc: 'A planetary hymn slows tectonic pressure across the globe for several turns.',
    target: 'global',
    unlockEra: 6,
    cost: 3,
    preview: 'Global tectonic slow · big cost',
    downside: '−Prosperity',
    apply: (_r, w) => {
      w.regions.forEach(r => { r.tectonic = clamp(r.tectonic - 10); r.prosperity = clamp(r.prosperity - 3); });
      return ['Core Quieted'];
    },
    cooldown: 3,
  },
];

// ---------- REGIONS (8 distinct regions placed around a circle) ----------
export const REGIONS: RegionDef[] = [
  { id: 'north_wilds', name: 'Northern Wilds',  terrain: 'tundra',   nx:  0.02, ny: -0.99, init: { moisture: 60, temperature: 20, flora: 30, fauna: 30, prosperity: 10, tectonic: 30 } },
  { id: 'iron_peaks', name: 'Iron Peaks',       terrain: 'mountain', nx:  0.80, ny: -0.54, init: { moisture: 40, temperature: 35, flora: 20, fauna: 20, prosperity: 15, tectonic: 70 } },
  { id: 'sunlands',   name: 'Sunlands',         terrain: 'desert',   nx:  -0.62, ny:  -0.58, init: { moisture: 15, temperature: 80, flora: 15, fauna: 15, prosperity: 25, tectonic: 30 } },
  { id: 'verdant',    name: 'Verdant Reach',    terrain: 'forest',   nx:  -0.80, ny:  0.30, init: { moisture: 70, temperature: 55, flora: 75, fauna: 65, prosperity: 30, tectonic: 20 } },
  { id: 'lowlands',   name: 'The Lowlands',     terrain: 'plains',   nx: -0.15, ny:  0.92, init: { moisture: 50, temperature: 55, flora: 55, fauna: 45, prosperity: 60, tectonic: 20, pollution: 25 } },
  { id: 'green_isle', name: 'Emerald Isles',    terrain: 'jungle',   nx: 0.28, ny:  0.48, init: { moisture: 80, temperature: 70, flora: 80, fauna: 70, prosperity: 25, tectonic: 25 } },
  { id: 'ashen',      name: 'Ashen Reach',      terrain: 'volcanic', nx: 0.98, ny: 0.28, init: { moisture: 25, temperature: 70, flora: 10, fauna: 10, prosperity: 10, tectonic: 80 } },
  { id: 'deep_sea',   name: 'The Deep',         terrain: 'water',    nx:  0.00, ny:  0.00, init: { moisture: 95, temperature: 45, flora: 40, fauna: 60, prosperity: 5,  tectonic: 35 } },
];

// ---------- EVENTS ----------
export interface EventDef {
  id: string;
  title: string;
  desc: (region?: RegionState) => string;
  icon?: string;
  scope: 'region' | 'global';
  weight: number;
  // when can it fire
  canFire: (w: WorldState, r?: RegionState) => boolean;
  fire: (w: WorldState, r?: RegionState) => string;  // returns alert text
  severity: 'info' | 'warn' | 'danger' | 'good';
}

export const EVENTS: EventDef[] = [
  {
    id: 'drought', title: 'Severe Drought', severity: 'danger', scope: 'region', weight: 5,
    desc: (r) => `${r?.name ?? 'A region'} bakes under cracked skies. Moisture is collapsing.`,
    canFire: (_w, r) => !!r && r.moisture < 30 && r.temperature > 55,
    fire: (_w, r) => { if (!r) return ''; r.moisture = clamp(r.moisture - 14); r.flora = clamp(r.flora - 10); r.flag = 'drought'; return `Drought in the ${r.name}`; },
  },
  {
    id: 'industry', title: 'Industrial Expansion', severity: 'warn', scope: 'region', weight: 4,
    desc: (r) => `Humans in ${r?.name ?? 'the region'} build smoke-belching forges.`,
    canFire: (_w, r) => !!r && r.prosperity > 50,
    fire: (_w, r) => { if (!r) return ''; r.pollution = clamp(r.pollution + 16); r.prosperity = clamp(r.prosperity + 6); return `Humans expanding cities in ${r.name}`; },
  },
  {
    id: 'migration', title: 'Migratory Collapse', severity: 'warn', scope: 'region', weight: 3,
    desc: (r) => `Great herds vanish from ${r?.name ?? 'the wild'}.`,
    canFire: (_w, r) => !!r && r.fauna > 20 && r.pollution > 40,
    fire: (_w, r) => { if (!r) return ''; r.fauna = clamp(r.fauna - 18); return `Fauna fleeing the ${r.name}`; },
  },
  {
    id: 'volcano', title: 'Dormant Volcano Awakens', severity: 'danger', scope: 'region', weight: 4,
    desc: (r) => `Ancient fire stirs beneath ${r?.name ?? 'the crust'}.`,
    canFire: (_w, r) => !!r && r.tectonic > 70,
    fire: (_w, r) => { if (!r) return ''; r.tectonic = clamp(r.tectonic - 30); r.flora = clamp(r.flora - 20); r.prosperity = clamp(r.prosperity - 12); r.flag = 'fire'; return `Volcano erupts in ${r.name}!`; },
  },
  {
    id: 'fungal', title: 'Fungal Bloom', severity: 'good', scope: 'region', weight: 3,
    desc: (r) => `Strange spores quicken life across ${r?.name ?? 'the lands'}.`,
    canFire: (_w, r) => !!r && r.moisture > 65 && r.flora > 40,
    fire: (_w, r) => { if (!r) return ''; r.flora = clamp(r.flora + 14); r.fauna = clamp(r.fauna + 8); r.flag = 'bloom'; return `Fungal bloom in the ${r.name}`; },
  },
  {
    id: 'oceandie', title: 'Ocean Die-off', severity: 'danger', scope: 'region', weight: 3,
    desc: (r) => `Acidic tides strangle the ${r?.name ?? 'sea'}.`,
    canFire: (_w, r) => !!r && r.terrain === 'water' && r.pollution > 30,
    fire: (_w, r) => { if (!r) return ''; r.fauna = clamp(r.fauna - 22); r.pollution = clamp(r.pollution + 6); return `Ocean die-off in ${r.name}`; },
  },
  {
    id: 'heatwave', title: 'Heatwave', severity: 'warn', scope: 'global', weight: 3,
    desc: () => `Solar tides scorch every continent.`,
    canFire: (w) => w.climate > 70 || w.regions.some(r => r.temperature > 75),
    fire: (w) => { w.regions.forEach(r => { r.temperature = clamp(r.temperature + 8); r.moisture = clamp(r.moisture - 6); }); return 'Heatwave sweeps the world'; },
  },
  {
    id: 'flood', title: 'Flash Floods', severity: 'warn', scope: 'region', weight: 3,
    desc: (r) => `${r?.name ?? 'The plains'} drown under sudden rains.`,
    canFire: (_w, r) => !!r && r.moisture > 80,
    fire: (_w, r) => { if (!r) return ''; r.prosperity = clamp(r.prosperity - 10); r.moisture = clamp(r.moisture - 12); r.flag = 'flood'; return `Floods in the ${r.name}`; },
  },
  {
    id: 'unrest', title: 'Civil Unrest', severity: 'warn', scope: 'region', weight: 3,
    desc: (r) => `Faith in the divine machines wavers in ${r?.name ?? 'the city'}.`,
    canFire: (_w, r) => !!r && r.prosperity > 40 && r.pollution > 30,
    fire: (_w, r) => { if (!r) return ''; r.prosperity = clamp(r.prosperity - 12); r.cooldown = (r.cooldown || 0) + 2; return `Civil unrest in ${r.name}`; },
  },
  {
    id: 'recovery', title: 'Miraculous Recovery', severity: 'good', scope: 'global', weight: 1,
    desc: () => `A holy resonance pulses through the planetary core.`,
    canFire: (w) => w.harmony < 35,
    fire: (w) => { w.regions.forEach(r => { r.flora = clamp(r.flora + 6); r.fauna = clamp(r.fauna + 6); r.pollution = clamp(r.pollution - 8); }); return 'A miraculous recovery stirs the world'; },
  },
  {
    id: 'tect_rise', title: 'Tectonic Stress Rising', severity: 'warn', scope: 'global', weight: 2,
    desc: () => `Plates groan beneath the world platform.`,
    canFire: (w) => w.tectonics > 60,
    fire: (w) => { w.regions.forEach(r => { r.tectonic = clamp(r.tectonic + 6); }); return 'Tectonic stress rising'; },
  },
];
