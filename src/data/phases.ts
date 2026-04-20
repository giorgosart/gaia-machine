// Era phases: the 20-era run is split into named stewardship ages
// that shift event pools and simulation pressure.

export interface PhaseDef {
  id: string;
  name: string;
  desc: string;
  /** Inclusive era range within a 20-era run (scaled for endless). */
  from: number;
  to: number;
  /** Multiplies natural pollution growth per turn. */
  pollutionMul: number;
  /** Multiplies natural tectonic pressure growth per turn. */
  tectonicMul: number;
  /** Multiplies event weights (bigger = more events fire). */
  eventMul: number;
}

export const PHASES: PhaseDef[] = [
  { id: 'early',      name: 'Early Stewardship', from: 1,  to: 4,  pollutionMul: 0.8, tectonicMul: 0.9, eventMul: 0.8,
    desc: 'A young world, gentle and forgiving. Systems drift slowly; events are rare.' },
  { id: 'industrial', name: 'Industrial Expansion', from: 5, to: 9, pollutionMul: 1.15, tectonicMul: 1.0, eventMul: 1.0,
    desc: 'Human hands reach further. Pollution grows faster as cities spread.' },
  { id: 'strain',     name: 'Age of Strain', from: 10, to: 13, pollutionMul: 1.25, tectonicMul: 1.15, eventMul: 1.2,
    desc: 'The world groans under accumulated pressure. More events. Tectonics rise.' },
  { id: 'instability',name: 'Great Instability', from: 14, to: 17, pollutionMul: 1.15, tectonicMul: 1.3, eventMul: 1.35,
    desc: 'Climate swings grow sharper. Disasters cluster.' },
  { id: 'final',      name: 'Final Stewardship', from: 18, to: 20, pollutionMul: 1.0, tectonicMul: 1.1, eventMul: 1.1,
    desc: 'The twilight eras. What remains must be held together until the last turn.' },
];

/** Returns the phase active during the given era. Endless mode cycles beyond 20. */
export function phaseForEra(era: number, totalEras: number): PhaseDef {
  // In endless mode, scale by totalEras so phases still cover the run.
  const scale = 20 / Math.max(1, totalEras);
  const e = Math.min(20, Math.max(1, Math.round(era * scale)));
  for (const p of PHASES) {
    if (e >= p.from && e <= p.to) return p;
  }
  return PHASES[PHASES.length - 1];
}
