// Simulation: turn resolution, world & region updates, harmony, events.
import { ERAS_TOTAL, HARMONY_LOSS_THRESHOLD, HARMONY_WIN_THRESHOLD } from '../config';
import { EVENTS, MACHINES, REGIONS, type RegionState, type WorldState, type EventDef, type MachineDef } from '../data/data';

function clamp(v: number, a = 0, b = 100) { return Math.max(a, Math.min(b, v)); }

export function createWorld(): WorldState {
  const regions: RegionState[] = REGIONS.map(rd => ({
    id: rd.id,
    name: rd.name,
    terrain: rd.terrain,
    moisture: 50, temperature: 50, flora: 40, fauna: 40,
    prosperity: 30, pollution: 10, tectonic: 30,
    cooldown: 0, flag: null,
    ...rd.init,
  } as RegionState));
  const w: WorldState = {
    era: 1,
    totalEras: ERAS_TOTAL,
    harmony: 75,
    climate: 60, nature: 60, humans: 50, tectonics: 40, pollution: 20,
    regions,
    machineCooldowns: {},
    trends: { climate: 0, nature: 0, humans: 0, tectonics: 0, pollution: 0, harmony: 0 },
    history: [{ era: 1, harmony: 75 }],
  };
  recomputeAggregates(w);
  return w;
}

export function recomputeAggregates(w: WorldState) {
  const n = w.regions.length;
  // Climate index: 100 means well-balanced moisture & temperature near 50, low extremes
  let climate = 0, nature = 0, humans = 0, tectonics = 0, pollution = 0;
  for (const r of w.regions) {
    climate += 100 - Math.min(100, Math.abs(r.temperature - 50) * 1.4 + Math.abs(r.moisture - 55) * 0.6);
    nature += (r.flora * 0.6 + r.fauna * 0.4);
    humans += r.prosperity;
    tectonics += r.tectonic;
    pollution += r.pollution;
  }
  w.climate = clamp(climate / n);
  w.nature = clamp(nature / n);
  w.humans = clamp(humans / n);
  w.tectonics = clamp(tectonics / n);
  w.pollution = clamp(pollution / n);
  // Harmony: balance + life - destabilizers
  const balance = (w.climate + w.nature) / 2;
  const stress = (w.pollution * 0.6 + w.tectonics * 0.4);
  const human = Math.min(80, w.humans);  // diminishing
  w.harmony = clamp(balance * 0.6 + human * 0.2 - stress * 0.4 + 10);
}

export function describeStat(label: 'climate' | 'nature' | 'humans' | 'tectonics' | 'pollution', val: number): string {
  if (label === 'tectonics' || label === 'pollution') {
    if (val > 75) return 'High Risk';
    if (val > 50) return 'Rising';
    if (val > 25) return 'Moderate';
    return 'Stable';
  }
  if (label === 'humans') {
    if (val > 75) return 'Thriving';
    if (val > 50) return 'Growing';
    if (val > 25) return 'Settled';
    return 'Sparse';
  }
  if (val > 75) return 'Flourishing';
  if (val > 50) return 'Stable';
  if (val > 25) return 'Strained';
  return 'Failing';
}

export function statColor(label: 'climate' | 'nature' | 'humans' | 'tectonics' | 'pollution', val: number): number {
  // Returns hex color int for meter
  if (label === 'tectonics' || label === 'pollution') {
    if (val > 75) return 0xe84030;
    if (val > 50) return 0xe8b840;
    return 0x6abf6a;
  }
  if (val > 50) return 0x6abf6a;
  if (val > 25) return 0xe8b840;
  return 0xe84030;
}

// Apply machine action, then advance one era of natural simulation.
export interface TurnResult {
  alerts: string[];
  deltas: string[];                // floats from machine effect
  triggeredEvents: { evt: EventDef; region?: RegionState; alert: string }[];
  result: 'continue' | 'win' | 'lose';
}

export function applyMachine(w: WorldState, machine: MachineDef, region: RegionState | null): string[] {
  if (machine.target === 'global') return machine.apply(w.regions[0], w);
  if (region) return machine.apply(region, w);
  return [];
}

