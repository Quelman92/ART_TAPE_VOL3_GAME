import Phaser from 'phaser';
import { ARCADE_FONT } from './constants';

const TITLE = 'ART TAPE VOLUME 3';
const MENU_OPTIONS = ['ART TAPE VOLUME 3', 'ARCADE MODE', 'OPTIONS'];

export class TitleScene extends Phaser.Scene {
  private menuTexts: Phaser.GameObjects.Text[] = [];
  private selectedIndex = 0;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private enterKey!: Phaser.Input.Keyboard.Key;
  private titleBgm: Phaser.Sound.BaseSound | null = null;
  private muted = false;
  private muteButton: Phaser.GameObjects.Text | null = null;

  constructor() {
    super({ key: 'TitleScene' });
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#0a0a0f');

    // Play title.WAV (from assets/tracks) on main menu. Retry on first tap/keypress if browser blocks autoplay.
    const startTitleBgm = (): void => {
      if (!this.cache.audio.exists('titleBgm')) {
        console.warn('titleBgm audio not found in cache, retrying...');
        // Retry after a short delay in case it's still loading
        this.time.delayedCall(200, startTitleBgm);
        return;
      }
      try {
        if (!this.titleBgm) {
          const vol = this.registry.get('musicVolume', 0.5) as number;
          this.titleBgm = this.sound.add('titleBgm', { loop: true, volume: vol });
        }
        if (this.titleBgm && !this.titleBgm.isPlaying) {
          this.titleBgm.play();
          console.log('titleBgm started playing');
        }
      } catch (error) {
        console.error('Error playing titleBgm:', error);
        // Retry on error
        this.time.delayedCall(500, startTitleBgm);
      }
    };
    
    // Try to start immediately when scene creates
    startTitleBgm();
    
    // Also try after a short delay to ensure everything is ready
    this.time.delayedCall(300, startTitleBgm);
    
    // Retry on any user interaction (mouse, touch, keyboard) - browsers often block autoplay
    this.input.once('pointerdown', () => {
      console.log('User interaction detected, starting titleBgm');
      startTitleBgm();
    });
    this.input.keyboard?.once('keydown', () => {
      console.log('Keyboard input detected, starting titleBgm');
      startTitleBgm();
    });
    
    // Also try when scene becomes active (in case it wasn't ready on create)
    this.events.once('wake', startTitleBgm);
    
    // Try on any pointer move as well (some browsers need this)
    this.input.once('pointermove', startTitleBgm);

    const centerX = this.scale.width / 2;
    const w = this.scale.width;
    const h = this.scale.height;

    const borderThick = 10;
    const screenBorder = this.add.graphics();
    screenBorder.lineStyle(borderThick, 0x000000, 1);
    screenBorder.strokeRect(borderThick / 2, borderThick / 2, w - borderThick, h - borderThick);
    screenBorder.setDepth(1000);

    // Area inside the border (video must fit here)
    const innerW = w - 2 * borderThick;
    const innerH = h - 2 * borderThick;

    if (this.cache.video.exists('mainBgVideo')) {
      const mainBgVideo = this.add.video(centerX, h / 2, 'mainBgVideo');
      mainBgVideo.setOrigin(0.5, 0.5);
      mainBgVideo.setDepth(-1);
      mainBgVideo.setMute(true);
      mainBgVideo.play(true);
      const fitVideoToScreen = (): void => {
        const v = mainBgVideo.video;
        if (!v || !v.videoWidth || !v.videoHeight) return;
        const vw = v.videoWidth;
        const vh = v.videoHeight;
        const fitScale = Math.min(innerW / vw, innerH / vh, 1);
        const scale = fitScale * 0.75;
        mainBgVideo.setDisplaySize(Math.floor(vw * scale), Math.floor(vh * scale));
      };
      const v = mainBgVideo.video;
      if (v) {
        if (v.videoWidth && v.videoHeight) fitVideoToScreen();
        else v.addEventListener('loadedmetadata', fitVideoToScreen);
      }
    }

    if (this.textures.exists('titleOverlay')) {
      const overlayY = h * 0.37;
      const overlayW = w * 0.7;
      const overlayH = h * 0.35;
      const overlay = this.add.image(centerX, overlayY, 'titleOverlay');
      overlay.setDisplaySize(overlayW, overlayH);
      overlay.setOrigin(0.5, 0.5);
      overlay.setAlpha(1);
      overlay.setDepth(0);
    }

    const titleY = this.scale.height * 0.15;

    this.add
      .text(centerX, titleY, TITLE, {
        fontSize: '24px',
        color: '#ffffff',
        fontFamily: ARCADE_FONT
      })
      .setOrigin(0.5, 0.5)
      .setLetterSpacing(2)
      .setDepth(10);

    const startY = this.scale.height * 0.62;
    const lineHeight = 56;

    MENU_OPTIONS.forEach((label, i) => {
      const y = startY + i * lineHeight;
      const text = this.add
        .text(centerX, y, label, {
          fontSize: '18px',
          color: '#888888',
          fontFamily: ARCADE_FONT
        })
        .setOrigin(0.5, 0.5)
        .setDepth(10)
        .setInteractive({ useHandCursor: true });

      text.on('pointerover', () => {
        this.setSelection(i);
      });
      text.on('pointerdown', () => {
        this.activate(i);
      });

      this.menuTexts.push(text);
    });

    this.setSelection(0);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.enterKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    if (this.cursors.down) {
      this.cursors.down.on('down', () => {
        this.setSelection((this.selectedIndex + 1) % MENU_OPTIONS.length);
      });
    }
    if (this.cursors.up) {
      this.cursors.up.on('down', () => {
        this.setSelection((this.selectedIndex - 1 + MENU_OPTIONS.length) % MENU_OPTIONS.length);
      });
    }
    this.enterKey.on('down', () => {
      this.activate(this.selectedIndex);
    });

    const bandcampUrl = 'https://museumquel.bandcamp.com/music';
    const bandcampText = this.add
      .text(centerX, h - 36, 'BANDCAMP', {
        fontSize: '14px',
        color: '#666666',
        fontFamily: ARCADE_FONT
      })
      .setOrigin(0.5, 0.5)
      .setDepth(10)
      .setInteractive(
        new Phaser.Geom.Rectangle(-100, -22, 200, 44),
        Phaser.Geom.Rectangle.Contains
      );
    bandcampText.on('pointerdown', () => {
      window.open(bandcampUrl, '_blank', 'noopener,noreferrer');
    });
    bandcampText.on('pointerover', () => bandcampText.setColor('#ff4444'));
    bandcampText.on('pointerout', () => bandcampText.setColor('#666666'));

    const muteX = w - 24;
    const muteY = 24;
    this.muteButton = this.add
      .text(muteX, muteY, 'MUTE', {
        fontSize: '10px',
        color: '#666666',
        fontFamily: ARCADE_FONT
      })
      .setOrigin(1, 0)
      .setDepth(10);

    const muteZoneW = 88;
    const muteZoneH = 44;
    const muteZone = this.add
      .rectangle(muteX - muteZoneW / 2, muteY + muteZoneH / 2, muteZoneW, muteZoneH)
      .setOrigin(0.5, 0.5)
      .setDepth(11)
      .setInteractive({ useHandCursor: true });
    muteZone.on('pointerdown', () => this.toggleMute());
    muteZone.on('pointerover', () => this.muteButton && this.muteButton.setColor('#ff4444'));
    muteZone.on('pointerout', () => this.muteButton && this.muteButton.setColor('#666666'));
  }

