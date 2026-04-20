import Phaser from 'phaser';
import { FONTS, HEX, VH, VW } from '../config';
import { ThemedButton } from '../ui/Components';

export class HelpScene extends Phaser.Scene {
  fromScene = 'MainMenu';
  private page = 0;
  private pageGroup: Phaser.GameObjects.Group | null = null;
  private pageIndicator!: Phaser.GameObjects.Text;
  constructor() { super('Help'); }

  init(data: { from: string }) { this.fromScene = data?.from ?? 'MainMenu'; }

  create() {
    this.add.rectangle(VW / 2, VH / 2, VW, VH, 0x000000, 0.7).setInteractive();
    this.add.image(VW / 2, VH / 2, 'panel-modal');

    this.add.text(VW / 2, VH / 2 - 260, 'HOW TO PLAY', {
      fontFamily: FONTS.title, fontSize: '36px', color: HEX.gold,
      stroke: '#000', strokeThickness: 4, letterSpacing: 6 as any,
    }).setOrigin(0.5);

    this.pageIndicator = this.add.text(VW / 2, VH / 2 - 220, '', {
      fontFamily: FONTS.ui, fontSize: '13px', color: HEX.textDim,
    }).setOrigin(0.5);

    new ThemedButton(this, {
      x: VW / 2 - 220, y: VH / 2 + 260, text: '◀ Prev', textureKey: 'btn-small',
      onClick: () => this.showPage(this.page - 1),
    });
    new ThemedButton(this, {
      x: VW / 2 + 220, y: VH / 2 + 260, text: 'Next ▶', textureKey: 'btn-small',
      onClick: () => this.showPage(this.page + 1),
    });
    new ThemedButton(this, {
      x: VW / 2, y: VH / 2 + 260, text: 'Return',
      onClick: () => this.close(),
    });

    this.input.keyboard?.on('keydown-ESC', () => this.close());
    this.input.keyboard?.on('keydown-LEFT', () => this.showPage(this.page - 1));
    this.input.keyboard?.on('keydown-RIGHT', () => this.showPage(this.page + 1));
    this.showPage(0);
  }

