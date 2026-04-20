// World traits (scenario modifiers), difficulty modes, research choices,
// and scenarios. All are data-driven so new entries can be added easily.

import type { WorldState } from './data';

// ----------- World Traits -----------

export interface WorldTrait {
  id: string;
  name: string;
  desc: string;
  /** Optional one-time setup tweak to the fresh WorldState. */
  setup?: (w: WorldState) => void;
}

export const WORLD_TRAITS: WorldTrait[] = [
  {
    id: 'restless_core', name: 'Restless Core',
    desc: 'Tectonic pressure rises ~40% faster in every region. Magma Valve is vital.',
  },
  {
    id: 'fertile_seas', name: 'Fertile Seas',
    desc: 'The Deep begins richer and spreads more stability to coastal regions.',
    setup: w => { const d = w.regions.find(r => r.id === 'deep_sea'); if (d) { d.fauna = Math.min(100, d.fauna + 20); d.flora = Math.min(100, d.flora + 10); } },
  },
  {
    id: 'fragile_atmosphere', name: 'Fragile Atmosphere',
    desc: 'Climate index is slower to recover. Heatwaves hit sharper.',
  },
  {
    id: 'industrial_hunger', name: 'Industrial Hunger',
    desc: 'Humans grow faster and pollute harder. The Lowlands start already strained.',
    setup: w => { const l = w.regions.find(r => r.id === 'lowlands'); if (l) { l.prosperity = Math.min(100, l.prosperity + 10); l.pollution = Math.min(100, l.pollution + 10); } },
  },
  {
    id: 'long_winters', name: 'Long Winters',
    desc: 'Global temperatures drift cooler. Tundra and mountains hold longer.',
    setup: w => w.regions.forEach(r => { r.temperature = Math.max(0, r.temperature - 8); }),
  },
  {
    id: 'sacred_forests', name: 'Sacred Forests',
    desc: 'Verdant Reach begins flourishing and flora drift runs slightly faster everywhere.',
    setup: w => { const v = w.regions.find(r => r.id === 'verdant'); if (v) { v.flora = Math.min(100, v.flora + 15); v.fauna = Math.min(100, v.fauna + 10); } },
  },
];

// ----------- Difficulty -----------

export interface DifficultyMode {
  id: 'steward' | 'harsh' | 'dying';
  name: string;
  desc: string;
  startHarmony: number;
  pollutionMul: number;
  tectonicMul: number;
  eventSeverityMul: number;
  energyPerTurn: number;
}

export const DIFFICULTIES: Record<DifficultyMode['id'], DifficultyMode> = {
  steward: { id: 'steward', name: 'Steward',       desc: 'Balanced — the intended Planetary Engine experience.',  startHarmony: 75, pollutionMul: 1.0, tectonicMul: 1.0, eventSeverityMul: 1.0, energyPerTurn: 2 },
  harsh:   { id: 'harsh',   name: 'Harsh Steward', desc: 'A bruised world. Pressure grows faster and disasters bite harder.', startHarmony: 65, pollutionMul: 1.25, tectonicMul: 1.2, eventSeverityMul: 1.25, energyPerTurn: 2 },
  dying:   { id: 'dying',   name: 'Dying World',   desc: 'Catastrophe already gathering. Only the shrewd caretaker can turn the tide.', startHarmony: 55, pollutionMul: 1.5, tectonicMul: 1.4, eventSeverityMul: 1.5, energyPerTurn: 2 },
};

// ----------- Scenarios (handcrafted starts) -----------

export interface Scenario {
  id: string;
  name: string;
  desc: string;
  difficulty: DifficultyMode['id'];
  traits: string[];            // WorldTrait.ids to apply
  setup?: (w: WorldState) => void;
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'standard', name: 'Balanced Run',
    desc: 'The default Planetary Engine experience. No scenario modifiers.',
    difficulty: 'steward', traits: [],
  },
  {
    id: 'restless_core', name: 'Restless Core',
    desc: 'Ashen Reach and Iron Peaks begin near quake. Surviving will require constant venting.',
    difficulty: 'harsh', traits: ['restless_core'],
    setup: w => { ['ashen','iron_peaks'].forEach(id => { const r = w.regions.find(x => x.id === id); if (r) r.tectonic = Math.min(100, r.tectonic + 15); }); },
  },
  {
    id: 'drowning_isles', name: 'Drowning Isles',
    desc: 'The Emerald Isles are already flooded. Redistribute before coastal life collapses.',
    difficulty: 'harsh', traits: ['fertile_seas'],
    setup: w => { const i = w.regions.find(r => r.id === 'green_isle'); if (i) { i.moisture = 95; i.prosperity = Math.max(0, i.prosperity - 10); } },
  },
  {
    id: 'industrial_miracle', name: 'Industrial Miracle',
    desc: 'The Lowlands are booming — and choking. Can humans thrive without drowning the world?',
    difficulty: 'harsh', traits: ['industrial_hunger'],
  },
  {
    id: 'last_forest', name: 'The Last Forest',
    desc: 'Only Verdant Reach holds life worth saving. Keep Nature above 50 to the end.',
    difficulty: 'dying', traits: ['sacred_forests', 'fragile_atmosphere'],
    setup: w => w.regions.forEach(r => { if (r.id !== 'verdant' && r.id !== 'deep_sea') { r.flora = Math.max(5, r.flora - 20); r.fauna = Math.max(5, r.fauna - 15); } }),
  },
];

// ----------- Research / Upgrade choices -----------
// Offered at specific eras. Player picks one of two branches.

export interface UpgradeChoice {
  id: string;
  name: string;
  desc: string;
  /** Mark active on the WorldState.upgrades when chosen. */
  grantsFlag: string;
}

export interface UpgradeOffer {
  era: number;                // era at which the choice is offered
  title: string;
  left: UpgradeChoice;
  right: UpgradeChoice;
}

export const UPGRADE_OFFERS: UpgradeOffer[] = [
  {
    era: 7, title: 'Doctrine of Restoration',
    left:  { id: 'path_purity', name: 'Path of Purity', desc: 'Purifier Grid removes more pollution and shares a trickle of cleansing with neighbours.', grantsFlag: 'upg_purity' },
    right: { id: 'path_roots',  name: 'Path of Roots',  desc: 'Root Network and Bloom Engine leave longer-lasting flora bonuses.',                    grantsFlag: 'upg_roots' },
  },
  {
    era: 14, title: 'Doctrine of Steadiness',
    left:  { id: 'path_bulwark', name: 'Path of the Bulwark', desc: 'Magma Valve and Core Lullaby calm tectonics more effectively.',             grantsFlag: 'upg_bulwark' },
    right: { id: 'path_harvest', name: 'Path of Harvest',      desc: 'Peace Resonator and Ember Forge lift prosperity without as much downside.', grantsFlag: 'upg_harvest' },
  },
];

export function hasUpgrade(w: WorldState, flag: string): boolean {
  return !!w.upgrades && w.upgrades.includes(flag);
}
