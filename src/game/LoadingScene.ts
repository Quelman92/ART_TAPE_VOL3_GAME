import Phaser from 'phaser';
import { ARCADE_FONT, ASSET_BASE } from './constants';

/**
 * Loading scene that shows progress while GameScene assets load.
 * Displays a loading bar and percentage to give user feedback.
 */
export class LoadingScene extends Phaser.Scene {
  private progressBar!: Phaser.GameObjects.Graphics;
  private progressBarBg!: Phaser.GameObjects.Graphics;
  private progressText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'LoadingScene' });
  }

  preload(): void {
    this.cameras.main.setBackgroundColor('#05060a');

    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    // Create progress UI before loading starts
    this.add
      .text(centerX, centerY - 60, 'LOADING...', {
        fontSize: '24px',
        color: '#ffffff',
        fontFamily: ARCADE_FONT
      })
      .setOrigin(0.5, 0.5);

    const barWidth = this.scale.width * 0.6;
    const barHeight = 20;
    const barX = centerX - barWidth / 2;
    const barY = centerY + 20;

    this.progressBarBg = this.add.graphics();
    this.progressBarBg.fillStyle(0x333333, 1);
    this.progressBarBg.fillRect(barX, barY, barWidth, barHeight);

    this.progressBar = this.add.graphics();

    this.progressText = this.add
      .text(centerX, barY + barHeight + 20, '0%', {
        fontSize: '14px',
        color: '#888888',
        fontFamily: ARCADE_FONT
      })
      .setOrigin(0.5, 0.5);

    this.load.on('progress', (value: number) => {
      this.updateProgress(value);
    });

    this.load.on('complete', () => {
      this.time.delayedCall(200, () => {
        this.cameras.main.fadeOut(300, 0, 0, 0);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
          const data = (this.scene.settings.data as { track?: any; tracklist?: any }) ?? {};
          this.scene.start('ArcadeModeScene', data);
        });
      });
    });

    this.loadGameAssets();
  }

  create(): void {
    // Progress UI and loading already done in preload
  }

  private loadGameAssets(): void {
    const b = ASSET_BASE;
    const ARCADE_BG_KEYS = [
      'bg1', 'bg18', 'bg22', 'IMG_4549', 'IMG_4550', 'IMG_4551', 'IMG_4552', 'IMG_4553',
      'IMG_4554', 'IMG_4555', 'IMG_4557', 'IMG_4558', 'IMG_4559', 'IMG_4560', 'IMG_4561',
      'IMG_4562', 'IMG_4563', 'IMG_4564', 'IMG_4565', 'IMG_4566', 'IMG_4567', 'IMG_4568',
      'IMG_4569', 'IMG_4570', 'IMG_4571', 'IMG_4572', 'IMG_4573'
    ];
    const TRACK_BG_FILES: Record<number, string[]> = {
      1: ['bg7', 'bg8', 'bg15', 'bg19', 'bg23'],
      2: ['bg27', 'bg32', 'bg33', 'bg34', 'bg36'],
      3: ['bg12', 'bg16', 'bg29', 'bg31', 'bg35'],
      4: ['bg13', 'bg14', 'bg20', 'bg37', 'bg9'],
      5: ['bg2', 'bg21', 'bg24', 'bg26', 'bg4'],
      6: ['bg10', 'bg11', 'bg28', 'bg30', 'IMG_4537'],
      7: ['IMG_4533', 'IMG_4534', 'IMG_4535', 'IMG_4536', 'bg3'],
      8: ['IMG_4532', 'IMG_4538', 'IMG_4540', 'bg17', 'bg6'],
      9: ['IMG_4539', 'IMG_4541', 'IMG_4542', 'IMG_4543', 'bg5'],
      10: []
    };

    for (let i = 1; i <= 10; i++) {
      this.load.image(`stage${i}`, `${b}assets/longbg/stage${i}.JPG`);
    }
    this.load.image('arcadeStage1', `${b}assets/longbg/IMG_4462.JPG`);
    this.load.image('arcadeStage2', `${b}assets/longbg/IMG_4544.JPG`);
    this.load.image('arcadeStage3', `${b}assets/longbg/IMG_4547.JPG`);
    this.load.image('arcadeStage4', `${b}assets/longbg/IMG_4548.JPG`);
    for (const key of ARCADE_BG_KEYS) {
      this.load.image(key, `${b}assets/backgrounds/${key}.JPG`);
    }
    this.load.video('track1_touched', `${b}assets/backgrounds/track1/touched.mp4`, true);
    for (let t = 1; t <= 9; t++) {
      const files = TRACK_BG_FILES[t];
      const folder = `track${t}`;
      for (const f of files) {
        this.load.image(`track${t}_${f}`, `${b}assets/backgrounds/${folder}/${f}.JPG`);
      }
    }
    this.load.image('arrowLeft', `${b}assets/arrows/left.jpg`);
    this.load.image('arrowRight', `${b}assets/arrows/right.jpg`);
    this.load.image('arrowDown', `${b}assets/arrows/down.jpg`);
    this.load.image('arrowAction', `${b}assets/arrows/action.PNG`);
    this.load.audio('combo1', `${b}assets/arttapev3/combo/COMBO1.WAV`);
    this.load.audio('combo2', `${b}assets/arttapev3/combo/COMBO2.WAV`);
    this.load.audio('combo3', `${b}assets/arttapev3/combo/COMBO3.WAV`);
    this.load.audio('combo4', `${b}assets/arttapev3/combo/COMBO4.WAV`);
    this.load.audio('arcade0', `${b}assets/arttapev3/arcade/arcade.WAV`);
    this.load.audio('arcade1', `${b}assets/arttapev3/arcade/arcade1.WAV`);
    this.load.audio('arcade2', `${b}assets/arttapev3/arcade/arcade2.WAV`);
    this.load.audio('arcade3', `${b}assets/arttapev3/arcade/arcade3.WAV`);
    this.load.audio('arcade4', `${b}assets/arttapev3/arcade/arcade4.WAV`);
    this.load.audio('arcade5', `${b}assets/arttapev3/arcade/arcade5.WAV`);
    this.load.audio('arcade6', `${b}assets/arttapev3/arcade/arcade6.WAV`);
    this.load.audio('arcade7', `${b}assets/arttapev3/arcade/EXPlus.WAV`);
    this.load.audio('arcade8', `${b}assets/arttapev3/arcade/MTHEME.WAV`);
  }

  private updateProgress(value: number): void {
    const barWidth = this.scale.width * 0.6;
    const barHeight = 20;
    const centerX = this.scale.width / 2;
    const barX = centerX - barWidth / 2;
    const barY = this.scale.height / 2 + 20;

    this.progressBar.clear();
    this.progressBar.fillStyle(0xff4444, 1);
    this.progressBar.fillRect(barX, barY, barWidth * value, barHeight);

    const percent = Math.round(value * 100);
    this.progressText.setText(`${percent}%`);
  }
}
