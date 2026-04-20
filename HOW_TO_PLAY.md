# How to Play — Planetary Engine

You are the caretaker of a living world. Each turn ("era") you choose **one**
machine to deploy — either on a specific region or globally — spend **Divine
Energy** for the privilege, and then the planet simulates the consequences:
conditions tick, neighbours bleed into each other, region passives express
themselves, events fire, and the forecast re-computes. Your goal is to keep
**Harmony** high until the age of stewardship ends.

> New since v2: adjacency, persistent regional conditions, a Divine Energy
> economy, 8 new machines, 5 era phases, region passives, world traits,
> branching upgrades, scenarios, difficulty modes, and an endless mode.

## Win / Lose

| Condition | Outcome |
|---|---|
| Reach **Era 20** (standard) with **Harmony ≥ 50** | Victory |
| Reach Era 20 with Harmony < 50 | Defeat |
| **Harmony ≤ 15** at any point | Instant defeat |
| **Endless mode** | No era cap — play until Harmony falls |

Harmony starts at 75 (Steward), 65 (Harsh), or 55 (Dying World).

## Run Setup

Hit **Start Game** on the main menu to open **Begin a New Age**.

### Difficulty
| Mode | Start Harmony | Pollution drift | Tectonic drift | Events | Energy / era |
|---|---|---|---|---|---|
| **Steward** | 75 | ×1.0 | ×1.0 | ×1.0 | 2 |
| **Harsh** | 65 | ×1.15 | ×1.15 | ×1.15 | 2 |
| **Dying World** | 55 | ×1.3 | ×1.3 | ×1.3 | 2 |

### Scenarios
Scenarios pre-seed the world and apply **World Traits**.

- **Standard** — balanced ancient Earth.
- **Restless Core** — tectonics elevated; quake events 1.5× weighted.
- **Drowning Isles** — seas are rising; coasts start flooded.
- **Industrial Miracle** — humans already prosperous, pollution already high.
- **The Last Forest** — only one biome still thrives; protect it.

### Endless Mode
Toggle it on to remove the era cap. Phases cycle, pressures compound, and
your only goal is to last as long as possible.

## A Turn

1. **Select a Machine** — click a card. Locked cards show their unlock era,
   and cards you can't afford show "low energy".
2. **Select a Region** — for region-target machines. A live **preview** of
   the machine's intended effect appears over the region.
3. **Confirm** — the machine fires and the world resolves:
   - machine effect + any synergy combo + region passive interaction
   - cooldowns tick, conditions tick & expire
   - natural drift (modulated by era phase and difficulty)
   - region passives express
   - **adjacency spread** — pollution / moisture / heat / fauna
   - conditions are inferred from the new state
   - events fire (weighted by phase & difficulty)
   - **Divine Energy** regenerates (+2, cap 4)
   - a **Turn Summary** appears with deltas, synergies, watch-regions
   - at Era 7 and Era 14 an **Upgrade Choice** is offered

## The Five Planetary Stats (top bar)

Each is averaged across all regions, 0–100.

| Stat | Want | Notes |
|---|---|---|
| Climate | High | Best when temperature ~50 and moisture ~55 |
| Nature | High | Flora-weighted; dies under pollution/heat |
| Humans | Moderate | Caps at 80 for harmony — diminishing returns |
| Tectonics | **Low** | High → quakes, lava events |
| Pollution | **Low** | Grows with prosperity, bleeds to neighbours |

Harmony is derived:

```
harmony ≈ ((climate + nature) / 2) * 0.6
        + min(humans, 80) * 0.2
        - (pollution * 0.6 + tectonics * 0.4) * 0.4
        + 10
```

## Divine Energy

The central resource. Every machine costs **1–3** energy. You regenerate 2
per era (cap 4). Cheap machines can fire every turn; costly ones force you
to save up. Dying World and some scenarios may shift regen.

| Machine Tier | Cost |
|---|---|
| Basic (Rain, Wind, Purifier, Bloom, Peace, Magma, Relay, Seeder, Solar) | 1 |
| Advanced (Storm, Root, Tide, Ember, Purifier Grid w/ upgrades) | 2 |
| Legendary (Core Lullaby) | 3 |

## The 14 Machines

### Era 1 — Foundational (6)
| # | Machine | Target | Effect | Risk |
|---|---|---|---|---|
| 1 | Rain Catalyst | Region | +moisture, gentle cool, flora bump | can flood |
| 2 | Magma Valve | Region | +tectonic vent, small temp spike | short-term tectonic spike |
| 3 | Bloom Engine | Region | +flora, +fauna | — |
| 4 | Wind Shear Array | Global | moves moisture, cools | thins some flora |
| 5 | Purifier Grid | Region | big pollution drop | — |
| 6 | Peace Resonator | Region | +prosperity, +unity | +pollution |

### Era 2 — Climate Tools
- **Storm Lattice** (region · 2E) — dumps rain on a region *and* its coastal neighbours.
- **Solar Lens** (region · 1E) — focuses heat: fast warming, dries moisture. Devastating on frozen regions.

### Era 3 — Living Networks
- **Root Network** (region · 2E) — stamps `rooted`, steady long-term flora and moisture retention, bleeds +flora to neighbours.
- **Tide Engine** (region · 2E) — averages moisture between the region and its coastal neighbours (great on drowning / droughted pairs).