  private toggleMute(): void {
    this.muted = !this.muted;
    if (this.titleBgm) {
      this.titleBgm.setVolume(this.muted ? 0 : (this.registry.get('musicVolume', 0.5) as number));
    }
    if (this.muteButton) {
      this.muteButton.setText(this.muted ? 'UNMUTE' : 'MUTE');
    }
  }

  private setSelection(index: number): void {
    this.selectedIndex = index;
    this.menuTexts.forEach((t, i) => {
      t.setColor(i === index ? '#ff4444' : '#888888');
      t.setScale(i === index ? 1.1 : 1);
    });
  }

  private activate(index: number): void {
    this.input.enabled = false;
    this.menuTexts.forEach((t) => t.removeAllListeners());

    const key =
      index === 0
        ? 'StoryModeTrackSelectScene'
        : index === 1
          ? 'LoadingScene'
          : 'OptionsScene';

    if (this.titleBgm) {
      this.titleBgm.stop();
      this.titleBgm = null;
    }

    const fadeMs = 500;
    this.cameras.main.fadeOut(fadeMs, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      if (key === 'LoadingScene') {
        this.scene.start('LoadingScene', {});
      } else {
        this.scene.start(key);
      }
    });
  }

  shutdown(): void {
    if (this.titleBgm) {
      this.titleBgm.stop();
      this.titleBgm = null;
    }
  }
}
