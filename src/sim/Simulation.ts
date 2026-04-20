// Simulation: turn resolution, world & region updates, harmony, events.
import { ERAS_TOTAL, HARMONY_LOSS_THRESHOLD, HARMONY_WIN_THRESHOLD } from '../config';
import { EVENTS, MACHINES, REGIONS, type RegionState, type WorldState, type EventDef, type MachineDef, type TurnSummary } from '../data/data';
import { ADJACENCY, neighboursOf } from '../data/adjacency';
import { applyCondition, CONDITIONS, hasCondition } from '../data/conditions';
import { phaseForEra } from '../data/phases';
import { DIFFICULTIES, hasUpgrade, SCENARIOS, UPGRADE_OFFERS, WORLD_TRAITS, type DifficultyMode } from '../data/traits';
import { passiveOf } from '../data/passives';
import { evaluateSynergies } from '../data/synergies';
import { riskRegions } from './forecast';

function clamp(v: number, a = 0, b = 100) { return Math.max(a, Math.min(b, v)); }

export interface CreateWorldOpts {
  difficulty?: DifficultyMode['id'];
  scenarioId?: string;
  endless?: boolean;
  traits?: string[];
}

export function createWorld(opts: CreateWorldOpts = {}): WorldState {
  const scenarioId = opts.scenarioId ?? 'standard';
  const scenario = SCENARIOS.find(s => s.id === scenarioId) ?? SCENARIOS[0];
  const difficulty = DIFFICULTIES[opts.difficulty ?? scenario.difficulty];

  const regions: RegionState[] = REGIONS.map(rd => ({
    id: rd.id,
    name: rd.name,
    terrain: rd.terrain,
    moisture: 50, temperature: 50, flora: 40, fauna: 40,
    prosperity: 30, pollution: 10, tectonic: 30,
    cooldown: 0, flag: null,
    conditions: [],
    ...rd.init,
  } as RegionState));

  const traits = opts.traits ?? scenario.traits;
  const w: WorldState = {
    era: 1,
    totalEras: opts.endless ? 9999 : ERAS_TOTAL,
    harmony: difficulty.startHarmony,
    climate: 60, nature: 60, humans: 50, tectonics: 40, pollution: 20,
    regions,
    machineCooldowns: {},
    trends: { climate: 0, nature: 0, humans: 0, tectonics: 0, pollution: 0, harmony: 0 },
    history: [{ era: 1, harmony: difficulty.startHarmony }],
    energy: 2,
    energyMax: 4,
    energyPerTurn: difficulty.energyPerTurn,
    difficulty: difficulty.id,
    worldTraits: [...traits],
    upgrades: [],
    endless: !!opts.endless,
    scenarioId,
    lastMachineId: null,
    lastRegionId: null,
  };

  for (const tid of w.worldTraits) {
    const t = WORLD_TRAITS.find(x => x.id === tid);
    t?.setup?.(w);
  }
  scenario.setup?.(w);

  recomputeAggregates(w);
  return w;
}

export function recomputeAggregates(w: WorldState) {
  const n = w.regions.length;
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
  const balance = (w.climate + w.nature) / 2;
  const stress = (w.pollution * 0.6 + w.tectonics * 0.4);
  const human = Math.min(80, w.humans);
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
  if (label === 'tectonics' || label === 'pollution') {
    if (val > 75) return 0xe84030;
    if (val > 50) return 0xe8b840;
    return 0x6abf6a;
  }
  if (val > 50) return 0x6abf6a;
  if (val > 25) return 0xe8b840;
  return 0xe84030;
}

export interface TurnResult {
  alerts: string[];
  deltas: string[];
  triggeredEvents: { evt: EventDef; region?: RegionState; alert: string }[];
  synergies: string[];
  summary: TurnSummary;
  result: 'continue' | 'win' | 'lose';
  upgradeOffered?: number;
}

export function applyMachine(w: WorldState, machine: MachineDef, region: RegionState | null): string[] {
  if (machine.target === 'global') return machine.apply(w.regions[0], w);
  if (region) {
    const out = machine.apply(region, w);
    if (machine.id === 'root') applyCondition(region, 'rooted');
    if (machine.id === 'seeder') applyCondition(region, 'seeded');
    return out;
  }
  return [];
}

