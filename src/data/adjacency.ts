// Region-to-region adjacency graph.
// Used by the simulation for pollution drift, fauna migration,
// moisture pressure balancing, heat/fire stress propagation, and
// coastal influence from The Deep.

export type RegionId =
  | 'north_wilds' | 'iron_peaks' | 'sunlands' | 'verdant'
  | 'lowlands' | 'green_isle' | 'ashen' | 'deep_sea';

/**
 * Each region lists its geographic neighbours.
 * The Deep (ocean) touches every landmass (coastal). Ashen & Iron Peaks share
 * a volcanic-mountain border. Verdant & Lowlands are a vast continental
 * corridor. Green Isles are archipelagos in the south ocean.
 */
export const ADJACENCY: Record<RegionId, RegionId[]> = {
  north_wilds: ['iron_peaks', 'sunlands', 'deep_sea'],
  iron_peaks:  ['north_wilds', 'ashen', 'green_isle', 'deep_sea'],
  sunlands:    ['north_wilds', 'verdant', 'deep_sea'],
  verdant:     ['sunlands', 'lowlands', 'deep_sea'],
  lowlands:    ['verdant', 'green_isle', 'deep_sea'],
  green_isle:  ['lowlands', 'iron_peaks', 'ashen', 'deep_sea'],
  ashen:       ['iron_peaks', 'green_isle', 'deep_sea'],
  deep_sea:    ['north_wilds', 'iron_peaks', 'sunlands', 'verdant', 'lowlands', 'green_isle', 'ashen'],
};

export function neighboursOf(id: string): RegionId[] {
  return (ADJACENCY as Record<string, RegionId[]>)[id] ?? [];
}

export function areAdjacent(a: string, b: string): boolean {
  return neighboursOf(a).includes(b as RegionId);
}

/** Regions that are "coastal" — directly adjacent to The Deep. */
export function isCoastal(id: string): boolean {
  return areAdjacent(id, 'deep_sea');
}