### Era 4 — Civilisation
- **Ember Forge** (region · 2E) — +prosperity hard, but adds pollution (with Path of Harvest upgrade: less pollution cost).
- **Fauna Relay** (region · 1E) — gathers neighbours' fauna into a single region; used to save collapsing ecosystems.

### Era 5 — Stewardship
- **Cloud Seeder** (region · 1E) — stamps `seeded`, protecting a region from drought for several eras.

### Era 6 — Legendary
- **Core Lullaby** (global · 3E) — calms tectonics everywhere; expensive, long cooldown, essential for Restless Core runs.

## Region Passives

Each region has a permanent signature that expresses every era:

- **Frost Memory** (Northern Reach) — slowly bleeds off pollution; cold dampens prosperity.
- **Stoneheart** (Ironback Spires) — magma on Ironback produces flora rebound instead of burning it off.
- **Sunseared** (Sunbraid Dunes) — drinks moisture; rain/storm/seeder here get a bonus.
- **Deep Roots** (Verdant Deep) — +flora each era; thrives in heat.
- **Restless Hands** (Cradle Plains) — +prosperity and +pollution each era, regardless.
- **Tidebound** (Azure Shelf) — +fauna if moisture is high; moisture grows.
- **Forgeborn** (Ember Vale) — +tectonic each era; magma gives -12 tectonic as an offset.
- **Cradle of Tides** (The Deep) — when life thrives there, it gently heals every coastal region.

## Region Conditions

Persistent stamps shown as glyph badges under each region:

`☀ droughted` · `~ flooded` · `! unrest` · `✖ fractured` · `✿ blooming` ·
`☁ polluted_air` · `↯ migratory_collapse` · `▲ fertile` · `‼ heatwave` ·
`♻ recovering` · `≈ wetland` · `★ ash_fertility` · `♥ cultural_bloom` ·
`❖ rooted` · `✤ seeded`

Conditions tick each era, applying small ongoing effects, then expire. Many
are auto-applied when thresholds are crossed (drought = low moisture + heat);
some are stamped by specific machines (rooted, seeded, fertile).

## Adjacency

Every region has neighbours. Each era, four ripples run:

- **Pollution** drifts 6% toward the neighbour average (you cannot isolate a
  polluter; it poisons its neighbours).
- **Moisture** balances 5% toward the neighbour average.
- **Heat bleed** — if a neighbour is +18°C hotter, it cooks you +1.5.
- **Fauna migration** — animals move toward richer, cleaner land.

The **Deep Sea** is adjacent to all 7 landmasses and is the global conduit.

## Synergies (Combos)

Chain the right sequence or pair and the Engine rewards you:

| Combo | Trigger | Effect |
|---|---|---|
| Monsoon | Rain on a hot region | extra moisture + flora |
| Ash Fertility | Bloom the turn after magma in the same region | big flora spike |
| Wetland | Purifier on moisture > 70 | bonus pollution drop |
| Ash Wind | Wind the turn after magma | spreads ash, small pollution bump everywhere but flora up |
| Cultural Bloom | Peace on a thriving region (nature > 60) | double prosperity |
| Coastal Balance | Tide when the Deep is healthy | extra moisture balancing |
| Living Filter | Root the turn after purifier | permanent flora regrowth |

Synergy messages appear in the banner and the turn summary.

## Era Phases

20 eras split into:

1. **Early Stewardship** (1–4) — gentle, forgiving.
2. **Industrial Expansion** (5–9) — pollution drift ×1.15.
3. **Age of Strain** (10–13) — +pollution, +tectonic, +events.
4. **Great Instability** (14–17) — tectonic drift ×1.3.
5. **Final Stewardship** (18–20) — the twilight.

Endless mode cycles these by scaling your era to a 20-length phase map.

## Upgrades (Era 7 & 14)

At Era 7 the Engine asks you to choose:

- **Path of Purity** — Purifier Grid removes more pollution and shares a
  trickle with neighbours.
- **Path of Roots** — Root/Bloom leave longer-lasting flora bonuses.

At Era 14:

- **Path of Bulwark** — Magma + Lullaby calm tectonics more.
- **Path of Harvest** — Peace + Ember Forge lift prosperity with less pollution.

Picks are permanent for the run.

## Forecast Panel

Bottom-right. Shows:
- Active phase + its blurb
- Up to 3 of the top risks (quake, drought, flood, pollution, unrest,
  heatwave, migration collapse) predicted for the next era.

Use it before spending energy.

## Controls

| Input | Action |
|---|---|
| Mouse | Play |
| ESC / P | Pause |
| ENTER / SPACE | Confirm |
| ← / → | Flip help pages |

## Tips

- The forecast never lies — check it *before* you Confirm.
- Save energy for crises. Holding 4 lets you chain Purifier + Lullaby.
- Adjacency is a weapon *and* a curse. A single polluted region drags four
  neighbours down a little each era.
- Synergies almost always beat raw power. A Rain → Bloom after Magma chain
  outpaces just spamming Bloom.
- In Endless, every trait and condition matters more because pressures
  accumulate without a terminal era.