function applyRegionPassives(w: WorldState) {
  for (const r of w.regions) {
    const passive = passiveOf(r.id);
    if (!passive) continue;
    switch (passive.id) {
      case 'frost_memory':
        r.pollution = clamp(r.pollution - 0.8);
        r.prosperity = clamp(r.prosperity - 0.4);
        break;
      case 'deep_roots':
        r.flora = clamp(r.flora + 0.6);
        if (r.temperature > 75) r.flora = clamp(r.flora + 1);
        break;
      case 'restless_hands':
        r.prosperity = clamp(r.prosperity + 0.6);
        r.pollution = clamp(r.pollution + 0.8);
        break;
      case 'tidebound':
        r.fauna = clamp(r.fauna + 0.5);
        if (r.moisture > 70) r.moisture = clamp(r.moisture + 1);
        break;
      case 'forgeborn':
        r.tectonic = clamp(r.tectonic + 0.8);
        break;
      case 'cradle_of_tides': {
        if (r.fauna > 50 && r.flora > 35) {
          for (const nid of neighboursOf('deep_sea')) {
            const n = w.regions.find(x => x.id === nid);
            if (!n) continue;
            n.pollution = clamp(n.pollution - 0.4);
            n.temperature = clamp(n.temperature + (n.temperature < 50 ? 0.3 : -0.3));
          }
        }
        break;
      }
    }
  }
}

function applyAdjacencySpread(w: WorldState) {
  const nextPoll: Record<string, number> = {};
  const nextMoist: Record<string, number> = {};
  const nextTemp: Record<string, number> = {};
  const nextFauna: Record<string, number> = {};
  for (const r of w.regions) {
    nextPoll[r.id] = r.pollution;
    nextMoist[r.id] = r.moisture;
    nextTemp[r.id] = r.temperature;
    nextFauna[r.id] = r.fauna;
  }
  for (const r of w.regions) {
    const neighbours = neighboursOf(r.id).map(id => w.regions.find(x => x.id === id)!).filter(Boolean);
    if (!neighbours.length) continue;
    const avgP = neighbours.reduce((s, n) => s + n.pollution, 0) / neighbours.length;
    const avgM = neighbours.reduce((s, n) => s + n.moisture, 0) / neighbours.length;
    const avgT = neighbours.reduce((s, n) => s + n.temperature, 0) / neighbours.length;
    nextPoll[r.id] = clamp(r.pollution * 0.94 + avgP * 0.06);
    nextMoist[r.id] = clamp(r.moisture * 0.95 + avgM * 0.05);
    if (avgT > r.temperature + 18) nextTemp[r.id] = clamp(r.temperature + 1.5);
    const richest = [...neighbours].sort((a, b) => b.fauna - a.fauna)[0];
    if (richest && richest.fauna > r.fauna + 20 && richest.pollution < 60 && r.flora > 20) {
      const move = Math.min(1.5, (richest.fauna - r.fauna) * 0.03);
      nextFauna[richest.id] = clamp(nextFauna[richest.id] - move);
      nextFauna[r.id] = clamp(nextFauna[r.id] + move);
    }
  }
  for (const r of w.regions) {
    r.pollution = nextPoll[r.id];
    r.moisture = nextMoist[r.id];
    r.temperature = nextTemp[r.id];
    r.fauna = nextFauna[r.id];
  }
}

function tickConditions(w: WorldState) {
  for (const r of w.regions) {
    if (!r.conditions) continue;
    for (const c of r.conditions) {
      CONDITIONS[c.id].tick?.(r);
      c.remaining--;
    }
    r.conditions = r.conditions.filter(c => c.remaining > 0);
  }
}

function inferConditions(w: WorldState) {
  for (const r of w.regions) {
    if (r.moisture < 22 && r.temperature > 55 && !hasCondition(r, 'droughted') && !hasCondition(r, 'seeded')) {
      applyCondition(r, 'droughted');
    }
    if (r.moisture > 88 && !hasCondition(r, 'flooded')) applyCondition(r, 'flooded', 2);
    if (r.pollution > 60 && !hasCondition(r, 'polluted_air')) applyCondition(r, 'polluted_air');
    if (r.prosperity > 45 && r.pollution > 35 && !hasCondition(r, 'unrest')) applyCondition(r, 'unrest');
    if (r.temperature > 78 && !hasCondition(r, 'heatwave')) applyCondition(r, 'heatwave', 2);
    if (r.fauna < 18 && !hasCondition(r, 'migratory_collapse')) applyCondition(r, 'migratory_collapse');
  }
}

