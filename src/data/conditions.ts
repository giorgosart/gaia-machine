// Persistent regional conditions: temporary status effects that last
// several turns and modify local simulation rules. Each region keeps a
// list of active conditions in its state; the simulation ticks durations
// down each turn and calls per-condition hooks.

import type { RegionState } from './data';

export type ConditionId =
  | 'droughted' | 'flooded' | 'unrest' | 'fractured'
  | 'blooming' | 'polluted_air' | 'migratory_collapse'
  | 'fertile' | 'heatwave' | 'recovering'
  | 'wetland' | 'ash_fertility' | 'cultural_bloom'
  | 'rooted' | 'seeded';

export interface ConditionDef {
  id: ConditionId;
  name: string;
  desc: string;
  /** Default duration in turns when applied. */
  duration: number;
  /** One-letter glyph shown on the region badge. */
  glyph: string;
  /** Tint hex color for the badge (0xRRGGBB). */
  color: number;
  tone: 'good' | 'bad' | 'neutral';
  /** Per-turn effect hook (applied during simulation). */
  tick?: (r: RegionState) => void;
}

// Factory used by the simulation when instantiating a condition on a region.
export function makeInstance(id: ConditionId, duration?: number): RegionCondition {
  const def = CONDITIONS[id];
  return { id, remaining: duration ?? def.duration };
}

export interface RegionCondition {
  id: ConditionId;
  remaining: number;       // turns left
}

function clamp(v: number, a = 0, b = 100) { return Math.max(a, Math.min(b, v)); }

