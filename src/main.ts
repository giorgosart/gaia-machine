import Phaser from 'phaser';
import { VW, VH, COLORS } from './config';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { GameScene } from './scenes/GameScene';
import { PauseScene } from './scenes/PauseScene';
import { HelpScene } from './scenes/HelpScene';
import { EndScene } from './scenes/EndScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  width: VW,
  height: VH,
  backgroundColor: COLORS.bgDeep,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: { antialias: true, pixelArt: false },
  scene: [BootScene, PreloadScene, MainMenuScene, GameScene, PauseScene, HelpScene, EndScene],
};

new Phaser.Game(config);