  private pages: [string, [string, string][]][] = [
    ['BASICS', [
      ['Objective', 'Survive 20 eras while keeping Planetary Harmony above 50%. Drop to 15% or below and the world unspools.'],
      ['A Turn', 'Each era you pick ONE machine, optionally a region, then press Confirm. The world then drifts, spreads, reacts, and hands you the next era.'],
      ['Divine Energy', 'Every action costs 1–3 crystals. You regenerate 2 per era (cap 4). You cannot spam a single lever — plan trade-offs.'],
      ['Top Stats', 'Climate, Nature, Humans, Tectonics and Pollution summarise the planet. Harmony is derived from them.'],
      ['Controls', 'Mouse to play · ESC / P pause · ENTER or SPACE confirm · ←/→ flip these pages.'],
    ]],
    ['REGIONS & ADJACENCY', [
      ['Interconnection', 'Every region drifts, but neighbours bleed into each other: pollution seeps, moisture balances, heat waves spill, fauna migrate toward richer land.'],
      ['Adjacency', 'The Deep Sea touches every landmass. Jungles border deserts and plains; tundra joins the polar north. Effects ripple.'],
      ['Region Passives', 'Every region has a signature — Ironback Spires hoard tectonic pressure, Sunbraid Dunes devour moisture, Verdant Deep amplifies flora, and so on.'],
      ['Conditions', 'Droughted, flooded, unrest, polluted air, heatwave, blooming, rooted, seeded, fertile, recovering — stamped by the sim or by certain machines and ticked each era. Badges appear on the map.'],
    ]],
    ['MACHINES', [
      ['Basic (Era 1)', 'Rain Catalyst, Magma Valve, Bloom Engine, Wind Shear Array, Purifier Grid, Peace Resonator — the six foundational levers.'],
      ['Storm & Solar (Era 2)', 'Storm Lattice seeds rain across adjacent coasts. Solar Lens focuses heat and drought onto one region — dangerous but decisive.'],
      ['Root & Tide (Era 3)', 'Root Network binds flora and stabilises neighbours. Tide Engine averages moisture between coastal regions.'],
      ['Ember & Relay (Era 4)', 'Ember Forge lifts human prosperity at a pollution cost. Fauna Relay migrates wildlife between regions.'],
      ['Cloud Seeder (Era 5)', 'Schedules rain on a delay, protecting a chosen region from drought for several eras.'],
      ['Core Lullaby (Era 6)', 'Globally calms tectonic pressure — expensive but civilisation-saving late in a run.'],
    ]],
    ['SYSTEMS', [
      ['Synergies', 'Back-to-back combos trigger effects: magma then bloom (ash fertility), rain on a hot region (monsoon), purifier on wetlands (living filter), tide + healthy deep (coastal balance), etc.'],
      ['Era Phases', 'Early Stewardship → Industrial Expansion → Age of Strain → Great Instability → Final Stewardship. Later phases amplify pollution, tectonics and event frequency.'],
      ['Upgrades', 'At Era 7 and Era 14 you pick between two permanent doctrines: Purity vs Roots, then Bulwark vs Harvest. These modify how some of your machines behave.'],
      ['Forecast', 'The forecast panel (bottom-right) shows the active phase and the top risks for the next era — use it before you spend energy.'],
      ['Turn Summary', 'After Confirm, a floating summary shows harmony delta, top gain/loss, triggered synergies and watchlist regions.'],
    ]],
    ['RUN SETUP', [
      ['Difficulty', 'Steward (generous), Harsh (baseline challenge), Dying World (start at 55% harmony, faster decay) — picked on the Begin a New Age screen.'],
      ['Scenarios', 'Standard · Restless Core (tectonics amplified) · Drowning Isles (sea rises) · Industrial Miracle (humans advanced, pollution already high) · The Last Forest (only one healthy biome left).'],
      ['World Traits', 'Scenarios apply traits like Restless Core, Fragile Atmosphere, Ancient Forest. Traits bias drift and events.'],
      ['Endless Mode', 'Toggle Endless to remove the era cap. Phases cycle and pressures compound — the run only ends when harmony falls.'],
    ]],
    ['TIPS', [
      ['Read the Badges', 'Condition glyphs on a region tell you what\'s actively shaping it this turn. Droughted + hot + low flora = impending collapse.'],
      ['Don\'t Over-Rain', 'Flooding, unrest, and pollution are all adjacency problems — hitting one region hard affects its neighbours next era.'],
      ['Save Energy', 'Energy caps at 4. Saving up enables chained global actions (Purifier + Lullaby) during crises.'],
      ['Plan for Phases', 'Industrial Expansion inflates pollution; Great Instability inflates tectonics. Build up buffers before you hit each phase.'],
      ['Synergy Over Power', 'A weaker machine used in the right sequence often beats a stronger one used alone.'],
    ]],
  ];

  private showPage(p: number) {
    const n = this.pages.length;
    this.page = ((p % n) + n) % n;
    if (this.pageGroup) this.pageGroup.destroy(true);
    this.pageGroup = this.add.group();
    const [title, entries] = this.pages[this.page];
    this.pageIndicator.setText(`${title}  (${this.page + 1} / ${n})`);
    let y = VH / 2 - 175;
    for (const [t, b] of entries) {
      const tt = this.add.text(VW / 2 - 400, y, t, { fontFamily: FONTS.title, fontSize: '16px', color: HEX.bronzeLight }).setOrigin(0, 0);
      const bb = this.add.text(VW / 2 - 240, y, b, {
        fontFamily: FONTS.ui, fontSize: '14px', color: HEX.text,
        wordWrap: { width: 640 }, lineSpacing: 3,
      }).setOrigin(0, 0);
      this.pageGroup.add(tt); this.pageGroup.add(bb);
      y += Math.max(40, bb.height + 12);
    }
  }

  close() {
    this.scene.stop();
    this.scene.resume(this.fromScene);
  }
}
