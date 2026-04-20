// Persistent global state across scenes (settings, current run, etc.)
import type { WorldState } from './data/data';

export const Settings = {
  music: true,
  sfx: true,
};

export const Game = {
  world: undefined as WorldState | undefined,
};
