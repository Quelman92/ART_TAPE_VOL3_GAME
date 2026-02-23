import Phaser from 'phaser';
import { ARCADE_FONT } from './constants';

const VOLUME_STEPS = [0, 0.25, 0.5, 0.75, 1] as const;
const REGISTRY_MUSIC = 'musicVolume';
const REGISTRY_SOUND = 'soundVolume';
const STORAGE_MUSIC = 'lumines_musicVolume';
const STORAGE_SOUND = 'lumines_soundVolume';
const DEFAULT_MUSIC = 0.5;
const DEFAULT_SOUND = 0.5;

function volumeToStep(v: number): number {
  let best = 0;
  let bestDist = Math.abs(v - VOLUME_STEPS[0]);
  for (let i = 1; i < VOLUME_STEPS.length; i++) {
    const d = Math.abs(v - VOLUME_STEPS[i]);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

function volumeToPercent(v: number): number {
  return Math.round(v * 100);
}

export class OptionsScene extends Phaser.Scene {
  private musicValueText!: Phaser.GameObjects.Text;
  private soundValueText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'OptionsScene' });
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#0a0a0f');

    if (this.registry.get(REGISTRY_MUSIC) === undefined) {
      this.registry.set(REGISTRY_MUSIC, DEFAULT_MUSIC);
    }
    if (this.registry.get(REGISTRY_SOUND) === undefined) {
      this.registry.set(REGISTRY_SOUND, DEFAULT_SOUND);
    }

    const centerX = this.scale.width / 2;
    const w = this.scale.width;

    this.add
      .text(centerX, 72, 'OPTIONS', {
        fontSize: '18px',
        color: '#ffffff',
        fontFamily: ARCADE_FONT
      })
      .setOrigin(0.5, 0.5);

    const row1Y = this.scale.height * 0.32;
    const row2Y = this.scale.height * 0.48;
    const labelStyle = { fontSize: '12px', color: '#cccccc', fontFamily: ARCADE_FONT };
    const valueStyle = { fontSize: '12px', color: '#ffffff', fontFamily: ARCADE_FONT };
    const btnStyle = { fontSize: '12px', color: '#8be9fd', fontFamily: ARCADE_FONT };

    // —— MUSIC ——
    this.add.text(centerX - 100, row1Y, 'MUSIC', labelStyle).setOrigin(0, 0.5);
    this.musicValueText = this.add
      .text(centerX, row1Y, `${volumeToPercent(this.registry.get(REGISTRY_MUSIC))}%`, valueStyle)
      .setOrigin(0.5, 0.5);
    const musicDown = this.add.text(centerX + 70, row1Y, '−', btnStyle).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });
    const musicUp = this.add.text(centerX + 110, row1Y, '+', btnStyle).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });
    const musicDownZone = this.add.rectangle(centerX + 70, row1Y, 44, 36).setInteractive({ useHandCursor: true }).setDepth(-1);
    const musicUpZone = this.add.rectangle(centerX + 110, row1Y, 44, 36).setInteractive({ useHandCursor: true }).setDepth(-1);

    const updateMusic = (): void => {
      const v = this.registry.get(REGISTRY_MUSIC) as number;
      const step = volumeToStep(v);
      const nextStep = Math.max(0, step - 1);
      const val = VOLUME_STEPS[nextStep];
      this.registry.set(REGISTRY_MUSIC, val);
      localStorage.setItem(STORAGE_MUSIC, String(val));
      this.musicValueText.setText(`${volumeToPercent(val)}%`);
    };
    const updateMusicUp = (): void => {
      const v = this.registry.get(REGISTRY_MUSIC) as number;
      const step = volumeToStep(v);
      const nextStep = Math.min(VOLUME_STEPS.length - 1, step + 1);
      const val = VOLUME_STEPS[nextStep];
      this.registry.set(REGISTRY_MUSIC, val);
      localStorage.setItem(STORAGE_MUSIC, String(val));
      this.musicValueText.setText(`${volumeToPercent(val)}%`);
    };
    musicDown.on('pointerdown', updateMusic);
    musicDownZone.on('pointerdown', updateMusic);
    musicUp.on('pointerdown', updateMusicUp);
    musicUpZone.on('pointerdown', updateMusicUp);
    musicDown.on('pointerover', () => musicDown.setColor('#ffffff'));
    musicDown.on('pointerout', () => musicDown.setColor('#8be9fd'));
    musicUp.on('pointerover', () => musicUp.setColor('#ffffff'));
    musicUp.on('pointerout', () => musicUp.setColor('#8be9fd'));

    // —— SOUND (combo) ——
    this.add.text(centerX - 100, row2Y, 'SOUND', labelStyle).setOrigin(0, 0.5);
    this.soundValueText = this.add
      .text(centerX, row2Y, `${volumeToPercent(this.registry.get(REGISTRY_SOUND))}%`, valueStyle)
      .setOrigin(0.5, 0.5);
    const soundDown = this.add.text(centerX + 70, row2Y, '−', btnStyle).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });
    const soundUp = this.add.text(centerX + 110, row2Y, '+', btnStyle).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });
    const soundDownZone = this.add.rectangle(centerX + 70, row2Y, 44, 36).setInteractive({ useHandCursor: true }).setDepth(-1);
    const soundUpZone = this.add.rectangle(centerX + 110, row2Y, 44, 36).setInteractive({ useHandCursor: true }).setDepth(-1);

    const updateSound = (): void => {
      const v = this.registry.get(REGISTRY_SOUND) as number;
      const step = volumeToStep(v);
      const nextStep = Math.max(0, step - 1);
      const val = VOLUME_STEPS[nextStep];
      this.registry.set(REGISTRY_SOUND, val);
      localStorage.setItem(STORAGE_SOUND, String(val));
      this.soundValueText.setText(`${volumeToPercent(val)}%`);
    };
    const updateSoundUp = (): void => {
      const v = this.registry.get(REGISTRY_SOUND) as number;
      const step = volumeToStep(v);
      const nextStep = Math.min(VOLUME_STEPS.length - 1, step + 1);
      const val = VOLUME_STEPS[nextStep];
      this.registry.set(REGISTRY_SOUND, val);
      localStorage.setItem(STORAGE_SOUND, String(val));
      this.soundValueText.setText(`${volumeToPercent(val)}%`);
    };
    soundDown.on('pointerdown', updateSound);
    soundDownZone.on('pointerdown', updateSound);
    soundUp.on('pointerdown', updateSoundUp);
    soundUpZone.on('pointerdown', updateSoundUp);
    soundDown.on('pointerover', () => soundDown.setColor('#ffffff'));
    soundDown.on('pointerout', () => soundDown.setColor('#8be9fd'));
    soundUp.on('pointerover', () => soundUp.setColor('#ffffff'));
    soundUp.on('pointerout', () => soundUp.setColor('#8be9fd'));

    // MAIN MENU
    const mainMenuY = this.scale.height - 80;
    const mainMenuBtn = this.add
      .text(centerX, mainMenuY, 'MAIN MENU', {
        fontSize: '12px',
        color: '#ffffff',
        fontFamily: ARCADE_FONT
      })
      .setOrigin(0.5, 0.5)
      .setInteractive({ useHandCursor: true });
    const mainMenuZone = this.add
      .rectangle(centerX, mainMenuY, 220, 36)
      .setInteractive({ useHandCursor: true })
      .setDepth(-1);
    const goMainMenu = (): void => {
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        window.location.reload();
      });
    };
    mainMenuBtn.on('pointerdown', goMainMenu);
    mainMenuZone.on('pointerdown', goMainMenu);
    mainMenuBtn.on('pointerover', () => mainMenuBtn.setColor('#8be9fd'));
    mainMenuBtn.on('pointerout', () => mainMenuBtn.setColor('#ffffff'));

    const escKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    escKey.on('down', goMainMenu);
  }
}
