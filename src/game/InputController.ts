import Phaser from 'phaser';

export interface InputControllerOptions {
  onDownStep?: () => void;
}

const BTN_FILL_NORMAL = 0x333344;
const BTN_FILL_ACTIVE = 0x5566aa;
const BTN_STROKE_NORMAL = 0xffffff;
const BTN_STROKE_ACTIVE = 0xaaccff;
const ICON_TINT_ACTIVE = 0xaaccff;
const ICON_TINT_NORMAL = 0xffffff;

export class InputController {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private rotateKey: Phaser.Input.Keyboard.Key;
  private downKey: Phaser.Input.Keyboard.Key;

  private leftRequested = false;
  private rightRequested = false;
  private rotateRequested = false;

  private onDownStep: (() => void) | undefined;

  private leftBtn!: Phaser.GameObjects.Rectangle;
  private leftBtnIcon!: Phaser.GameObjects.Image;
  private downBtn!: Phaser.GameObjects.Rectangle;
  private downBtnIcon!: Phaser.GameObjects.Image;
  private rightBtn!: Phaser.GameObjects.Rectangle;
  private rightBtnIcon!: Phaser.GameObjects.Image;
  private rotateBtn!: Phaser.GameObjects.Rectangle;
  private rotateBtnIcon!: Phaser.GameObjects.Image;

  constructor(
    private scene: Phaser.Scene,
    options: InputControllerOptions = {}
  ) {
    this.onDownStep = options.onDownStep;
    this.cursors = scene.input.keyboard!.createCursorKeys();
    this.rotateKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.downKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
    this.createTouchButtons();
  }

  private createTouchButtons(): void {
    const { width, height } = this.scene.scale;
    const btnW = 72;
    const btnH = 68;
    const spacing = 80;
    const downOffset = 44;
    const dpadCenterX = width * 0.28;
    const bottomHalfCenterY = height * 0.75;
    const dpadCenterY = bottomHalfCenterY;

    const makeDirButton = (
      x: number,
      y: number,
      textureKey: string,
      onPress: () => void
    ): { rect: Phaser.GameObjects.Rectangle; icon: Phaser.GameObjects.Image } => {
      const rect = this.scene.add
        .rectangle(x, y, btnW, btnH, BTN_FILL_NORMAL, 0.85)
        .setStrokeStyle(3, BTN_STROKE_NORMAL, 0.9)
        .setScrollFactor(0)
        .setDepth(10)
        .setInteractive({ useHandCursor: true });
      const icon = this.scene.add
        .image(x, y, textureKey)
        .setDisplaySize(btnW, btnH)
        .setScrollFactor(0)
        .setDepth(11);
      rect.on('pointerdown', () => onPress());
      rect.on('destroy', () => icon.destroy());
      return { rect, icon };
    };

    const left = makeDirButton(dpadCenterX - spacing, dpadCenterY, 'arrowLeft', () => {
      this.leftRequested = true;
    });
    this.leftBtn = left.rect;
    this.leftBtnIcon = left.icon;

    const down = makeDirButton(dpadCenterX, dpadCenterY + downOffset, 'arrowDown', () => {
      this.onDownStep?.();
    });
    this.downBtn = down.rect;
    this.downBtnIcon = down.icon;

    const right = makeDirButton(dpadCenterX + spacing, dpadCenterY, 'arrowRight', () => {
      this.rightRequested = true;
    });
    this.rightBtn = right.rect;
    this.rightBtnIcon = right.icon;

    const rotateBtnSize = 88;
    const rotateBtnX = width * 0.76;
    const rotateBtnY = bottomHalfCenterY;
    this.rotateBtn = this.scene.add
      .rectangle(rotateBtnX, rotateBtnY, rotateBtnSize, rotateBtnSize, BTN_FILL_NORMAL, 0.85)
      .setStrokeStyle(3, BTN_STROKE_NORMAL, 0.9)
      .setScrollFactor(0)
      .setDepth(10)
      .setInteractive({ useHandCursor: true });
    this.rotateBtnIcon = this.scene.add
      .image(rotateBtnX, rotateBtnY, 'arrowAction')
      .setDisplaySize(rotateBtnSize, rotateBtnSize)
      .setScrollFactor(0)
      .setDepth(11);
    this.rotateBtn.on('pointerdown', () => {
      this.rotateRequested = true;
    });
    this.rotateBtn.on('destroy', () => this.rotateBtnIcon.destroy());
  }

  private setButtonHighlight(
    rect: Phaser.GameObjects.Rectangle,
    icon: Phaser.GameObjects.Image,
    active: boolean
  ): void {
    rect.setFillStyle(active ? BTN_FILL_ACTIVE : BTN_FILL_NORMAL, 0.85);
    rect.setStrokeStyle(3, active ? BTN_STROKE_ACTIVE : BTN_STROKE_NORMAL, 0.9);
    icon.setTint(active ? ICON_TINT_ACTIVE : ICON_TINT_NORMAL);
  }

  update(): void {
    const justDown = Phaser.Input.Keyboard.JustDown;

    if (this.cursors.left && justDown(this.cursors.left)) {
      this.leftRequested = true;
    }
    if (this.cursors.right && justDown(this.cursors.right)) {
      this.rightRequested = true;
    }
    if (justDown(this.rotateKey) || (this.cursors.up && justDown(this.cursors.up))) {
      this.rotateRequested = true;
    }

    const leftActive = this.cursors.left?.isDown ?? false;
    const rightActive = this.cursors.right?.isDown ?? false;
    const downActive = this.downKey.isDown;
    const rotateActive =
      this.rotateKey.isDown || (this.cursors.up?.isDown ?? false);

    this.setButtonHighlight(this.leftBtn, this.leftBtnIcon, leftActive);
    this.setButtonHighlight(this.downBtn, this.downBtnIcon, downActive);
    this.setButtonHighlight(this.rightBtn, this.rightBtnIcon, rightActive);
    this.setButtonHighlight(this.rotateBtn, this.rotateBtnIcon, rotateActive);
  }

  consumeLeft(): boolean {
    const v = this.leftRequested;
    this.leftRequested = false;
    return v;
  }

  consumeRight(): boolean {
    const v = this.rightRequested;
    this.rightRequested = false;
    return v;
  }

  consumeRotate(): boolean {
    const v = this.rotateRequested;
    this.rotateRequested = false;
    return v;
  }
}
