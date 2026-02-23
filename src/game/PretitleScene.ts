import Phaser from 'phaser';
import { ARCADE_FONT } from './constants';

/**
 * Opening credit: pretitle image centered on black, then fade to main title.
 */
export class PretitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PretitleScene' });
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#000000');

    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    const img = this.add
      .image(centerX, centerY, 'pretitle')
      .setOrigin(0.5, 0.5);

    const maxW = this.scale.width * 0.9;
    const maxH = this.scale.height * 0.7;
    const scale = Math.min(maxW / img.width, maxH / img.height, 1);
    img.setDisplaySize(img.width * scale, img.height * scale);

    const gamesY = centerY + img.displayHeight / 2 - 56;
    this.add
      .text(centerX, gamesY, 'GAMES', {
        fontSize: '14px',
        color: '#ffffff',
        fontFamily: ARCADE_FONT
      })
      .setOrigin(0.5, 0);

    const goToTitle = (): void => {
      this.input.off('pointerdown');
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.scene.start('TitleScene');
      });
    };

    // Only the timer advances to main menu; clicks are ignored so nothing goes wrong
    this.time.delayedCall(1000, goToTitle);
  }
}