export function nextTurn(w: WorldState, machine: MachineDef | null, region: RegionState | null): TurnResult {
  const before = {
    harmony: w.harmony, climate: w.climate, nature: w.nature,
    humans: w.humans, tectonics: w.tectonics, pollution: w.pollution,
  };
  const diff = DIFFICULTIES[w.difficulty];
  const phase = phaseForEra(w.era, w.totalEras);

  // --- 1. Machine effect + passives + upgrades ---
  let deltas: string[] = [];
  if (machine) {
    const adjustAfter: Array<() => void> = [];
    if (region) {
      const p = passiveOf(region.id);
      if (p?.id === 'sunseared' && (machine.id === 'rain' || machine.id === 'seeder' || machine.id === 'storm')) {
        adjustAfter.push(() => { region.moisture = clamp(region.moisture + 6); });
      }
      if (p?.id === 'stoneheart' && machine.id === 'magma') {
        adjustAfter.push(() => { region.flora = clamp(region.flora + 4); });
      }
      if (p?.id === 'forgeborn' && machine.id === 'magma') {
        adjustAfter.push(() => { region.tectonic = clamp(region.tectonic - 12); });
      }
    }
    if (region && hasUpgrade(w, 'upg_purity') && machine.id === 'purifier') {
      adjustAfter.push(() => {
        region.pollution = clamp(region.pollution - 6);
        for (const nid of neighboursOf(region.id)) {
          const n = w.regions.find(x => x.id === nid); if (n) n.pollution = clamp(n.pollution - 3);
        }
      });
    }
    if (region && hasUpgrade(w, 'upg_roots') && (machine.id === 'root' || machine.id === 'bloom')) {
      adjustAfter.push(() => { applyCondition(region, 'fertile', 4); });
    }
    if (hasUpgrade(w, 'upg_bulwark') && (machine.id === 'magma' || machine.id === 'lullaby')) {
      adjustAfter.push(() => { w.regions.forEach(r => { r.tectonic = clamp(r.tectonic - 2); }); });
    }
    if (region && hasUpgrade(w, 'upg_harvest') && (machine.id === 'peace' || machine.id === 'ember')) {
      adjustAfter.push(() => { region.prosperity = clamp(region.prosperity + 4); region.pollution = clamp(region.pollution - 3); });
    }

    deltas = applyMachine(w, machine, region);
    adjustAfter.forEach(fn => fn());

    if (machine.cooldown) w.machineCooldowns[machine.id] = machine.cooldown;
    w.energy = Math.max(0, w.energy - machine.cost);
  }

  // --- 2. Synergies ---
  const synergyMsgs = machine ? evaluateSynergies({
    w, region, machineId: machine.id,
    lastMachineId: w.lastMachineId, lastRegionId: w.lastRegionId,
  }) : [];

  w.lastMachineId = machine?.id ?? null;
  w.lastRegionId = region?.id ?? null;

  for (const k of Object.keys(w.machineCooldowns)) {
    w.machineCooldowns[k] = Math.max(0, w.machineCooldowns[k] - 1);
  }

  tickConditions(w);

  // --- 3. Natural drift ---
  const pollMul = diff.pollutionMul * phase.pollutionMul;
  const tectMul = diff.tectonicMul  * phase.tectonicMul;
  const restlessCore = w.worldTraits.includes('restless_core');
  const fragileAtmo  = w.worldTraits.includes('fragile_atmosphere');

  for (const r of w.regions) {
    const baseMoist = r.terrain === 'desert' ? 20 : r.terrain === 'water' ? 95 : r.terrain === 'jungle' ? 80 : r.terrain === 'tundra' ? 55 : 50;
    const baseTemp = r.terrain === 'desert' ? 80 : r.terrain === 'tundra' ? 20 : r.terrain === 'volcanic' ? 70 : 50;
    const climateRate = fragileAtmo ? 0.06 : 0.08;
    r.moisture = clamp(r.moisture + (baseMoist - r.moisture) * climateRate + (Math.random() - 0.5) * 4);
    r.temperature = clamp(r.temperature + (baseTemp - r.temperature) * (climateRate * 0.62) + (Math.random() - 0.5) * 3);
    const floraDelta = (r.moisture - 40) * 0.04 - Math.max(0, r.temperature - 75) * 0.3 - r.pollution * 0.04;
    r.flora = clamp(r.flora + floraDelta);
    r.fauna = clamp(r.fauna + (r.flora - r.fauna) * 0.05 - r.pollution * 0.03);
    if (r.prosperity > 5) {
      const growth = (r.flora * 0.02 + (50 - Math.abs(r.temperature - 50)) * 0.02) - r.pollution * 0.04 - r.tectonic * 0.02;
      r.prosperity = clamp(r.prosperity + growth);
    }
    r.pollution = clamp(r.pollution + r.prosperity * 0.04 * pollMul - 1);
    const tectBase = restlessCore ? 1.4 : 1;
    r.tectonic = clamp(r.tectonic + (1 + Math.random() * 1.5) * tectMul * tectBase);
    if (Math.random() < 0.5) r.flag = null;
    if (r.cooldown > 0) r.cooldown--;
  }

  applyRegionPassives(w);
  applyAdjacencySpread(w);
  inferConditions(w);

  recomputeAggregates(w);

  // --- 4. Events ---
  const triggered: TurnResult['triggeredEvents'] = [];
  const alerts: string[] = [];
  const maxEvents = phase.eventMul > 1.1 ? 3 : 2;
  const tries = 4;
  for (let i = 0; i < tries; i++) {
    const candidate = pickEvent(w, phase.eventMul * diff.eventSeverityMul);
    if (!candidate) break;
    const region = candidate.scope === 'region' ? pickEligibleRegion(w, candidate) : undefined;
    if (candidate.scope === 'region' && !region) continue;
    if (region && hasCondition(region, 'recovering') && Math.random() < 0.5) continue;

    const alert = candidate.fire(w, region);
    if (alert) {
      triggered.push({ evt: candidate, region, alert });
      alerts.push(alert);
      if (candidate.severity === 'danger' && region) {
        if (candidate.id === 'volcano') applyCondition(region, 'fractured', 5);
        if (candidate.id === 'drought') applyCondition(region, 'droughted');
        if (candidate.id === 'flood') applyCondition(region, 'flooded');
        if (candidate.id === 'oceandie') applyCondition(region, 'migratory_collapse');
      }
      if (triggered.length >= maxEvents) break;
    }
  }

  recomputeAggregates(w);

  // --- 5. Grant energy ---
  w.energy = Math.min(w.energyMax, w.energy + w.energyPerTurn);

  // --- 6. Trends ---
  w.trends = {
    climate: w.climate - before.climate,
    nature: w.nature - before.nature,
    humans: w.humans - before.humans,
    tectonics: w.tectonics - before.tectonics,
    pollution: w.pollution - before.pollution,
    harmony: w.harmony - before.harmony,
  };

  // --- 7. Summary ---
  const summary = buildSummary(w, before, synergyMsgs, alerts);
  w.lastSummary = summary;

  w.era++;
  w.history.push({ era: w.era, harmony: w.harmony });

  // --- 8. Upgrade offer ---
  let upgradeOffered: number | undefined;
  const offer = UPGRADE_OFFERS.find(o => o.era === w.era && !w.upgrades.some(u => u === o.left.grantsFlag || u === o.right.grantsFlag));
  if (offer) { w.pendingUpgradeEra = offer.era; upgradeOffered = offer.era; }

  // --- 9. Win / lose ---
  let result: TurnResult['result'] = 'continue';
  if (w.harmony <= HARMONY_LOSS_THRESHOLD) result = 'lose';
  else if (!w.endless && w.era > w.totalEras) result = w.harmony >= HARMONY_WIN_THRESHOLD ? 'win' : 'lose';

  return { alerts, deltas, triggeredEvents: triggered, synergies: synergyMsgs, summary, result, upgradeOffered };
}

