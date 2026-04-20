// Each region has one passive identity on top of its terrain.
// These are small, readable modifiers applied during natural drift
// and machine resolution.

export interface RegionPassive {
  id: string;
  name: string;
  desc: string;
}

export const REGION_PASSIVES: Record<string, RegionPassive> = {
  north_wilds: {
    id: 'frost_memory',
    name: 'Frost Memory',
    desc: 'Slow to pollute, slow to prosper. Pollution and human growth accrue at half rate.',
  },
  iron_peaks: {
    id: 'stoneheart',
    name: 'Stoneheart',
    desc: 'Venting magma here does not scorch as heavily — flora loss from the Magma Valve is halved.',
  },
  sunlands: {
    id: 'sunseared',
    name: 'Sunseared',
    desc: 'Rain lands harder in the dry sand — moisture from Rain Engine and Cloud Seeder is stronger.',
  },
  verdant: {
    id: 'deep_roots',
    name: 'Deep Roots',
    desc: 'Baseline flora runs +6 higher and resists heat damage.',
  },
  lowlands: {
    id: 'restless_hands',
    name: 'Restless Hands',
    desc: 'Prosperity and pollution both grow +50% faster here.',
  },
  green_isle: {
    id: 'tidebound',
    name: 'Tidebound',
    desc: 'Fauna recovery is stronger, but floods strike more easily.',
  },
  ashen: {
    id: 'forgeborn',
    name: 'Forgeborn',
    desc: 'Tectonic pressure rises faster, but every vent releases +40% more pressure.',
  },
  deep_sea: {
    id: 'cradle_of_tides',
    name: 'Cradle of Tides',
    desc: 'When The Deep is healthy, coastal regions gain climate stability and shed pollution slightly.',
  },
};

export function passiveOf(regionId: string): RegionPassive | undefined {
  return REGION_PASSIVES[regionId];
}
