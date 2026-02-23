import Phaser from 'phaser';
import { ASSET_BASE } from './constants';

/**
 * Loads the title background once at game boot so it's always in the texture
 * cache before TitleScene runs. Avoids intermittent missing image on refresh.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    this.load.video('mainBgVideo', `${ASSET_BASE}assets/longbg/main.MP4`);
    this.load.image('titleOverlay', `${ASSET_BASE}assets/title.png`);
    this.load.image('pretitle', `${ASSET_BASE}assets/pretitle.png`);
    this.load.audio('titleBgm', `${ASSET_BASE}assets/arttapev3/tracks/title.WAV`);
  }

  create(): void {
    // Restore saved volume from localStorage so options persist after reload
    const music = parseFloat(localStorage.getItem('lumines_musicVolume') ?? '0.5');
    const sound = parseFloat(localStorage.getItem('lumines_soundVolume') ?? '0.5');
    this.registry.set('musicVolume', Number.isFinite(music) && music >= 0 && music <= 1 ? music : 0.5);
    this.registry.set('soundVolume', Number.isFinite(sound) && sound >= 0 && sound <= 1 ? sound : 0.5);

    // Wait for the title font to load so "ART TAPE VOLUME 3" and all text use Press Start 2P
    // from the first frame (no flash of wrong font, and canvas text picks up the correct font).
    const fontSpec = '24px "Press Start 2P"';
    if (
      typeof document !== 'undefined' &&
      document.fonts &&
      typeof document.fonts.load === 'function'
    ) {
      document.fonts
        .load(fontSpec)
        .then(() => this.scene.start('PretitleScene'))
        .catch(() => this.scene.start('PretitleScene'));
    } else {
      this.scene.start('PretitleScene');
    }
  }
}
