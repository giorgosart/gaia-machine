// Run setup: pick difficulty + scenario + endless before starting a run.
import Phaser from 'phaser';
import { audio } from '../audio/AudioEngine';
import { COLORS, FONTS, HEX, VH, VW } from '../config';
import { DIFFICULTIES, SCENARIOS, type DifficultyMode } from '../data/traits';
import { Game } from '../state';
import { ThemedButton, spawnAmbientBubbles, spawnStarShimmer } from '../ui/Components';

type DiffId = DifficultyMode['id'];

export class RunSetupScene extends Phaser.Scene {
  private chosenDifficulty: DiffId = 'steward';
  private chosenScenario = 'standard';
  private endless = false;
  private diffButtons: Record<string, ThemedButton> = {};
  private scenButtons: Record<string, ThemedButton> = {};
  private endlessBtn!: ThemedButton;
  private desc!: Phaser.GameObjects.Text;

  constructor() { super('RunSetup'); }

  create() {
    this.add.image(VW / 2, VH / 2, 'bg-stars').setDisplaySize(VW, VH);
    spawnStarShimmer(this, VW, VH);
    spawnAmbientBubbles(this, VW, VH);

    this.add.text(VW / 2, 80, 'BEGIN A NEW AGE', {
      fontFamily: FONTS.title, fontSize: '44px', color: HEX.gold,
      stroke: '#000', strokeThickness: 3, letterSpacing: 4 as any,
    }).setOrigin(0.5);
    this.add.text(VW / 2, 130, 'Choose difficulty, world, and run length.', {
      fontFamily: FONTS.ui, fontSize: '16px', color: HEX.textDim,
    }).setOrigin(0.5);

    // --- Difficulty ---
    this.add.text(VW / 2, 190, 'DIFFICULTY', {
      fontFamily: FONTS.title, fontSize: '18px', color: HEX.bronzeLight, letterSpacing: 3 as any,
    }).setOrigin(0.5);
    const diffs = Object.values(DIFFICULTIES);
    const diffGap = 240;
    diffs.forEach((d, i) => {
      const x = VW / 2 + (i - 1) * diffGap;
      const btn = new ThemedButton(this, {
        x, y: 240, text: d.name, textureKey: 'btn-small',
        onClick: () => { this.chosenDifficulty = d.id; this.refresh(); },
      });
      this.diffButtons[d.id] = btn;
    });

    // --- Scenario ---
    this.add.text(VW / 2, 310, 'SCENARIO', {
      fontFamily: FONTS.title, fontSize: '18px', color: HEX.bronzeLight, letterSpacing: 3 as any,
    }).setOrigin(0.5);
    const cols = 3;
    SCENARIOS.forEach((s, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = VW / 2 + (col - 1) * 260;
      const y = 360 + row * 70;
      const btn = new ThemedButton(this, {
        x, y, text: s.name, textureKey: 'btn-small',
        onClick: () => { this.chosenScenario = s.id; this.refresh(); },
      });
      this.scenButtons[s.id] = btn;
    });

    // --- Endless toggle ---
    this.endlessBtn = new ThemedButton(this, {
      x: VW / 2, y: 560, text: 'Endless: OFF', textureKey: 'btn-small',
      onClick: () => { this.endless = !this.endless; this.refresh(); },
    });

    // --- Description panel ---
    this.desc = this.add.text(VW / 2, 620, '', {
      fontFamily: FONTS.ui, fontSize: '15px', color: HEX.text, align: 'center',
      wordWrap: { width: 800 }, lineSpacing: 4,
    }).setOrigin(0.5, 0);

    // --- Actions ---
    new ThemedButton(this, {
      x: VW / 2 - 180, y: VH - 60, text: 'Back',
      onClick: () => { audio.click(); this.scene.start('MainMenu'); },
    });
    new ThemedButton(this, {
      x: VW / 2 + 180, y: VH - 60, text: 'Begin',
      onClick: () => this.begin(),
    });

    this.refresh();
  }

  private refresh() {
    Object.entries(this.diffButtons).forEach(([id, btn]) => {
      btn.setLabel((id === this.chosenDifficulty ? '▶ ' : '') + DIFFICULTIES[id as DiffId].name);
    });
    Object.entries(this.scenButtons).forEach(([id, btn]) => {
      const s = SCENARIOS.find(x => x.id === id)!;
      btn.setLabel((id === this.chosenScenario ? '▶ ' : '') + s.name);
    });
    this.endlessBtn.setLabel(`Endless: ${this.endless ? 'ON' : 'OFF'}`);

    const d = DIFFICULTIES[this.chosenDifficulty];
    const s = SCENARIOS.find(x => x.id === this.chosenScenario)!;
    const diffLine = `${d.name} — ${d.desc}`;
    const scenLine = `${s.name} — ${s.desc}`;
    const endlessLine = this.endless
      ? 'Endless: no era cap; difficulty escalates. No "win" banner — survive as long as you can.'
      : `Standard: ${s.difficulty !== this.chosenDifficulty ? 'this scenario recommends ' + DIFFICULTIES[s.difficulty].name + '.' : 'reach Era 20 with Harmony ≥ 50.'}`;
    const traitLine = s.traits.length ? `World traits: ${s.traits.join(', ')}` : '';
    this.desc.setText([diffLine, scenLine, traitLine, endlessLine].filter(Boolean).join('\n'));
    // decorate colour
    this.desc.setColor(d.id === 'dying' ? HEX.warn : HEX.text);
    void COLORS;
  }

  private begin() {
    audio.confirm();
    Game.world = undefined;
    this.scene.start('Game', {
      difficulty: this.chosenDifficulty,
      scenarioId: this.chosenScenario,
      endless: this.endless,
    });
  }
}
