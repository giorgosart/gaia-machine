# Planetary Engine

A divine strategy simulation built with **Phaser 3 + TypeScript + Vite**. You play a celestial operator tending Earth as a great living machine across 20 eras. All artwork is generated procedurally in code, and all music & sound effects are synthesised at runtime via the Web Audio API — there are **zero external asset files**, so the build is self-contained and works offline.

## Run locally

```bash
npm install
npm run dev      # development server on http://localhost:5173
npm run build    # production build into ./dist
npm run preview  # preview the production build
```

A modern desktop browser (Chrome, Firefox, Safari, Edge) at ~1600×900 or larger is recommended; the canvas auto-fits smaller windows.

## Controls

- **Mouse** — pick machines, target regions, click buttons
- **ESC / P** — pause
- **ENTER / SPACE** — confirm action

## Systems summary

- **5 Global Stats:** Climate, Nature, Humans, Tectonics, Pollution. Each is a 0–100 readout aggregated from the 8 regions.
- **8 Regions:** Northern Wilds, Iron Peaks, Sunlands, Verdant Reach, The Lowlands, Emerald Isles, Ashen Reach, The Deep — each with terrain-driven baselines for moisture, temperature, flora, fauna, prosperity, pollution and tectonic pressure.
- **6 Machines:** Rain Engine, Magma Valve, Bloom Engine, Wind Array, Purifier Grid, Peace Resonator — each with a primary benefit, situational downside, region or global targeting, unlock era and optional cooldown.
- **10+ Events:** drought, industrial expansion, migratory collapse, volcanic awakening, fungal bloom, ocean die-off, heatwave, flash floods, civil unrest, miraculous recovery, tectonic stress rising — selected each turn from a weighted pool of currently-eligible events.
- **Harmony score** combines climate balance, nature, humans (with diminishing returns) and stress (pollution + tectonics).
- **Win:** reach Era 20 with Harmony ≥ 50%. **Lose:** Harmony ≤ 15%, or final era with Harmony below 50%.

## Project structure

```
src/
  main.ts                 # Phaser game bootstrap
  config.ts               # Theme tokens, colour palette, constants
  state.ts                # Settings + current run state
  audio/AudioEngine.ts    # WebAudio synth for music + SFX
  assets/textures.ts      # Procedural canvas textures (panels, icons, world, regions)
  data/data.ts            # Machine, region & event definitions
  sim/Simulation.ts       # Turn resolution, harmony, event picker
  ui/Components.ts        # ThemedButton, StatMeter, floaters, rune ring
  scenes/
    BootScene.ts
    PreloadScene.ts       # Generates all textures
    MainMenuScene.ts      # Themed observatory main menu
    GameScene.ts          # Full gameplay UI
    PauseScene.ts         # Themed pause overlay
    HelpScene.ts          # How to Play modal
    EndScene.ts           # Win / lose screen
```

Adding new content is data-driven — edit `src/data/data.ts` to add machines, regions or events.
