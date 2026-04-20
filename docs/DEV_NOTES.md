# Developer Notes — Planetary Engine

High-level architecture for the v2 simulation systems, intended to help anyone
extending the game (new machines, regions, conditions, traits, scenarios).

## Module Map

```
src/
  config.ts              — colours, fonts, VW/VH, harmony thresholds, ERAS_TOTAL
  state.ts               — Settings + Game (current WorldState)
  main.ts                — Phaser game config, scene list
  assets/textures.ts     — procedural texture generators (zero external art)
  audio/AudioEngine.ts   — procedural audio (WebAudio)
  ui/Components.ts       — ThemedButton, StatMeter, ambient effects, floaters

  data/                  — pure data + simulation helpers (no Phaser deps)
    data.ts              — MACHINES, REGIONS, EVENTS, RegionState, WorldState,
                           MachineDef, EventDef, TurnSummary
    adjacency.ts         — region neighbour graph
    conditions.ts        — CONDITIONS map + tick hooks, hasCondition / applyCondition
    passives.ts          — REGION_PASSIVES (signature per region)
    phases.ts            — PHASES table + phaseForEra()
    traits.ts            — DIFFICULTIES, SCENARIOS, WORLD_TRAITS, UPGRADE_OFFERS
    synergies.ts         — evaluateSynergies() (combo detection)

  sim/
    Simulation.ts        — createWorld, nextTurn, recomputeAggregates, …
    forecast.ts          — computeForecast + riskRegions

  scenes/                — Phaser scenes
    BootScene, PreloadScene, MainMenuScene, RunSetupScene,
    GameScene, PauseScene, HelpScene, EndScene
```

## Turn Pipeline (`nextTurn`)

1. **Machine effect** — `applyMachine()` runs the machine's `apply()`. Passive
   interaction hooks and upgrade flags layer adjustments *before and after*.
2. **Synergies** — `evaluateSynergies({ w, region, machineId, lastMachineId, lastRegionId })`
   returns an array of messages. `w.lastMachineId` / `lastRegionId` are then
   updated for the *next* turn's lookback.
3. **Cooldowns tick** — all non-zero cooldowns decrement by 1.
4. **Conditions tick** — each region's active conditions run their `tick(r)`
   hook and decrement `remaining`; expired ones are filtered out.
5. **Natural drift** — temperature, moisture, flora, fauna, prosperity,
   pollution, tectonics drift toward their terrain baselines. Rates are
   multiplied by the active `PhaseDef` and the active `DifficultyMode`, and
   further biased by world traits (restless_core → +tectonic, fragile_atmosphere
   → slower climate self-correction).
6. **Region passives** — `applyRegionPassives()` switches on each region's
   passive id to apply its signature effect.
7. **Adjacency spread** — pollution drift, moisture balance, heat bleed, and
   fauna migration all run via a snapshot → apply pattern so the
   computation is order-independent.
8. **Condition inference** — auto-stamps droughted / flooded / polluted_air /
   unrest / heatwave / migratory_collapse based on threshold checks.
9. **Aggregate recompute** — top-bar stats and harmony.
10. **Events** — `pickEvent()` weighted by phase × difficulty multipliers;
    up to 2–3 per era. `recovering` halves danger event chance on a region.
    Danger events may stamp a follow-up condition (volcano → fractured).
11. **Energy** — `w.energy = min(cap, energy + perTurn)`.
12. **Trend delta** — before/after snapshot for the UI.
13. **Summary + upgrade offer + win/lose** — `buildSummary()` uses
    `riskRegions()` from `forecast.ts` to populate the watchlist.

## Adding a New Machine

1. Import any passive/condition helpers you need in `data/data.ts`.
2. Append a new entry to `MACHINES`:
   ```ts
   {
     id: 'my_id',
     name: 'My Machine',
     desc: '...',
     target: 'region' | 'global',
     iconKey: 'icon-my_id',
     accent: '#hex',
     unlockEra: 1..6,
     cost: 1..3,
     cooldown: 0..4,
     preview: 'what-it-does',
     downside: 'what-it-risks',
     apply(r, w) { ...mutate r / w.regions...; return ['delta', 'delta']; },
   }
   ```
3. In `assets/textures.ts`:
   - Add the id to the `IconKind` union.
   - Add a `my_id()` case in `makeIcon`'s `draw` object drawing with canvas.
   - Add the id to the `generateAllAssets` icon list so the texture is built.
4. If the machine should stamp a condition, call `applyCondition(region, 'id')`
   inside `applyMachine()` in `sim/Simulation.ts`.
5. If it should interact with a passive or upgrade, add a branch in the
   `adjustAfter` list at the top of `nextTurn()`.
6. Optional: add a combo to `data/synergies.ts`.

## Adding a New Condition

1. Append to the `ConditionId` union in `data/conditions.ts`.
2. Add a `CONDITIONS['id']` entry with `name`, `desc`, `glyph`, `color`,
   optional `tick(r)`, optional `duration`.
3. The badge texture is generated automatically in
   `textures.ts::generateAllAssets` (it iterates `Object.keys(CONDITIONS)`).
4. Either auto-infer in `sim/Simulation.ts::inferConditions()` or stamp
   directly from a machine / event.

## Adding a New Region

1. Add to `REGIONS` in `data/data.ts` (id, name, terrain, continent anchor,
   `init` seed values).
2. Add a passive entry in `data/passives.ts::REGION_PASSIVES` and a switch
   case in `applyRegionPassives()` in `sim/Simulation.ts`.
3. Add to `ADJACENCY` in `data/adjacency.ts` (bidirectional).
4. Update `textures.ts` continent polygon/shape logic so the region can be
   clicked.

## Adding a New Scenario

1. Append a `ScenarioDef` to `SCENARIOS` in `data/traits.ts` with `id`,
   `name`, `desc`, `difficulty` (default), `traits` (list of world trait ids),
   optional `setup(w)` to pre-seed state.
2. The RunSetup scene will pick it up automatically.

## Adding a World Trait

1. Append a `WorldTraitDef` to `WORLD_TRAITS` in `data/traits.ts` with
   optional `setup(w)` and an optional `tick(w)` if it needs per-turn work.
2. Reference its id from inside `nextTurn()` for any flow-level interactions
   (e.g. `w.worldTraits.includes('my_trait')`).

## Design Principles

- **Pure data** separated from Phaser; easy to unit-test.
- **No magic stat copy** — aggregates are recomputed from regions every turn.
- **Adjacency first** — region-to-region effects are a core source of drama.
- **Persistent condition tags** — replace one-turn `flag` storytelling with
  multi-era state the player can see and plan around.
- **Visible economy** — every action costs divine energy, so doing nothing is
  sometimes correct.
- **Phase-modulated pressure** — the world gets more dangerous the deeper
  you go; this is what makes Era 20 feel like a climax.

## Build & Run

```bash
npm install
npm run dev        # Vite dev server at localhost:5173
npm run build      # production bundle to dist/
npx tsc --noEmit   # type-check only
```

All art and audio are generated procedurally at boot. The only external
runtime dependencies are `phaser` and the Vite dev toolchain.
