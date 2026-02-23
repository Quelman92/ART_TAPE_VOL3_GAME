import Phaser from 'phaser';
import {
  ARCADE_FONT,
  ASSET_BASE,
  BOARD_HEIGHT,
  BOARD_MARGIN_TOP,
  CURRENT_PIECE_PREVIEW_HEIGHT,
  BOARD_WIDTH,
  CELL_HEIGHT,
  CELL_WIDTH,
  getBlockColors,
  getRandomArcadeColors,
  GRAVITY_INTERVAL_MS,
  GRID_COLS,
  GRID_ROWS,
  SPAWN_HOLD_MS,
  ARCADE_SWEEP_INTERVAL_MS,
  GRID_VIDEO_WIDTH_SCALE
} from './constants';
import { Grid } from './Grid';
import { Piece, createRandomPieceDefinition, type PieceDefinition } from './Piece';
import { InputController } from './InputController';
import { PreviewRenderer } from './PreviewRenderer';
import { SweepLine } from './SweepLine';
import { MatchFinder } from './MatchFinder';
import { Scoring } from './Scoring';
import type { GridCell } from './types';
import {
  beatMs as bpmBeatMs,
  BEATS_PER_SWEEP,
  gravityIntervalMs as bpmGravityMs,
  sweepIntervalMs as bpmSweepMs,
  setTotalScoreEver,
  tryUnlockNextTrack,
  getUnlockedTrackCount,
  type TrackDef,
  type TracklistManifest
} from './storyMode';

/** Track 1 optional intro video (priority first background); must be muted. File: assets/backgrounds/track1/touched.mp4 */
const TRACK1_VIDEO_KEY = 'track1_touched';

/** Per-track grid background filenames (no extension) in assets/backgrounds/trackN/ */
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
  10: [] // track 10: video from tracks folder is the only background
};

/** Arcade mode: grid backgrounds from root backgrounds folder (not in track folders). */
const ARCADE_BG_KEYS = [
  'bg1', 'bg18', 'bg22',
  'IMG_4549', 'IMG_4550', 'IMG_4551', 'IMG_4552', 'IMG_4553', 'IMG_4554', 'IMG_4555', 'IMG_4557', 'IMG_4558',
  'IMG_4559', 'IMG_4560', 'IMG_4561', 'IMG_4562', 'IMG_4563', 'IMG_4564', 'IMG_4565', 'IMG_4566', 'IMG_4567',
  'IMG_4567_2', 'IMG_4568', 'IMG_4569', 'IMG_4570', 'IMG_4571', 'IMG_4572', 'IMG_4573'
];

export class GameScene extends Phaser.Scene {
  private grid!: Grid;
  private piece: Piece | null = null;
  private graphics!: Phaser.GameObjects.Graphics;
  private inputController!: InputController;
  private sweep!: SweepLine;
  private matchFinder!: MatchFinder;
  private scoring!: Scoring;

  private dropTimerMs = 0;
  private scoreText!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private gameOver = false;
  private lastStrikeUsed = false;

  private boardOriginX = 0;
  private boardOriginY = BOARD_MARGIN_TOP;

  private nextQueue: PieceDefinition[] = [];
  private previewRenderer!: PreviewRenderer;
  private downKey: Phaser.Input.Keyboard.Key | null = null;
  private pieceCount = 0;
  private pieceSpawnTime = 0;

  private gravityIntervalMs = GRAVITY_INTERVAL_MS;
  private storyTrack: TrackDef | null = null;
  private storyTracklist: TracklistManifest | null = null;
  private tapToStartOverlay: Phaser.GameObjects.Container | null = null;
  private trackHudText: Phaser.GameObjects.Text | null = null;
  private storyMusic: Phaser.Sound.BaseSound | null = null;
  private levelComplete = false;

  /** Arcade only: next score threshold (2500, 5000, ...) for difficulty + background change. */
  private arcadeNextMilestone = 2500;
  /** Arcade only: next total score for grid background dissolve (1000, 2000, 3000, ...). */
  private arcadeBgNextMilestone = 1000;
  /** Art Tape Vol.3: next total score for grid background dissolve (1000, 2000, 3000, ...). */
  private storyBgNextMilestone = 1000;
  /** Grid background image (so we can dissolve to a new one on arcade level-up). */
  private gridBgImage: Phaser.GameObjects.Image | null = null;
  /** Track 1 only: intro video as first grid bg; when it ends, we dissolve to an image. Always muted. */
  private gridBgVideo: Phaser.GameObjects.Video | null = null;
  /** Track 1 video: loop once (play again) before dissolving; 1 = one more play left. */
  private gridBgVideoLoopsLeft = 1;
  /** Keys for current pool (track-specific in story, arcade pool in arcade). */
  private gridBgKeys: string[] = [];
  /** Arcade mode: random two-color palette for this run. */
  private arcadeBlockColors: number[] = [];

  private paused = false;
  private pauseBtn: Phaser.GameObjects.Text | null = null;
  private pauseBtnZone: Phaser.GameObjects.Rectangle | null = null;

  /** Combo sounds: play when cleared group has 6+/8+/10+/12+ cells; mapping randomized each game. */
  private comboThresholdToSound: Record<number, string> = {};
  /** Arcade only: rotating music with crossfade. Shuffled order for this session. */
  private arcadeMusicIndex = 0;
  private arcadePlayOrder: string[] = [];
  private arcadeCurrent: Phaser.Sound.BaseSound | null = null;
  private arcadeCrossfadeTimer: Phaser.Time.TimerEvent | null = null;

  constructor() {
    super({ key: 'ArcadeModeScene' });
  }

  /** Stage (long) background keys: stage1–stage10 for Art Tape tracks 1–10. */
  private static readonly STAGE_BG_KEYS = ['stage1', 'stage2', 'stage3', 'stage4', 'stage5', 'stage6', 'stage7', 'stage8', 'stage9', 'stage10'];
  /** Arcade mode: one of these four long backgrounds at random. */
  private static readonly ARCADE_STAGE_BG_KEYS = ['arcadeStage1', 'arcadeStage2', 'arcadeStage3', 'arcadeStage4'];