export function nextTurn(w: WorldState, machine: MachineDef | null, region: RegionState | null): TurnResult {
  const before = { ...w };
  const deltas = machine ? applyMachine(w, machine, region) : [];
  if (machine && machine.cooldown) {
    w.machineCooldowns[machine.id] = machine.cooldown;
  }
  // tick down cooldowns
  for (const k of Object.keys(w.machineCooldowns)) {
    w.machineCooldowns[k] = Math.max(0, w.machineCooldowns[k] - 1);
  }

  // natural drift per region
  for (const r of w.regions) {
    // moisture drifts toward terrain baseline
    const baseMoist = r.terrain === 'desert' ? 20 : r.terrain === 'water' ? 95 : r.terrain === 'jungle' ? 80 : r.terrain === 'tundra' ? 55 : 50;
    const baseTemp = r.terrain === 'desert' ? 80 : r.terrain === 'tundra' ? 20 : r.terrain === 'volcanic' ? 70 : 50;
    r.moisture = clamp(r.moisture + (baseMoist - r.moisture) * 0.08 + (Math.random() - 0.5) * 4);
    r.temperature = clamp(r.temperature + (baseTemp - r.temperature) * 0.05 + (Math.random() - 0.5) * 3);
    // flora grows with moisture, dies with extreme heat
    const floraDelta = (r.moisture - 40) * 0.04 - Math.max(0, r.temperature - 75) * 0.3 - r.pollution * 0.04;
    r.flora = clamp(r.flora + floraDelta);
    // fauna follows flora
    r.fauna = clamp(r.fauna + (r.flora - r.fauna) * 0.05 - r.pollution * 0.03);
    // human growth
    if (r.prosperity > 5) {
      const growth = (r.flora * 0.02 + (50 - Math.abs(r.temperature - 50)) * 0.02) - r.pollution * 0.04 - r.tectonic * 0.02;
      r.prosperity = clamp(r.prosperity + growth);
    }
    // pollution from prosperity
    r.pollution = clamp(r.pollution + r.prosperity * 0.04 - 1);
    // tectonic rises slowly
    r.tectonic = clamp(r.tectonic + 1 + Math.random() * 1.5);
    // clear flag after a bit
    if (Math.random() < 0.5) r.flag = null;
    if (r.cooldown > 0) r.cooldown--;
  }

  recomputeAggregates(w);

  // Events: 0..2 per turn
  const triggered: TurnResult['triggeredEvents'] = [];
  const alerts: string[] = [];
  const tries = 3;
  for (let i = 0; i < tries; i++) {
    const candidate = pickEvent(w);
    if (!candidate) break;
    const region = candidate.scope === 'region' ? pickEligibleRegion(w, candidate) : undefined;
    if (candidate.scope === 'region' && !region) continue;
    const alert = candidate.fire(w, region);
    if (alert) {
      triggered.push({ evt: candidate, region, alert });
      alerts.push(alert);
      if (triggered.length >= 2) break;
    }
  }

  recomputeAggregates(w);

  // trends
  w.trends = {
    climate: w.climate - before.climate,
    nature: w.nature - before.nature,
    humans: w.humans - before.humans,
    tectonics: w.tectonics - before.tectonics,
    pollution: w.pollution - before.pollution,
    harmony: w.harmony - before.harmony,
  };

  w.era++;
  w.history.push({ era: w.era, harmony: w.harmony });

  let result: TurnResult['result'] = 'continue';
  if (w.harmony <= HARMONY_LOSS_THRESHOLD) result = 'lose';
  else if (w.era > w.totalEras) result = w.harmony >= HARMONY_WIN_THRESHOLD ? 'win' : 'lose';

  return { alerts, deltas, triggeredEvents: triggered, result };
}

function pickEvent(w: WorldState): EventDef | null {
  const candidates = EVENTS.filter(e => {
    if (e.scope === 'region') return w.regions.some(r => e.canFire(w, r));
    return e.canFire(w);
  });
  if (!candidates.length) return null;
  const total = candidates.reduce((s, e) => s + e.weight, 0);
  let r = Math.random() * total;
  for (const c of candidates) { r -= c.weight; if (r <= 0) return c; }
  return candidates[0];
}

function pickEligibleRegion(w: WorldState, evt: EventDef): RegionState | undefined {
  const eligible = w.regions.filter(r => evt.canFire(w, r));
  if (!eligible.length) return undefined;
  return eligible[Math.floor(Math.random() * eligible.length)];
}

export function availableMachines(w: WorldState): MachineDef[] {
  return MACHINES.filter(m => w.era >= m.unlockEra);
}

export function isMachineReady(w: WorldState, m: MachineDef): boolean {
  return (w.machineCooldowns[m.id] || 0) <= 0;
}
