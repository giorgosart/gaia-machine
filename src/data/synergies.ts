// Machine synergies: special outcomes when certain machines combine with
// region state or with other recent machines. Applied after a machine's
// own effect resolves, before natural drift.

import type { RegionState, WorldState } from './data';
import { applyCondition } from './conditions';
import { neighboursOf } from './adjacency';

export interface SynergyContext {
  w: WorldState;
  region: RegionState | null;   // target of the machine (null for global)
  machineId: string;
  lastMachineId: string | null; // machine used previous turn
  lastRegionId: string | null;
}

export interface Synergy {
  id: string;
  name: string;
  desc: string;
  /** Returns a human-readable outcome string if it fires, otherwise null. */
  check: (ctx: SynergyContext) => string | null;
}

function clamp(v: number, a = 0, b = 100) { return Math.max(a, Math.min(b, v)); }

export const SYNERGIES: Synergy[] = [
  // 1. Rain on very hot → Monsoon (strong moisture, flood risk)
  {
    id: 'monsoon', name: 'Monsoon',
    desc: 'Rain Engine over a scorching region unleashes a monsoon.',
    check: ({ machineId, region }) => {
      if (machineId !== 'rain' || !region) return null;
      if (region.temperature < 70) return null;
      region.moisture = clamp(region.moisture + 12);
      region.temperature = clamp(region.temperature - 8);
      if (region.moisture > 88) { region.prosperity = clamp(region.prosperity - 6); applyCondition(region, 'flooded'); }
      applyCondition(region, 'fertile');
      return `Monsoon breaks over ${region.name}`;
    },
  },
  // 2. Magma → Bloom = Ash Fertility
  {
    id: 'ash_fertility', name: 'Ash Fertility',
    desc: 'Seeding flora onto freshly vented ash enriches the soil.',
    check: ({ machineId, region, lastMachineId, lastRegionId }) => {
      if (machineId !== 'bloom' || !region) return null;
      if (lastMachineId !== 'magma' || lastRegionId !== region.id) return null;
      region.flora = clamp(region.flora + 10);
      region.fauna = clamp(region.fauna + 4);
      applyCondition(region, 'ash_fertility');
      return `Ash fertility blooms in ${region.name}`;
    },
  },
  // 3. Purifier on wet/flooded → Wetland Recovery
  {
    id: 'wetland', name: 'Wetland Recovery',
    desc: 'Purifying a drenched region turns floodland into thriving wetland.',
    check: ({ machineId, region }) => {
      if (machineId !== 'purifier' || !region) return null;
      if (region.moisture < 65) return null;
      region.fauna = clamp(region.fauna + 6);
      region.flora = clamp(region.flora + 4);
      applyCondition(region, 'wetland');
      return `Wetlands recover across ${region.name}`;
    },
  },
  // 4. Wind after volcanic activity → Ash Spread
  {
    id: 'ash_wind', name: 'Ash-laden Winds',
    desc: 'Shifting winds over a just-vented world spread ash and climate stress.',
    check: ({ machineId, lastMachineId, w }) => {
      if (machineId !== 'wind') return null;
      if (lastMachineId !== 'magma') return null;
      w.regions.forEach(r => { r.temperature = clamp(r.temperature + 2); r.pollution = clamp(r.pollution + 2); });
      return `Ash-laden winds sweep the world`;
    },
  },
  // 5. Peace Resonator on thriving region → Cultural Bloom
  {
    id: 'cultural_bloom', name: 'Cultural Bloom',
    desc: 'A calm, prosperous region responds with a cultural renaissance.',
    check: ({ machineId, region }) => {
      if (machineId !== 'peace' || !region) return null;
      if (region.prosperity < 60 || region.pollution > 35) return null;
      region.prosperity = clamp(region.prosperity + 6);
      applyCondition(region, 'cultural_bloom');
      return `Cultural bloom in ${region.name}`;
    },
  },
  // 6. Tide Engine + coastal region → Coastal Balance
  {
    id: 'coastal_balance', name: 'Coastal Balance',
    desc: 'Tide Engine tuned through a healthy ocean stabilises its coasts.',
    check: ({ machineId, w }) => {
      if (machineId !== 'tide') return null;
      const deep = w.regions.find(r => r.id === 'deep_sea');
      if (!deep || deep.fauna < 50) return null;
      // coastal = all (Deep touches everything)
      neighboursOf('deep_sea').forEach(id => {
        const r = w.regions.find(x => x.id === id); if (!r) return;
        r.pollution = clamp(r.pollution - 3);
        r.temperature = clamp(r.temperature + (r.temperature < 50 ? 1 : -1));
      });
      return 'Coasts find balance with the tides';
    },
  },
  // 7. Root Network after Purifier → Living Filter
  {
    id: 'living_filter', name: 'Living Filter',
    desc: 'Rooting a purified region anchors the cleansing for turns to come.',
    check: ({ machineId, region, lastMachineId, lastRegionId }) => {
      if (machineId !== 'root' || !region) return null;
      if (lastMachineId !== 'purifier' || lastRegionId !== region.id) return null;
      region.pollution = clamp(region.pollution - 8);
      applyCondition(region, 'rooted', 6);
      return `Living filter takes root in ${region.name}`;
    },
  },
];

export function evaluateSynergies(ctx: SynergyContext): string[] {
  const msgs: string[] = [];
  for (const s of SYNERGIES) {
    const r = s.check(ctx);
    if (r) msgs.push(r);
  }
  return msgs;
}
