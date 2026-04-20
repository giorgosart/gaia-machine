// Next-turn forecast: heuristic warnings about likely problems next era.
import type { RegionState, WorldState } from '../data/data';
import { hasCondition } from '../data/conditions';
import { phaseForEra } from '../data/phases';

export interface ForecastWarning {
  regionId: string | null;
  kind: 'quake' | 'drought' | 'flood' | 'pollution' | 'unrest' | 'heatwave' | 'migration' | 'calm';
  severity: 'info' | 'warn' | 'danger';
  message: string;
}

export function computeForecast(w: WorldState): ForecastWarning[] {
  const warnings: ForecastWarning[] = [];
  const phase = phaseForEra(w.era, w.totalEras);

  for (const r of w.regions) {
    const nextTect = r.tectonic + 2 * phase.tectonicMul;
    if (nextTect > 80) warnings.push({ regionId: r.id, kind: 'quake', severity: 'danger', message: `${r.name}: quake risk imminent` });
    else if (nextTect > 68) warnings.push({ regionId: r.id, kind: 'quake', severity: 'warn', message: `${r.name}: quake pressure rising` });

    if (r.moisture < 28 && r.temperature > 60 && !hasCondition(r, 'seeded')) {
      warnings.push({ regionId: r.id, kind: 'drought', severity: 'warn', message: `${r.name}: drought likely` });
    }
    if (r.moisture > 82) warnings.push({ regionId: r.id, kind: 'flood', severity: 'warn', message: `${r.name}: flood risk high` });
    if (r.pollution > 55) warnings.push({ regionId: r.id, kind: 'pollution', severity: r.pollution > 70 ? 'danger' : 'warn', message: `${r.name}: pollution crisis` });
    if (r.prosperity > 45 && r.pollution > 35) warnings.push({ regionId: r.id, kind: 'unrest', severity: 'warn', message: `${r.name}: civil unrest brewing` });
    if (r.temperature > 75) warnings.push({ regionId: r.id, kind: 'heatwave', severity: 'warn', message: `${r.name}: heatwave conditions` });
    if (r.fauna < 20 && r.flora < 35) warnings.push({ regionId: r.id, kind: 'migration', severity: 'info', message: `${r.name}: life collapsing` });
  }
  if (!warnings.length) warnings.push({ regionId: null, kind: 'calm', severity: 'info', message: 'The world breathes easy. No crises forecast.' });
  // cap
  return warnings.slice(0, 5);
}

export function riskRegions(w: WorldState): { id: string; reason: string }[] {
  const arr = w.regions.map((r: RegionState) => {
    let score = 0; const reasons: string[] = [];
    if (r.tectonic > 70) { score += r.tectonic; reasons.push('tectonic'); }
    if (r.pollution > 55) { score += r.pollution; reasons.push('pollution'); }
    if (r.moisture < 25) { score += 50; reasons.push('drought'); }
    if (r.moisture > 85) { score += 40; reasons.push('flood'); }
    if (r.flora < 20) { score += 30; reasons.push('barren'); }
    return { id: r.id, name: r.name, score, reason: reasons.join(' · ') };
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score);
  return arr.slice(0, 3).map(x => ({ id: x.id, reason: `${x.name} — ${x.reason}` }));
}