function pickEvent(w: WorldState, eventMul: number): EventDef | null {
  const candidates = EVENTS.filter(e => {
    if (e.scope === 'region') return w.regions.some(r => e.canFire(w, r));
    return e.canFire(w);
  });
  if (!candidates.length) return null;
  const total = candidates.reduce((s, e) => s + e.weight * eventMul, 0);
  let r = Math.random() * total;
  for (const c of candidates) { r -= c.weight * eventMul; if (r <= 0) return c; }
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
  const cd = (w.machineCooldowns[m.id] || 0) <= 0;
  const affordable = w.energy >= m.cost;
  return cd && affordable;
}

export function canAfford(w: WorldState, m: MachineDef): boolean {
  return w.energy >= m.cost;
}

function buildSummary(
  w: WorldState,
  before: { harmony: number; climate: number; nature: number; humans: number; tectonics: number; pollution: number },
  synergies: string[],
  events: string[],
): TurnSummary {
  const deltas = [
    { label: 'Climate',   delta: w.climate   - before.climate,   good: true  },
    { label: 'Nature',    delta: w.nature    - before.nature,    good: true  },
    { label: 'Humans',    delta: w.humans    - before.humans,    good: true  },
    { label: 'Tectonics', delta: w.tectonics - before.tectonics, good: false },
    { label: 'Pollution', delta: w.pollution - before.pollution, good: false },
  ];
  const scored = deltas.map(d => ({ ...d, score: d.good ? d.delta : -d.delta }));
  const topGain = scored.filter(s => s.score > 0.5).sort((a, b) => b.score - a.score)[0];
  const topLoss = scored.filter(s => s.score < -0.5).sort((a, b) => a.score - b.score)[0];
  return {
    era: w.era,
    harmonyDelta: w.harmony - before.harmony,
    topGain: topGain ? { label: topGain.label, delta: topGain.delta } : null,
    topLoss: topLoss ? { label: topLoss.label, delta: topLoss.delta } : null,
    riskRegions: riskRegions(w),
    synergies,
    events,
  };
}

export function applyUpgrade(w: WorldState, flag: string) {
  if (!w.upgrades.includes(flag)) w.upgrades.push(flag);
  w.pendingUpgradeEra = undefined;
}

export function adjacencyOf(id: string): string[] {
  return ADJACENCY[id as keyof typeof ADJACENCY] ?? [];
}
