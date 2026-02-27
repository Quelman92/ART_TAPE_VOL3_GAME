import Phaser from 'phaser';
import { ARCADE_FONT, ASSET_BASE } from './constants';
import {
  fetchTracklist,
  getUnlockedTrackCount,
  isTrackUnlockedByIndex,
  type TracklistManifest,
  type TrackDef
} from './storyMode';

export class StoryModeTrackSelectScene extends Phaser.Scene {
  private tracklist: TracklistManifest | null = null;
  private menuTexts: Phaser.GameObjects.Text[] = [];
  private selectedIndex = 0;
  private tracks: TrackDef[] = [];
  private unlockedCount = 0;

  constructor() {
    super({ key: 'StoryModeTrackSelectScene' });
  }

  preload(): void {
    this.load.image('selectBg', `${ASSET_BASE}assets/select.png`);
  }

  create(): void {
    this.input.enabled = true;

    const w = this.scale.width;
    const h = this.scale.height;
    const bg = this.add.image(w / 2, h / 2, 'selectBg');
    bg.setDisplaySize(w, h);
    bg.setOrigin(0.5, 0.5);
    bg.setDepth(-100);

    this.cameras.main.setBackgroundColor('#0a0a0f');

    const centerX = this.scale.width / 2;

    const blocker = this.children.getByName('overlayBlocker');
    if (blocker) blocker.destroy(true);

    this.children.list.forEach((obj) => {
      const anyObj = obj as Phaser.GameObjects.GameObject & {
        input?: unknown;
        getBounds?: () => Phaser.Geom.Rectangle;
        disableInteractive?: () => void;
      };
      if (anyObj.input && typeof anyObj.getBounds === 'function') {
        const b = anyObj.getBounds();
        const covers =
          b.width >= this.scale.width * 0.95 && b.height >= this.scale.height * 0.95;
        if (covers && anyObj.disableInteractive) anyObj.disableInteractive();
      }
    });

    const mainMenuBtn = this.add
      .text(this.scale.width / 2, this.scale.height - 50, 'MAIN MENU', {
        fontSize: '16px',
        color: '#ffffff',
        fontFamily: ARCADE_FONT
      })
      .setOrigin(0.5);
    mainMenuBtn.setInteractive({ useHandCursor: true });
    mainMenuBtn.setDepth(100000);
    mainMenuBtn.setScrollFactor(0);
    mainMenuBtn.on('pointerover', () => mainMenuBtn.setColor('#ff4444'));
    mainMenuBtn.on('pointerout', () => mainMenuBtn.setColor('#ffffff'));
    mainMenuBtn.on('pointerdown', () => {
      this.input.enabled = false;
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        window.location.reload();
      });
    });

    this.add
      .text(centerX, this.scale.height * 0.12, 'SELECT TRACK', {
        fontSize: '16px',
        color: '#ff0000',
        fontFamily: ARCADE_FONT
      })
      .setOrigin(0.5, 0.5)
      .setDepth(1000);

    fetchTracklist()
      .then((list) => {
        this.tracklist = list;
        this.tracks = list.tracks;
        this.unlockedCount = getUnlockedTrackCount(this.tracks);
        this.renderTracks();
        this.setSelection(0);
        this.setupKeyboard();
      })
      .catch(() => {
        this.add
          .text(centerX, this.scale.height / 2, 'Could not load tracks', {
            fontSize: '12px',
            color: '#cc6666',
            fontFamily: ARCADE_FONT
          })
          .setOrigin(0.5, 0.5);
      });
  }

  private renderTracks(): void {
    const centerX = this.scale.width / 2;
    const startY = this.scale.height * 0.22;
    const lineHeight = 52;
    const boxWidth = this.scale.width * 0.88;
    const boxHeight = 44;
    const boxColor = 0x333344;
    const boxAlpha = 0.9;

    this.tracks.forEach((track, i) => {
      const y = startY + i * lineHeight;
      const unlocked = isTrackUnlockedByIndex(i, this.unlockedCount);
      const box = this.add
        .rectangle(centerX, y, boxWidth, boxHeight, boxColor, boxAlpha)
        .setDepth(999);
      const label = unlocked
        ? `${track.title} · ${track.bpm} BPM`
        : `LOCKED — get ${track.unlockScore} score`;
      const text = this.add
        .text(centerX, y, label, {
          fontSize: '12px',
          color: unlocked ? '#cccccc' : '#555555',
          fontFamily: ARCADE_FONT
        })
        .setOrigin(0.5, 0.5)
        .setDepth(1000);

      if (unlocked) {
        const zone = this.add
          .rectangle(centerX, y, boxWidth, boxHeight, 0x000000, 0)
          .setDepth(1001)
          .setInteractive({ useHandCursor: true });
        zone.on('pointerover', () => this.setSelection(i));
        zone.on('pointerdown', () => this.activate(i));
      }

      this.menuTexts.push(text);
    });
  }

  private setSelection(index: number): void {
    if (index < 0 || index >= this.tracks.length) return;
    if (!isTrackUnlockedByIndex(index, this.unlockedCount)) return;
    this.selectedIndex = index;
    this.menuTexts.forEach((t, i) => {
      const unlocked = isTrackUnlockedByIndex(i, this.unlockedCount);
      t.setColor(unlocked && i === index ? '#ff4444' : unlocked ? '#cccccc' : '#555555');
      t.setScale(unlocked && i === index ? 1.1 : 1);
    });
  }

  private activate(index: number): void {
    if (!this.tracklist || !isTrackUnlockedByIndex(index, this.unlockedCount)) return;
    const track = this.tracks[index];
    const tracklist = this.tracklist;
    this.input.enabled = false;
    this.menuTexts.forEach((t) => t.removeAllListeners());
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('LoadingScene', { track, tracklist });
    });
  }

  private setupKeyboard(): void {
    const cursors = this.input.keyboard!.createCursorKeys();
    const enterKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    if (cursors.down) {
      cursors.down.on('down', () => {
        let next = (this.selectedIndex + 1) % this.tracks.length;
        while (next !== this.selectedIndex && !isTrackUnlockedByIndex(next, this.unlockedCount)) {
          next = (next + 1) % this.tracks.length;
        }
        if (isTrackUnlockedByIndex(next, this.unlockedCount)) this.setSelection(next);
      });
    }
    if (cursors.up) {
      cursors.up.on('down', () => {
        let next = (this.selectedIndex - 1 + this.tracks.length) % this.tracks.length;
        while (next !== this.selectedIndex && !isTrackUnlockedByIndex(next, this.unlockedCount)) {
          next = (next - 1 + this.tracks.length) % this.tracks.length;
        }
        if (isTrackUnlockedByIndex(next, this.unlockedCount)) this.setSelection(next);
      });
    }
    enterKey.on('down', () => this.activate(this.selectedIndex));
  }
}