export const CONDITIONS: Record<ConditionId, ConditionDef> = {
  droughted: {
    id: 'droughted', name: 'Droughted', duration: 3, glyph: '☼', color: 0xe8a040, tone: 'bad',
    desc: 'Soils parched. Flora recovers slowly, heat bakes harder.',
    tick: r => { r.flora = clamp(r.flora - 2); r.temperature = clamp(r.temperature + 1.5); r.moisture = clamp(r.moisture - 1.5); },
  },
  flooded: {
    id: 'flooded', name: 'Flooded', duration: 2, glyph: '~', color: 0x5ac8e6, tone: 'bad',
    desc: 'Waters swallow the fields. Prosperity suffers; fauna scatter.',
    tick: r => { r.prosperity = clamp(r.prosperity - 2); r.fauna = clamp(r.fauna - 1.5); },
  },
  unrest: {
    id: 'unrest', name: 'Unrest', duration: 3, glyph: '!', color: 0xe84030, tone: 'bad',
    desc: 'People lose faith in the divine engines. Growth stalls.',
    tick: r => { r.prosperity = clamp(r.prosperity - 2.5); r.cooldown = Math.max(r.cooldown, 1); },
  },
  fractured: {
    id: 'fractured', name: 'Quake-Fractured', duration: 4, glyph: 'X', color: 0xa0a0a0, tone: 'bad',
    desc: 'Crust scarred by tremors. Future quakes hit harder, prosperity crawls.',
    tick: r => { r.prosperity = clamp(r.prosperity - 1); r.tectonic = clamp(r.tectonic + 0.5); },
  },
  blooming: {
    id: 'blooming', name: 'Blooming', duration: 3, glyph: '✿', color: 0xd870a0, tone: 'good',
    desc: 'Rich blossoms accelerate life across the region.',
    tick: r => { r.flora = clamp(r.flora + 2); r.fauna = clamp(r.fauna + 1.5); },
  },
  polluted_air: {
    id: 'polluted_air', name: 'Polluted Air', duration: 4, glyph: '☁', color: 0x7a6a4a, tone: 'bad',
    desc: 'Smog shrouds the sky. Fauna and people slowly weaken.',
    tick: r => { r.fauna = clamp(r.fauna - 1.5); r.prosperity = clamp(r.prosperity - 1); r.pollution = clamp(r.pollution + 1); },
  },
  migratory_collapse: {
    id: 'migratory_collapse', name: 'Migratory Collapse', duration: 3, glyph: '↯', color: 0xe8b840, tone: 'bad',
    desc: 'Herds have fled. Fauna recovery is crippled for a time.',
    tick: r => { r.fauna = clamp(r.fauna - 1); },
  },
  fertile: {
    id: 'fertile', name: 'Fertile Season', duration: 3, glyph: '♣', color: 0x6abf6a, tone: 'good',
    desc: 'A divine season lifts plant growth across the region.',
    tick: r => { r.flora = clamp(r.flora + 2.5); },
  },
  heatwave: {
    id: 'heatwave', name: 'Heatwave', duration: 2, glyph: '♨', color: 0xe84030, tone: 'bad',
    desc: 'Temperatures spike. Flora scorches, water evaporates.',
    tick: r => { r.temperature = clamp(r.temperature + 2); r.moisture = clamp(r.moisture - 2); r.flora = clamp(r.flora - 1.5); },
  },
  recovering: {
    id: 'recovering', name: 'Recovering', duration: 3, glyph: '✚', color: 0x8fd6ff, tone: 'good',
    desc: 'Blessed resilience. Future disasters strike with reduced force.',
    // effect applied by simulation when computing disaster impact
  },
  wetland: {
    id: 'wetland', name: 'Wetland Recovery', duration: 4, glyph: '≈', color: 0x5ac8e6, tone: 'good',
    desc: 'Purified wetlands quicken recovery and soak pollution.',
    tick: r => { r.fauna = clamp(r.fauna + 1); r.pollution = clamp(r.pollution - 1.5); r.flora = clamp(r.flora + 1); },
  },
  ash_fertility: {
    id: 'ash_fertility', name: 'Ash Fertility', duration: 4, glyph: '✤', color: 0xc89557, tone: 'good',
    desc: 'Volcanic ash enriches the soil. Flora surges back stronger than before.',
    tick: r => { r.flora = clamp(r.flora + 3); r.fauna = clamp(r.fauna + 1); },
  },
  cultural_bloom: {
    id: 'cultural_bloom', name: 'Cultural Bloom', duration: 3, glyph: '✯', color: 0xffe89a, tone: 'good',
    desc: 'A renaissance of craft and song. Prosperity grows without the usual cost.',
    tick: r => { r.prosperity = clamp(r.prosperity + 2); r.pollution = clamp(r.pollution - 0.5); },
  },
  rooted: {
    id: 'rooted', name: 'Rooted', duration: 5, glyph: '⚭', color: 0x3a7a4a, tone: 'good',
    desc: 'Root Network stabilises flora and absorbs pollution.',
    tick: r => { r.flora = clamp(r.flora + 1.5); r.pollution = clamp(r.pollution - 1); r.prosperity = clamp(r.prosperity - 0.4); },
  },
  seeded: {
    id: 'seeded', name: 'Seeded Skies', duration: 4, glyph: '❆', color: 0xcfd8e8, tone: 'good',
    desc: 'Cloud Seeder smooths extremes. Moisture drifts gently upward.',
    tick: r => { if (r.moisture < 50) r.moisture = clamp(r.moisture + 2); else r.moisture = clamp(r.moisture - 0.5); },
  },
};

export function hasCondition(r: RegionState, id: ConditionId): boolean {
  return !!r.conditions && r.conditions.some(c => c.id === id);
}

export function applyCondition(r: RegionState, id: ConditionId, duration?: number) {
  if (!r.conditions) r.conditions = [];
  const existing = r.conditions.find(c => c.id === id);
  const def = CONDITIONS[id];
  if (existing) {
    existing.remaining = Math.max(existing.remaining, duration ?? def.duration);
  } else {
    r.conditions.push(makeInstance(id, duration));
  }
}

export function removeCondition(r: RegionState, id: ConditionId) {
  if (!r.conditions) return;
  r.conditions = r.conditions.filter(c => c.id !== id);
}
