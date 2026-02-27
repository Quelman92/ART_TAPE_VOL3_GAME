import Phaser from 'phaser';
import { BootScene } from './game/BootScene';
import { PretitleScene } from './game/PretitleScene';
import { TitleScene } from './game/TitleScene';
import { LoadingScene } from './game/LoadingScene';
import { GameScene } from './game/GameScene';
import { OptionsScene } from './game/OptionsScene';
import { StoryModeTrackSelectScene } from './game/StoryModeTrackSelectScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  backgroundColor: '#05060a',
  fps: {
    target: 60,
    forceSetTimeOut: false
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.Center.CENTER_BOTH,
    width: 480,
    height: 800,
    max: { width: 1920, height: 3200 }
  },
  physics: {
    default: 'arcade'
  },
  scene: [BootScene, PretitleScene, TitleScene, StoryModeTrackSelectScene, LoadingScene, GameScene, OptionsScene]
};

const game = new Phaser.Game(config);

// Keep canvas fitted on resize and orientation change (all phones/tablets)
function refreshScale(): void {
  game.scale.refresh();
}
if (typeof window !== 'undefined') {
  window.addEventListener('resize', refreshScale);
  window.addEventListener('orientationchange', () => {
    setTimeout(refreshScale, 100);
  });
}