  preload(): void {
    const b = ASSET_BASE;
    for (let i = 1; i <= 10; i++) {
      this.load.image(`stage${i}`, `${b}assets/longbg/stage${i}.JPG`);
    }
    this.load.image('arcadeStage1', `${b}assets/longbg/IMG_4462.JPG`);
    this.load.image('arcadeStage2', `${b}assets/longbg/IMG_4544.JPG`);
    this.load.image('arcadeStage3', `${b}assets/longbg/IMG_4547.JPG`);
    this.load.image('arcadeStage4', `${b}assets/longbg/IMG_4548.JPG`);
    for (const key of ARCADE_BG_KEYS) {
      const file = key === 'IMG_4567_2' ? 'IMG_4567 2.JPG' : `${key}.JPG`;
      this.load.image(key, `${b}assets/backgrounds/${file}`);
    }
    this.load.video(TRACK1_VIDEO_KEY, `${b}assets/backgrounds/track1/touched.mp4`, true);
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

  create(): void {
    this.gameOver = false;
    this.lastStrikeUsed = false;
    this.levelComplete = false;
    this.dropTimerMs = 0;

    const data = (this.scene.settings.data as { track?: TrackDef; tracklist?: TracklistManifest }) ?? {};
    if (data.track) {
      this.storyTrack = data.track;
      this.storyTracklist = data.tracklist ?? null;
      const bpm = data.track.bpm;
      const beatMs = bpmBeatMs(bpm);
      const gravityMs = bpmGravityMs(bpm);
      const sweepDurationMs = beatMs * BEATS_PER_SWEEP;
      const sweepMs = bpmSweepMs(bpm, GRID_COLS);
      this.gravityIntervalMs = gravityMs;
      this.sweep = new SweepLine(sweepMs);
    } else {
      this.gravityIntervalMs = GRAVITY_INTERVAL_MS;
      this.sweep = new SweepLine(ARCADE_SWEEP_INTERVAL_MS);
      this.arcadeNextMilestone = 2500;
    }

    this.grid = new Grid();

    const w = this.scale.width;
    const h = this.scale.height;
    const boardWidth = BOARD_WIDTH;
    const boardHeight = BOARD_HEIGHT;
    this.boardOriginX = (w - boardWidth) / 2;
    this.boardOriginY = BOARD_MARGIN_TOP + CURRENT_PIECE_PREVIEW_HEIGHT;

    const trackNumForStage = this.storyTrack ? parseInt(this.storyTrack.id.replace('v3-', ''), 10) : 0;
    const stageBgKey = this.storyTrack
      ? (GameScene.STAGE_BG_KEYS[Math.min(trackNumForStage, 10) - 1] ?? 'stage1')
      : Phaser.Utils.Array.GetRandom(GameScene.ARCADE_STAGE_BG_KEYS);
    const stageBg = this.add.image(w / 2, h / 2, stageBgKey);
    stageBg.setDisplaySize(w, h);
    stageBg.setOrigin(0.5, 0.5);
    stageBg.setDepth(-200);

    const gridBlack = this.add.rectangle(
      this.boardOriginX + boardWidth / 2,
      this.boardOriginY + boardHeight / 2,
      boardWidth,
      boardHeight,
      0x000000,
      1
    );
    gridBlack.setDepth(-150);

    if (this.storyTrack) {
      const trackNum = parseInt(this.storyTrack.id.replace('v3-', ''), 10) as number;
      const files = TRACK_BG_FILES[trackNum] ?? TRACK_BG_FILES[1];
      this.gridBgKeys = files.map((f) => `track${trackNum}_${f}`);
    } else {
      this.gridBgKeys = [...ARCADE_BG_KEYS];
      this.arcadeBlockColors = getRandomArcadeColors();
    }

    const centerX = this.boardOriginX + boardWidth / 2;
    const centerY = this.boardOriginY + boardHeight / 2;
    const isTrack1WithVideo =
      this.storyTrack &&
      parseInt(this.storyTrack.id.replace('v3-', ''), 10) === 1 &&
      this.cache.video.exists(TRACK1_VIDEO_KEY);

    if (isTrack1WithVideo) {
      this.gridBgVideoLoopsLeft = 1;
      const video = this.add.video(centerX, centerY, TRACK1_VIDEO_KEY);
      const clampVideoToGrid = (): void => {
        video.setDisplaySize(boardWidth * GRID_VIDEO_WIDTH_SCALE, boardHeight);
      };
      video.setOrigin(0.5, 0.5);
      video.setAlpha(0.95);
      video.setDepth(-100);
      video.setMute(true);
      clampVideoToGrid();
      video.play();
      video.on('complete', () => {
        if (this.gridBgVideoLoopsLeft > 0) {
          this.gridBgVideoLoopsLeft--;
          video.setCurrentTime(0);
          video.play();
        } else {
          this.dissolveFromTrack1VideoToImage();
        }
      });
      const v = video.video;
      if (v) {
        v.addEventListener('loadedmetadata', clampVideoToGrid);
        v.addEventListener('loadeddata', clampVideoToGrid);
        v.addEventListener('playing', clampVideoToGrid);
      }
      this.gridBgVideo = video;
      this.gridBgImage = null;
    } else if (this.storyTrack && parseInt(this.storyTrack.id.replace('v3-', ''), 10) === 10) {
      this.gridBgImage = null;
    } else {
      const bgKey = this.gridBgKeys.length > 0
        ? Phaser.Utils.Array.GetRandom(this.gridBgKeys)
        : ARCADE_BG_KEYS[0];
      const bg = this.add.image(centerX, centerY, bgKey);
      bg.setDisplaySize(boardWidth, boardHeight);
      bg.setOrigin(0.5, 0.5);
      bg.setAlpha(0.95);
      bg.setDepth(-100);
      this.gridBgImage = bg;
    }

    this.graphics = this.add.graphics();
    this.inputController = new InputController(this, {
      onDownStep: () => this.tryStepDownOnce()
    });

    const kbd = this.input.keyboard;
    if (kbd) {
      this.downKey = kbd.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
      this.downKey.on('down', () => this.tryStepDownOnce());
    }
    this.events.once('shutdown', () => {
      this.downKey?.removeAllListeners();
      this.downKey = null;
      this.tapToStartOverlay?.destroy(true);
      this.tapToStartOverlay = null;
      this.pauseBtn?.destroy();
      this.pauseBtn = null;
      this.pauseBtnZone?.destroy();
      this.pauseBtnZone = null;
      if (this.gridBgVideo) {
        this.gridBgVideo.destroy();
        this.gridBgVideo = null;
      }
      this.cleanupArcadeMusic();
      this.cleanupStoryAudio();
    });
    if (this.storyTrack) {
      const escKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
      escKey.on('down', () => {
        if (!this.gameOver && !this.tapToStartOverlay && !this.levelComplete) {
          this.cleanupStoryAudio();
          this.scene.stop('ArcadeModeScene');
          this.scene.start('StoryModeTrackSelectScene');
        }
      });
    }
    this.matchFinder = new MatchFinder();
    this.scoring = new Scoring();

    const comboKeys = ['combo1', 'combo2', 'combo3', 'combo4'];
    const thresholds = [6, 8, 10, 12];
    Phaser.Utils.Array.Shuffle(comboKeys);
    this.comboThresholdToSound = {};
    thresholds.forEach((t, i) => {
      this.comboThresholdToSound[t] = comboKeys[i];
    });

    this.nextQueue = [];
    for (let i = 0; i < 3; i += 1) this.nextQueue.push(createRandomPieceDefinition());
    this.previewRenderer = new PreviewRenderer(
      this,
      this.boardOriginX,
      this.boardOriginY,
      boardWidth,
      boardHeight
    );

    this.createUi();
    this.updatePreviewPosition();

    if (this.storyTrack) {
      this.trackHudText = this.add
        .text(this.scale.width / 2, 56, `${this.storyTrack.title} · ${this.storyTrack.bpm} BPM`, {
          fontSize: '8px',
          color: '#aaaaaa',
          fontFamily: ARCADE_FONT
        })
        .setOrigin(0.5, 0.5)
        .setScrollFactor(0)
        .setDepth(20);

      const trackPath = `${ASSET_BASE}assets/arttapev3/tracks/${this.storyTrack.file}`;
      const isTrack10 = parseInt(this.storyTrack.id.replace('v3-', ''), 10) === 10;
      const isVideoTrack = isTrack10 || this.storyTrack.file.toLowerCase().endsWith('.mp4');

      if (isVideoTrack) {
        if (this.cache.video.exists('storyTrackVideo')) {
          this.cache.video.remove('storyTrackVideo');
        }
        this.load.video('storyTrackVideo', trackPath, false);
        this.load.once('complete', () => this.showTapToStart());
        this.load.start();
      } else {
        if (this.cache.audio.exists('storyTrack')) {
          this.cache.audio.remove('storyTrack');
        }
        this.load.audio('storyTrack', trackPath);
        this.load.once('complete', () => this.showTapToStart());
        this.load.start();
      }
    } else {
      this.startArcadeMusic();
      this.spawnNewPiece();
    }
  }

  private static readonly ARCADE_MUSIC_KEYS = ['arcade0', 'arcade1', 'arcade2', 'arcade3', 'arcade4', 'arcade5', 'arcade6', 'arcade7', 'arcade8'];

  private startArcadeMusic(): void {
    this.arcadePlayOrder = [...GameScene.ARCADE_MUSIC_KEYS];
    Phaser.Utils.Array.Shuffle(this.arcadePlayOrder);
    if (!this.cache.audio.exists(this.arcadePlayOrder[0])) return;
    this.arcadeMusicIndex = 0;
    const musicVol = this.registry.get('musicVolume', 0.5) as number;
    this.arcadeCurrent = this.sound.add(this.arcadePlayOrder[0], { loop: false, volume: musicVol });
    this.arcadeCurrent.play();
    this.scheduleNextArcadeCrossfade();
  }

  private scheduleNextArcadeCrossfade(): void {
    if (!this.arcadeCurrent || this.gameOver || this.levelComplete) return;
    const keys = this.arcadePlayOrder;
    const durSec = (this.arcadeCurrent as Phaser.Sound.WebAudioSound).duration;
    if (!durSec || durSec <= 0) {
      this.arcadeCurrent.once(Phaser.Sound.Events.COMPLETE, () => this.arcadeMusicComplete());
      return;
    }
    const fadeStartMs = Math.max(0, (durSec - 3) * 1000);
    this.arcadeCrossfadeTimer = this.time.delayedCall(fadeStartMs, () => {
      this.arcadeCrossfadeTimer = null;
      this.doArcadeCrossfade();
    });
  }

  private arcadeMusicComplete(): void {
    if (this.gameOver || this.levelComplete) return;
    this.arcadeCurrent?.destroy();
    this.arcadeCurrent = null;
    this.arcadeMusicIndex = (this.arcadeMusicIndex + 1) % this.arcadePlayOrder.length;
    const keys = this.arcadePlayOrder;
    const musicVol = this.registry.get('musicVolume', 0.5) as number;
    this.arcadeCurrent = this.sound.add(keys[this.arcadeMusicIndex], { loop: false, volume: musicVol });
    this.arcadeCurrent.play();
    this.arcadeCurrent.once(Phaser.Sound.Events.COMPLETE, () => this.arcadeMusicComplete());
  }

  private doArcadeCrossfade(): void {
    if (!this.arcadeCurrent || this.gameOver || this.levelComplete) return;
    const keys = this.arcadePlayOrder;
    const nextIndex = (this.arcadeMusicIndex + 1) % keys.length;
    const nextKey = keys[nextIndex];
    if (!this.cache.audio.exists(nextKey)) {
      this.arcadeCurrent.once(Phaser.Sound.Events.COMPLETE, () => this.arcadeMusicComplete());
      return;
    }
    const musicVol = this.registry.get('musicVolume', 0.5) as number;
    const nextSound = this.sound.add(nextKey, { loop: false, volume: 0 }) as Phaser.Sound.WebAudioSound;
    nextSound.play();
    const fadeMs = 2500;
    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: fadeMs / 1000,
      onUpdate: (t) => {
        const v = t.getValue();
        if (this.arcadeCurrent && 'setVolume' in this.arcadeCurrent) {
          (this.arcadeCurrent as Phaser.Sound.WebAudioSound).setVolume(musicVol * (1 - v));
        }
        nextSound.setVolume(musicVol * v);
      },
      onComplete: () => {
        this.arcadeCurrent?.stop();
        this.arcadeCurrent?.destroy();
        this.arcadeCurrent = nextSound;
        this.arcadeMusicIndex = nextIndex;
        this.scheduleNextArcadeCrossfade();
      }
    });
  }

  private showTapToStart(): void {
    const rect = this.add
      .rectangle(this.scale.width / 2, this.scale.height / 2, this.scale.width, this.scale.height)
      .setFillStyle(0x000000, 0.7)
      .setInteractive({ useHandCursor: true })
      .setDepth(40);
    const text = this.add
      .text(this.scale.width / 2, this.scale.height / 2, 'TAP TO START', {
        fontSize: '16px',
        color: '#ffffff',
        fontFamily: ARCADE_FONT
      })
      .setOrigin(0.5, 0.5)
      .setDepth(41);
    this.tapToStartOverlay = this.add.container(0, 0, [rect, text]);
    this.tapToStartOverlay.setName('overlayBlocker');
    const isVideoTrack =
      this.storyTrack &&
      (parseInt(this.storyTrack.id.replace('v3-', ''), 10) === 10 ||
        this.storyTrack.file.toLowerCase().endsWith('.mp4'));

    rect.once('pointerdown', () => {
      this.cleanupStoryAudio();
      if (isVideoTrack && this.cache.video.exists('storyTrackVideo')) {
        const centerX = this.boardOriginX + BOARD_WIDTH / 2;
        const centerY = this.boardOriginY + BOARD_HEIGHT / 2;
        const video = this.add.video(centerX, centerY, 'storyTrackVideo');
        video.setDisplaySize(BOARD_WIDTH * GRID_VIDEO_WIDTH_SCALE, BOARD_HEIGHT);
        video.setOrigin(0.5, 0.5);
        video.setAlpha(0.95);
        video.setDepth(-100);
        video.setMute(false);
        const musicVol = this.registry.get('musicVolume', 0.5) as number;
        if (video.video) video.video.volume = musicVol;
        video.play();
        video.on('complete', () => this.onTrackComplete());
        this.gridBgVideo = video;
        this.gridBgImage = null;
      } else if (!isVideoTrack) {
        const musicVol = this.registry.get('musicVolume', 0.5) as number;
        this.storyMusic = this.sound.add('storyTrack', { loop: false, volume: musicVol });
        this.storyMusic.once(Phaser.Sound.Events.COMPLETE, this.onTrackComplete, this);
        this.storyMusic.play();
      }
      this.tapToStartOverlay?.destroy();
      this.tapToStartOverlay = null;
      this.spawnNewPiece();
    });
  }

  private cleanupStoryAudio(): void {
    if (this.storyMusic) {
      this.storyMusic.off(Phaser.Sound.Events.COMPLETE, this.onTrackComplete, this);
      this.storyMusic.stop();
      this.storyMusic.destroy();
      this.storyMusic = null;
    }
    const isVideoTrack =
      this.storyTrack &&
      (parseInt(this.storyTrack.id.replace('v3-', ''), 10) === 10 ||
        this.storyTrack.file.toLowerCase().endsWith('.mp4'));
    if (isVideoTrack && this.gridBgVideo) {
      this.gridBgVideo.destroy();
      this.gridBgVideo = null;
    }
  }

  private cleanupArcadeMusic(): void {
    this.arcadeCrossfadeTimer?.remove();
    this.arcadeCrossfadeTimer = null;
    if (this.arcadeCurrent) {
      this.arcadeCurrent.stop();
      this.arcadeCurrent.destroy();
      this.arcadeCurrent = null;
    }
  }

  /** Play one combo sound when a cleared group has 6+ cells; threshold mapping is randomized. */
  private playComboSoundForClear(groups: { cellCount: number }[]): void {
    if (groups.length === 0) return;
    const best = Math.max(...groups.map((g) => g.cellCount));
    if (best < 6) return;
    const thresholds = [6, 8, 10, 12];
    const threshold = thresholds.filter((t) => t <= best).pop();
    if (threshold == null) return;
    const key = this.comboThresholdToSound[threshold];
    if (key && this.cache.audio.exists(key)) {
      const soundVol = this.registry.get('soundVolume', 0.5) as number;
      this.sound.play(key, { volume: soundVol });
    }
  }

  private onTrackComplete(): void {
    if (this.levelComplete || this.gameOver) return;
    this.levelComplete = true;
    if (this.pauseBtn) this.pauseBtn.setVisible(false);
    if (this.pauseBtnZone) this.pauseBtnZone.setVisible(false);
    this.cleanupStoryAudio();
    const score = this.scoring.total;
    const gridCenterX = this.boardOriginX + BOARD_WIDTH / 2;
    const gridCenterY = this.boardOriginY + BOARD_HEIGHT / 2;
    this.add
      .text(gridCenterX, gridCenterY - 40, 'LEVEL COMPLETE', {
        fontSize: '14px',
        color: '#50fa7b',
        fontFamily: ARCADE_FONT
      })
      .setOrigin(0.5)
      .setDepth(50);
    this.add
      .text(gridCenterX, gridCenterY, `TOTAL SCORE ${score}`, {
        fontSize: '12px',
        color: '#ffffff',
        fontFamily: ARCADE_FONT
      })
      .setOrigin(0.5)
      .setDepth(50);

    setTotalScoreEver(score);
    if (this.storyTracklist) tryUnlockNextTrack(score, this.storyTracklist.tracks);

    const tracks = this.storyTracklist?.tracks ?? [];
    const unlockedCount = this.storyTracklist ? getUnlockedTrackCount(this.storyTracklist.tracks) : 0;
    const currentIndex = this.storyTrack ? tracks.findIndex((t) => t.id === this.storyTrack!.id) : -1;
    const nextIndex = currentIndex >= 0 ? currentIndex + 1 : -1;
    const hasNextTrackUnlocked =
      nextIndex >= 0 &&
      nextIndex < tracks.length &&
      nextIndex < unlockedCount;

    const replayY = gridCenterY + 32;
    const nextTrackY = gridCenterY + 58;
    const backY = hasNextTrackUnlocked ? gridCenterY + 84 : gridCenterY + 58;
    const mainMenuY = hasNextTrackUnlocked ? gridCenterY + 110 : gridCenterY + 84;

    const replayBtn = this.add
      .text(gridCenterX, replayY, 'Replay level', {
        fontSize: '10px',
        color: '#50fa7b',
        fontFamily: ARCADE_FONT
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setDepth(50);
    const replayZone = this.add
      .rectangle(gridCenterX, replayY, 200, 28)
      .setInteractive({ useHandCursor: true })
      .setDepth(49);

    let nextTrackBtn: Phaser.GameObjects.Text | null = null;
    let nextTrackZone: Phaser.GameObjects.Rectangle | null = null;
    if (hasNextTrackUnlocked && this.storyTracklist && nextIndex < tracks.length) {
      const nextTrack = tracks[nextIndex];
      nextTrackBtn = this.add
        .text(gridCenterX, nextTrackY, 'Next track', {
          fontSize: '10px',
          color: '#50fa7b',
          fontFamily: ARCADE_FONT
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .setDepth(50);
      nextTrackZone = this.add
        .rectangle(gridCenterX, nextTrackY, 200, 28)
        .setInteractive({ useHandCursor: true })
        .setDepth(49);
    }

    const backBtn = this.add
      .text(gridCenterX, backY, 'Back to Track Select', {
        fontSize: '10px',
        color: '#8be9fd',
        fontFamily: ARCADE_FONT
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setDepth(50);
    const zone = this.add
      .rectangle(gridCenterX, backY, 280, 36)
      .setInteractive({ useHandCursor: true })
      .setDepth(49);
    const mainMenuBtn = this.add
      .text(gridCenterX, mainMenuY, 'Main menu', {
        fontSize: '10px',
        color: '#ffffff',
        fontFamily: ARCADE_FONT
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setDepth(50);
    const mainMenuZone = this.add
      .rectangle(gridCenterX, mainMenuY, 200, 36)
      .setInteractive({ useHandCursor: true })
      .setDepth(49);

    const cleanupButtons = (): void => {
      replayBtn.off('pointerdown');
      replayZone.off('pointerdown');
      nextTrackBtn?.off('pointerdown');
      nextTrackZone?.off('pointerdown');
      backBtn.off('pointerdown');
      zone.off('pointerdown');
      mainMenuBtn.off('pointerdown');
      mainMenuZone.off('pointerdown');
    };
    const applyUnlocks = (): void => {
      setTotalScoreEver(score);
      if (this.storyTracklist) tryUnlockNextTrack(score, this.storyTracklist.tracks);
    };
    const goBack = (): void => {
      cleanupButtons();
      this.cleanupStoryAudio();
      applyUnlocks();
      this.scene.stop('ArcadeModeScene');
      this.scene.start('StoryModeTrackSelectScene');
    };
    const goMainMenu = (): void => {
      cleanupButtons();
      this.cleanupStoryAudio();
      applyUnlocks();
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        window.location.reload();
      });
    };
    const doReplay = (): void => {
      cleanupButtons();
      this.cleanupStoryAudio();
      applyUnlocks();
      this.scene.restart({
        track: this.storyTrack ?? undefined,
        tracklist: this.storyTracklist ?? undefined
      });
    };
    const goNextTrack = (): void => {
      if (!this.storyTracklist || nextIndex < 0 || nextIndex >= tracks.length) return;
      cleanupButtons();
      this.cleanupStoryAudio();
      applyUnlocks();
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.scene.stop('ArcadeModeScene');
        this.scene.start('ArcadeModeScene', { track: tracks[nextIndex], tracklist: this.storyTracklist });
      });
    };

    replayBtn.once('pointerdown', doReplay);
    replayZone.once('pointerdown', doReplay);
    if (nextTrackBtn && nextTrackZone) {
      nextTrackBtn.once('pointerdown', goNextTrack);
      nextTrackZone.once('pointerdown', goNextTrack);
    }
    backBtn.once('pointerdown', goBack);
    zone.once('pointerdown', goBack);
    mainMenuBtn.once('pointerdown', goMainMenu);
    mainMenuZone.once('pointerdown', goMainMenu);
  }

  private createUi(): void {
    this.scoreText = this.add
      .text(16, 16, 'SCORE 0', {
        fontSize: '10px',
        color: '#ffffff',
        fontFamily: ARCADE_FONT
      })
      .setScrollFactor(0)
      .setDepth(20);

    this.comboText = this.add
      .text(16, 40, 'COMBO 0', {
        fontSize: '10px',
        color: '#8be9fd',
        fontFamily: ARCADE_FONT
      })
      .setScrollFactor(0)
      .setDepth(20);

    this.hintText = this.add
      .text(this.scale.width / 2, 48, '◀ ▶ move   ⟳ rotate   ▽ soft drop', {
        fontSize: '8px',
        color: '#bbbbbb',
        fontFamily: ARCADE_FONT
      })
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0)
      .setDepth(20);

    const pauseX = this.boardOriginX + BOARD_WIDTH - 44;
    const pauseY = this.boardOriginY + BOARD_HEIGHT + 22;
    this.pauseBtn = this.add
      .text(pauseX, pauseY, 'II', {
        fontSize: '14px',
        color: '#aaaaaa',
        fontFamily: ARCADE_FONT
      })
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0)
      .setDepth(25)
      .setInteractive({ useHandCursor: true });
    this.pauseBtnZone = this.add
      .rectangle(pauseX, pauseY, 52, 32)
      .setInteractive({ useHandCursor: true })
      .setScrollFactor(0)
      .setDepth(24);
    this.pauseBtn.on('pointerdown', () => this.openPauseOverlay());
    this.pauseBtn.on('pointerover', () => this.pauseBtn && this.pauseBtn.setColor('#ffffff'));
    this.pauseBtn.on('pointerout', () => this.pauseBtn && this.pauseBtn.setColor('#aaaaaa'));
    this.pauseBtnZone.on('pointerdown', () => this.openPauseOverlay());
  }

  private openPauseOverlay(): void {
    if (this.paused || this.gameOver || this.levelComplete) return;
    this.paused = true;
    this.cleanupArcadeMusic();
    if (this.pauseBtn) this.pauseBtn.setVisible(false);
    if (this.pauseBtnZone) this.pauseBtnZone.setVisible(false);

    const gridCenterX = this.boardOriginX + BOARD_WIDTH / 2;
    const gridCenterY = this.boardOriginY + BOARD_HEIGHT / 2;

    const zone = this.add
      .rectangle(this.scale.width / 2, this.scale.height / 2, this.scale.width, this.scale.height)
      .setInteractive({ useHandCursor: true })
      .setDepth(45);

    this.add
      .text(gridCenterX, gridCenterY - 28, 'PAUSED', {
        fontSize: '16px',
        color: '#ffffff',
        fontFamily: ARCADE_FONT
      })
      .setOrigin(0.5, 0.5)
      .setDepth(50);

    const hasStoryTrack = !!this.storyTrack;
    const mainMenuY = gridCenterY + 8;
    const selectTrackY = gridCenterY + 34;
    const restartY = hasStoryTrack ? gridCenterY + 60 : gridCenterY + 34;
    const optionsY = hasStoryTrack ? gridCenterY + 86 : gridCenterY + 60;

    const mainMenuBtn = this.add
      .text(gridCenterX, mainMenuY, 'Main menu', {
        fontSize: '10px',
        color: '#ffffff',
        fontFamily: ARCADE_FONT
      })
      .setOrigin(0.5, 0.5)
      .setDepth(50)
      .setInteractive({ useHandCursor: true });
    const mainMenuZone = this.add
      .rectangle(gridCenterX, mainMenuY, 200, 28)
      .setInteractive({ useHandCursor: true })
      .setDepth(49);

    let selectTrackBtn: Phaser.GameObjects.Text | null = null;
    let selectTrackZone: Phaser.GameObjects.Rectangle | null = null;
    if (hasStoryTrack) {
      selectTrackBtn = this.add
        .text(gridCenterX, selectTrackY, 'Select track', {
          fontSize: '10px',
          color: '#8be9fd',
          fontFamily: ARCADE_FONT
        })
        .setOrigin(0.5, 0.5)
        .setDepth(50)
        .setInteractive({ useHandCursor: true });
      selectTrackZone = this.add
        .rectangle(gridCenterX, selectTrackY, 200, 28)
        .setInteractive({ useHandCursor: true })
        .setDepth(49);
    }

    const restartBtn = this.add
      .text(gridCenterX, restartY, 'Restart', {
        fontSize: '10px',
        color: '#8be9fd',
        fontFamily: ARCADE_FONT
      })
      .setOrigin(0.5, 0.5)
      .setDepth(50)
      .setInteractive({ useHandCursor: true });
    const restartZone = this.add
      .rectangle(gridCenterX, restartY, 200, 28)
      .setInteractive({ useHandCursor: true })
      .setDepth(49);

    const optionsBtn = this.add
      .text(gridCenterX, optionsY, 'Options', {
        fontSize: '10px',
        color: '#8be9fd',
        fontFamily: ARCADE_FONT
      })
      .setOrigin(0.5, 0.5)
      .setDepth(50)
      .setInteractive({ useHandCursor: true });
    const optionsZone = this.add
      .rectangle(gridCenterX, optionsY, 200, 28)
      .setInteractive({ useHandCursor: true })
      .setDepth(49);

    const cleanup = (): void => {
      zone.off('pointerdown');
      mainMenuBtn.off('pointerdown');
      mainMenuZone.off('pointerdown');
      selectTrackBtn?.off('pointerdown');
      selectTrackZone?.off('pointerdown');
      restartBtn.off('pointerdown');
      restartZone.off('pointerdown');
      optionsBtn.off('pointerdown');
      optionsZone.off('pointerdown');
      zone.destroy();
      mainMenuBtn.destroy();
      mainMenuZone.destroy();
      selectTrackBtn?.destroy();
      selectTrackZone?.destroy();
      restartBtn.destroy();
      restartZone.destroy();
      optionsBtn.destroy();
      optionsZone.destroy();
      this.paused = false;
      if (this.pauseBtn) this.pauseBtn.setVisible(true);
      if (this.pauseBtnZone) this.pauseBtnZone.setVisible(true);
    };

    const goMainMenu = (): void => {
      cleanup();
      this.cleanupStoryAudio();
      setTotalScoreEver(this.scoring.total);
      if (this.storyTracklist) tryUnlockNextTrack(this.scoring.total, this.storyTracklist.tracks);
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        window.location.reload();
      });
    };

    const doRestart = (): void => {
      cleanup();
      this.cleanupStoryAudio();
      setTotalScoreEver(this.scoring.total);
      if (this.storyTracklist) tryUnlockNextTrack(this.scoring.total, this.storyTracklist.tracks);
      this.scene.restart({
        track: this.storyTrack ?? undefined,
        tracklist: this.storyTracklist ?? undefined
      });
    };

    const goOptions = (): void => {
      cleanup();
      this.scene.start('OptionsScene');
    };

    const goSelectTrack = (): void => {
      cleanup();
      this.cleanupStoryAudio();
      setTotalScoreEver(this.scoring.total);
      if (this.storyTracklist) tryUnlockNextTrack(this.scoring.total, this.storyTracklist.tracks);
      this.scene.stop('ArcadeModeScene');
      this.scene.start('StoryModeTrackSelectScene');
    };

    mainMenuBtn.once('pointerdown', goMainMenu);
    mainMenuZone.once('pointerdown', goMainMenu);
    if (selectTrackBtn && selectTrackZone) {
      selectTrackBtn.once('pointerdown', goSelectTrack);
      selectTrackZone.once('pointerdown', goSelectTrack);
    }
    restartBtn.once('pointerdown', doRestart);
    restartZone.once('pointerdown', doRestart);
    optionsBtn.once('pointerdown', goOptions);
    optionsZone.once('pointerdown', goOptions);
  }

  private spawnNewPiece(): void {
    if (this.nextQueue.length < 1) this.nextQueue.push(createRandomPieceDefinition());
    const def = this.nextQueue.shift()!;
    this.nextQueue.push(createRandomPieceDefinition());
    this.pieceCount += 1;
    const dotCellIndex =
      this.pieceCount % 8 === 0 ? Phaser.Math.Between(0, 3) : undefined;
    const centerX = Math.floor(GRID_COLS / 2) - 1;
    const candidate = Piece.fromDefinition(centerX, -1, def, dotCellIndex);
    this.piece = candidate;
    this.pieceSpawnTime = 0;
  }

  private handleGameOver(): void {
    this.gameOver = true;
    if (this.pauseBtn) this.pauseBtn.setVisible(false);
    if (this.pauseBtnZone) this.pauseBtnZone.setVisible(false);
    this.cleanupStoryAudio();
    this.cleanupArcadeMusic();
    const gridCenterX = this.boardOriginX + BOARD_WIDTH / 2;
    const gridCenterY = this.boardOriginY + BOARD_HEIGHT / 2;
    const hasStoryTrack = !!this.storyTrack;
    this.add
      .text(gridCenterX, gridCenterY - 16, 'GAME OVER\nTap to restart', {
        fontSize: '14px',
        color: '#ff6b6b',
        align: 'center',
        fontFamily: ARCADE_FONT
      })
      .setOrigin(0.5)
      .setDepth(50);
    this.add
      .text(gridCenterX, gridCenterY + 4, `TOTAL SCORE ${this.scoring.total}`, {
        fontSize: '12px',
        color: '#ffffff',
        fontFamily: ARCADE_FONT
      })
      .setOrigin(0.5)
      .setDepth(50);

    const restartZone = this.add
      .rectangle(this.scale.width / 2, this.scale.height / 2, this.scale.width, this.scale.height)
      .setInteractive({ useHandCursor: true })
      .setDepth(45);

    const restartY = gridCenterY + 24;
    const selectTrackY = hasStoryTrack ? gridCenterY + 50 : gridCenterY + 24;
    const mainMenuY = hasStoryTrack ? gridCenterY + 76 : gridCenterY + 50;

    const restartBtn = this.add
      .text(gridCenterX, restartY, 'Restart', {
        fontSize: '10px',
        color: '#8be9fd',
        fontFamily: ARCADE_FONT
      })
      .setOrigin(0.5)
      .setDepth(50)
      .setInteractive({ useHandCursor: true });
    const restartBtnZone = this.add
      .rectangle(gridCenterX, restartY, 200, 28)
      .setInteractive({ useHandCursor: true })
      .setDepth(49);

    let backBtn: Phaser.GameObjects.Text | null = null;
    let backZone: Phaser.GameObjects.Rectangle | null = null;
    if (hasStoryTrack) {
      backBtn = this.add
        .text(gridCenterX, selectTrackY, 'Return to track select', {
          fontSize: '10px',
          color: '#8be9fd',
          fontFamily: ARCADE_FONT
        })
        .setOrigin(0.5)
        .setDepth(50)
        .setInteractive({ useHandCursor: true });
      backZone = this.add
        .rectangle(gridCenterX, selectTrackY, 200, 28)
        .setInteractive({ useHandCursor: true })
        .setDepth(49);
    }

    const mainMenuBtn = this.add
      .text(gridCenterX, mainMenuY, 'Main menu', {
        fontSize: '10px',
        color: '#ffffff',
        fontFamily: ARCADE_FONT
      })
      .setOrigin(0.5)
      .setDepth(50)
      .setInteractive({ useHandCursor: true });
    const mainMenuZone = this.add
      .rectangle(gridCenterX, mainMenuY, 200, 28)
      .setInteractive({ useHandCursor: true })
      .setDepth(49);

    const doRestart = (): void => {
      restartZone.off('pointerdown');
      restartZone.off('pointerup');
      restartBtn.off('pointerdown');
      restartBtnZone.off('pointerdown');
      backBtn?.off('pointerdown');
      backZone?.off('pointerdown');
      mainMenuBtn.off('pointerdown');
      mainMenuZone.off('pointerdown');
      this.cleanupStoryAudio();
      this.scene.restart({ track: this.storyTrack ?? undefined, tracklist: this.storyTracklist ?? undefined });
    };
    const goBack = (): void => {
      restartZone.off('pointerdown');
      restartZone.off('pointerup');
      restartBtn.off('pointerdown');
      restartBtnZone.off('pointerdown');
      backBtn?.off('pointerdown');
      backZone?.off('pointerdown');
      mainMenuBtn.off('pointerdown');
      mainMenuZone.off('pointerdown');
      this.cleanupStoryAudio();
      if (this.storyTrack && this.storyTracklist) {
        setTotalScoreEver(this.scoring.total);
        tryUnlockNextTrack(this.scoring.total, this.storyTracklist.tracks);
        this.scene.stop('ArcadeModeScene');
        this.scene.start('StoryModeTrackSelectScene');
      } else if (this.storyTrack) {
        this.scene.stop('ArcadeModeScene');
        this.scene.start('StoryModeTrackSelectScene');
      } else {
        this.scene.stop('ArcadeModeScene');
        this.scene.start('TitleScene');
      }
    };
    const goMainMenu = (): void => {
      restartZone.off('pointerdown');
      restartZone.off('pointerup');
      restartBtn.off('pointerdown');
      restartBtnZone.off('pointerdown');
      backBtn?.off('pointerdown');
      backZone?.off('pointerdown');
      mainMenuBtn.off('pointerdown');
      mainMenuZone.off('pointerdown');
      this.cleanupStoryAudio();
      setTotalScoreEver(this.scoring.total);
      if (this.storyTracklist) tryUnlockNextTrack(this.scoring.total, this.storyTracklist.tracks);
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        window.location.reload();
      });
    };

    restartZone.once('pointerdown', doRestart);
    restartZone.once('pointerup', doRestart);
    restartBtn.once('pointerdown', doRestart);
    restartBtnZone.once('pointerdown', doRestart);
    if (backBtn && backZone) {
      backBtn.once('pointerdown', goBack);
      backZone.once('pointerdown', goBack);
    }
    mainMenuBtn.once('pointerdown', goMainMenu);
    mainMenuZone.once('pointerdown', goMainMenu);
  }

  update(time: number, delta: number): void {
    if (this.gameOver) return;
    if (this.levelComplete) return;
    if (this.tapToStartOverlay) return;
    if (this.paused) return;

    if (this.gridBgVideo) {
      this.gridBgVideo.setDisplaySize(BOARD_WIDTH * GRID_VIDEO_WIDTH_SCALE, BOARD_HEIGHT);
    }

    this.inputController.update();
    if (this.piece && this.pieceSpawnTime === 0) this.pieceSpawnTime = time;
    this.handleInput();
    this.updateGravity(time, delta);

    this.sweep.update(delta, (sweepCol) => {
      const { totalCleared, groups } = this.matchFinder.clearDoomedGroupsPassedBySweep(
        this.grid,
        sweepCol
      );
      if (totalCleared > 0) {
        this.grid.applyGravity();
        this.matchFinder.findAndMarkMatches(this.grid);
      }
      this.scoring.registerClear(groups, time);
      this.playComboSoundForClear(groups);
    });

    if (!this.storyTrack && this.scoring.score >= this.arcadeNextMilestone) {
      this.arcadeLevelUp();
    }
    if (!this.storyTrack && this.scoring.total >= this.arcadeBgNextMilestone) {
      this.arcadeBackgroundDissolve();
    }
    if (this.storyTrack && this.scoring.total >= this.storyBgNextMilestone) {
      this.storyBackgroundDissolve();
    }

    this.updateUi();
    this.renderBoard();
  }

  /** Arcade: every 1000 total score — grid background smoothly dissolves to another. */
  private arcadeBackgroundDissolve(): void {
    this.arcadeBgNextMilestone += 1000;
    this.dissolveToNextGridBg();
  }

  /** Art Tape Vol.3: every 1000 total score — grid background smoothly dissolves to another from this track. */
  private storyBackgroundDissolve(): void {
    this.storyBgNextMilestone += 1000;
    this.dissolveToNextGridBg();
  }

  /** Arcade only: every 2500 pts — sweep 15% faster, gravity faster, grid bg dissolves to new. */
  private arcadeLevelUp(): void {
    this.arcadeNextMilestone += 2500;

    this.sweep.setIntervalMs(this.sweep.getIntervalMs() / 1.15);
    this.gravityIntervalMs = Math.max(150, this.gravityIntervalMs * 0.85);

    this.dissolveToNextGridBg();
  }

  /** Track 1 only: when intro video ends, dissolve to a random image from the track folder. */
  private dissolveFromTrack1VideoToImage(): void {
    const video = this.gridBgVideo;
    if (!video || this.gridBgKeys.length === 0) return;

    const boardWidth = BOARD_WIDTH;
    const boardHeight = BOARD_HEIGHT;
    const centerX = this.boardOriginX + boardWidth / 2;
    const centerY = this.boardOriginY + boardHeight / 2;

    const newBgKey = Phaser.Utils.Array.GetRandom(this.gridBgKeys);
    const newBg = this.add
      .image(centerX, centerY, newBgKey)
      .setDisplaySize(boardWidth, boardHeight)
      .setOrigin(0.5, 0.5)
      .setAlpha(0)
      .setDepth(-100);

    this.gridBgVideo = null;
    this.gridBgImage = newBg;

    const dissolveMs = 800;
    this.tweens.add({ targets: video, alpha: 0, duration: dissolveMs, ease: 'Power2' });
    this.tweens.add({ targets: newBg, alpha: 0.95, duration: dissolveMs, ease: 'Power2' });
    this.time.delayedCall(dissolveMs + 50, () => video.destroy());
  }

  private dissolveToNextGridBg(): void {
    const oldBg = this.gridBgImage;
    if (!oldBg || this.gridBgKeys.length === 0) return;

    const boardWidth = BOARD_WIDTH;
    const boardHeight = BOARD_HEIGHT;
    const centerX = this.boardOriginX + boardWidth / 2;
    const centerY = this.boardOriginY + boardHeight / 2;

    const newBgKey = Phaser.Utils.Array.GetRandom(this.gridBgKeys);
    const newBg = this.add
      .image(centerX, centerY, newBgKey)
      .setDisplaySize(boardWidth, boardHeight)
      .setOrigin(0.5, 0.5)
      .setAlpha(0)
      .setDepth(-100);

    this.gridBgImage = newBg;

    const dissolveMs = 800;
    this.tweens.add({
      targets: oldBg,
      alpha: 0,
      duration: dissolveMs,
      ease: 'Power2'
    });
    this.tweens.add({
      targets: newBg,
      alpha: 0.95,
      duration: dissolveMs,
      ease: 'Power2'
    });
    this.time.delayedCall(dissolveMs + 50, () => {
      oldBg.destroy();
    });
  }

  private handleInput(): void {
    if (!this.piece) return;

    const pieceAboveGrid = this.piece.getCells().some((c) => c.y < 0);
    const canMove = pieceAboveGrid
      ? (cells: { x: number; y: number }[]) => this.grid.canMoveWhenAboveGrid(cells)
      : (cells: { x: number; y: number }[]) => this.grid.canPlace(cells);

    if (this.inputController.consumeLeft()) {
      const moved = this.piece.cloneAt(this.piece.x - 1, this.piece.y);
      if (canMove(moved.getCells())) {
        this.piece = moved;
      }
    }

    if (this.inputController.consumeRight()) {
      const moved = this.piece.cloneAt(this.piece.x + 1, this.piece.y);
      if (canMove(moved.getCells())) {
        this.piece = moved;
      }
    }

    if (this.inputController.consumeRotate()) {
      const rotated = this.piece.rotatedClockwise();
      if (canMove(rotated.getCells())) {
        this.piece = rotated;
      }
    }
  }

  private tryStepDownOnce(): void {
    if (!this.piece) return;
    const down = this.piece.cloneAt(this.piece.x, this.piece.y + 1);
    if (this.grid.canPlace(down.getCells())) {
      this.piece = down;
      return;
    }
    if (this.piece.y < 0) {
      if (this.lastStrikeUsed) {
        this.handleGameOver();
        return;
      }
      if (this.grid.canPlaceTopRow(this.piece.x)) {
        this.lockPieceTopRowOnly();
        return;
      }
      this.lastStrikeUsed = true;
      this.piece = this.piece.cloneAt(this.piece.x, 0);
      this.lockPiece();
      return;
    }
    this.lockPiece();
  }

  /**
   * Gravity runs on the same timer whether the piece is above or inside the grid.
   * If the piece is above the grid (y < 0) and can't drop (top full), gravity still
   * "lands" it: last strike or game over. So the block doesn't sit there forever.
   */
  private updateGravity(time: number, delta: number): void {
    if (!this.piece) return;
    if (this.piece.y < 0 && time - this.pieceSpawnTime < SPAWN_HOLD_MS) return;

    this.dropTimerMs += delta;
    if (this.dropTimerMs < this.gravityIntervalMs) return;
    this.dropTimerMs -= this.gravityIntervalMs;

    const down = this.piece.cloneAt(this.piece.x, this.piece.y + 1);
    if (this.grid.canPlace(down.getCells())) {
      this.piece = down;
      return;
    }
    if (this.piece.y < 0) {
      if (this.lastStrikeUsed) {
        this.handleGameOver();
        return;
      }
      if (this.grid.canPlaceTopRow(this.piece.x)) {
        this.lockPieceTopRowOnly();
        return;
      }
      this.lastStrikeUsed = true;
      this.piece = this.piece.cloneAt(this.piece.x, 0);
      this.lockPiece();
      return;
    }
    this.lockPiece();
  }

  /** Lock only the top row of the piece (y=0) when the bottom row wouldn't fit; then spawn next. */
  private lockPieceTopRowOnly(): void {
    if (!this.piece) return;
    const pieceAtTop = this.piece.cloneAt(this.piece.x, 0);
    const topRowCells = pieceAtTop.getCells().filter((c) => c.y === 0);
    this.grid.lockCells(topRowCells);
    this.grid.applyGravityCollapse();
    this.matchFinder.findAndMarkMatches(this.grid);
    this.piece = null;
    this.spawnNewPiece();
  }

  private lockPiece(): void {
    if (!this.piece) return;
    this.grid.lockCells(this.piece.getCells());
    this.grid.applyGravityCollapse();
    this.matchFinder.findAndMarkMatches(this.grid);
    this.piece = null;
    this.spawnNewPiece();
  }

  private updatePreviewPosition(): void {
    // Preview pieces are positioned by previewRenderer; no label.
  }

  private updateUi(): void {
    // During play: show score and combo separately; combined only at level complete / game over
    this.scoreText.setText(`SCORE ${this.scoring.score}`);
    this.comboText.setText(`COMBO ${this.scoring.combo}`);
  }

  private renderBoard(): void {
    this.graphics.clear();

    const boardWidth = BOARD_WIDTH;
    const boardHeight = BOARD_HEIGHT;

    // board background (semi-transparent so bg image shows through)
    this.graphics.fillStyle(0x11111a, 0.16);
    this.graphics.fillRect(
      this.boardOriginX - 8,
      this.boardOriginY - 8,
      boardWidth + 16,
      boardHeight + 16
    );

    // border around grid area; top line turns red when on last chance (don't touch top again)
    const bx = this.boardOriginX;
    const by = this.boardOriginY;
    if (this.lastStrikeUsed) {
      this.graphics.lineStyle(3, 0xffffff, 1);
      this.graphics.beginPath();
      this.graphics.moveTo(bx + boardWidth, by);
      this.graphics.lineTo(bx + boardWidth, by + boardHeight);
      this.graphics.lineTo(bx, by + boardHeight);
      this.graphics.lineTo(bx, by);
      this.graphics.strokePath();
      this.graphics.lineStyle(5, 0xff4444, 1);
      this.graphics.beginPath();
      this.graphics.moveTo(bx, by);
      this.graphics.lineTo(bx + boardWidth, by);
      this.graphics.strokePath();
    } else {
      this.graphics.lineStyle(3, 0xffffff, 1);
      this.graphics.strokeRect(bx, by, boardWidth, boardHeight);
    }

    // grid background cells
    this.graphics.lineStyle(1, 0x222233, 0.8);
    for (let y = 0; y < GRID_ROWS; y += 1) {
      for (let x = 0; x < GRID_COLS; x += 1) {
        const px = this.boardOriginX + x * CELL_WIDTH;
        const py = this.boardOriginY + y * CELL_HEIGHT;
        this.graphics.strokeRect(px, py, CELL_WIDTH, CELL_HEIGHT);
      }
    }

    // static cells (track 10: blocks at 90% opacity)
    const blockAlpha = this.storyTrack?.id === 'v3-10' ? 0.9 : 1;
    for (let y = 0; y < GRID_ROWS; y += 1) {
      for (let x = 0; x < GRID_COLS; x += 1) {
        const cell = this.grid.get(x, y);
        if (!cell) continue;
        this.drawCell(x, y, cell, blockAlpha);
      }
    }

    // active piece — when above grid (y < 0) shift up by one cell height so it sits fully above the top border
    if (this.piece) {
      const aboveGridOffset = this.piece.y < 0 ? -CELL_HEIGHT : 0;
      for (const c of this.piece.getCells()) {
        const ghostCell: GridCell = {
          color: c.color,
          marked: false,
          componentId: -1,
          doomedId: -1,
          hasDot: c.hasDot
        };
        this.drawCell(c.x, c.y, ghostCell, 0.9, aboveGridOffset);
      }
    }

    // sweep line (interpolated for smooth motion)
    const displayCol = this.sweep.getDisplayColumn();
    const sweepX = this.boardOriginX + displayCol * CELL_WIDTH;
    this.graphics.lineStyle(2, 0xffffff, 0.6);
    this.graphics.beginPath();
    this.graphics.moveTo(sweepX, this.boardOriginY - 4);
    this.graphics.lineTo(sweepX, this.boardOriginY + boardHeight + 4);
    this.graphics.strokePath();

    const blockColors = this.storyTrack ? getBlockColors(this.storyTrack.id) : this.arcadeBlockColors;
    this.previewRenderer.render(this.graphics, this.nextQueue, blockColors.length > 0 ? blockColors : undefined);
  }

  private drawCell(
    gridX: number,
    gridY: number,
    cell: GridCell,
    alpha = 1,
    offsetPixelsY = 0
  ): void {
    const colors = this.storyTrack ? getBlockColors(this.storyTrack.id) : this.arcadeBlockColors;
    const color = colors.length > 0 ? colors[cell.color % colors.length] : 0xffffff;
    const px = this.boardOriginX + gridX * CELL_WIDTH;
    const py = this.boardOriginY + gridY * CELL_HEIGHT + offsetPixelsY;

    this.graphics.fillStyle(color, alpha);
    this.graphics.fillRect(px + 1, py + 1, CELL_WIDTH - 2, CELL_HEIGHT - 2);

    if (cell.doomedId >= 0) {
      this.graphics.fillStyle(0xffffff, 0.35);
      this.graphics.fillRect(px + 2, py + 2, CELL_WIDTH - 4, CELL_HEIGHT - 4);
    }
    if (cell.hasDot) {
      this.graphics.fillStyle(0xffffff, 0.9);
      this.graphics.fillCircle(px + CELL_WIDTH / 2, py + CELL_HEIGHT / 2, 3);
    }
  }
}

