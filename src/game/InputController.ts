import Phaser from 'phaser';

export interface InputControllerOptions {
  onDownStep?: () => void;
  onDownHold?: () => void;
}

const BTN_FILL_NORMAL = 0x333344;
const BTN_FILL_ACTIVE = 0x5566aa;
const BTN_STROKE_NORMAL = 0xffffff;
const BTN_STROKE_ACTIVE = 0xaaccff;
const ICON_TINT_ACTIVE = 0xaaccff;
const ICON_TINT_NORMAL = 0xffffff;

/** Hold down button for this many ms to trigger hard drop (Tetris-style) */
const HOLD_TO_DROP_MS = 600;

export class InputController {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private rotateKey: Phaser.Input.Keyboard.Key;
  private downKey: Phaser.Input.Keyboard.Key;

  private leftRequested = false;
  private rightRequested = false;
  private rotateRequested = false;

  private onDownStep: (() => void) | undefined;
  private onDownHold: (() => void) | undefined;

  /** Touch/pointer active state (for mobile visual feedback) */
  private rotateTouchActive = false;

  /** Hold-to-drop: time down button has been held */
  private downHoldStartMs = 0;
  private downHoldTriggered = false;

  private leftBtn!: Phaser.GameObjects.Rectangle;
  private leftBtnIcon!: Phaser.GameObjects.Image;
  private downBtn!: Phaser.GameObjects.Rectangle;
  private downBtnIcon!: Phaser.GameObjects.Image;
  private rightBtn!: Phaser.GameObjects.Rectangle;
  private rightBtnIcon!: Phaser.GameObjects.Image;
  private rotateBtn!: Phaser.GameObjects.Rectangle;
  private rotateBtnIcon!: Phaser.GameObjects.Image;

  private leftTouchRef = { value: false };
  private rightTouchRef = { value: false };
  private downTouchRef = { value: false };

  constructor(
    private scene: Phaser.Scene,
    options: InputControllerOptions = {}
  ) {
    this.onDownStep = options.onDownStep;
    this.onDownHold = options.onDownHold;
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
    /** Down button offset - lower than left/right for controller-style layout */
    const downOffset = 98;
    const dpadCenterX = width * 0.28;
    const bottomHalfCenterY = height * 0.75;
    const dpadCenterY = bottomHalfCenterY;

    const makeDirButton = (
      x: number,
      y: number,
      textureKey: string,
      onPress: () => void,
      touchActiveRef: { value: boolean }
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
      rect.on('pointerdown', () => {
        touchActiveRef.value = true;
        onPress();
      });
      rect.on('pointerup', () => { touchActiveRef.value = false; });
      rect.on('pointerout', () => { touchActiveRef.value = false; });
      rect.on('destroy', () => icon.destroy());
      return { rect, icon };
    };

    const left = makeDirButton(dpadCenterX - spacing, dpadCenterY, 'arrowLeft', () => {
      this.leftRequested = true;
    }, this.leftTouchRef);
    this.leftBtn = left.rect;
    this.leftBtnIcon = left.icon;

    const down = makeDirButton(dpadCenterX, dpadCenterY + downOffset, 'arrowDown', () => {
      this.onDownStep?.();
    }, this.downTouchRef);
    this.downBtn = down.rect;
    this.downBtnIcon = down.icon;
    this.setupDownButtonHold();

    const right = makeDirButton(dpadCenterX + spacing, dpadCenterY, 'arrowRight', () => {
      this.rightRequested = true;
    }, this.rightTouchRef);
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
      this.rotateTouchActive = true;
      this.rotateRequested = true;
    });
    this.rotateBtn.on('pointerup', () => { this.rotateTouchActive = false; });
    this.rotateBtn.on('pointerout', () => { this.rotateTouchActive = false; });
    this.rotateBtn.on('destroy', () => this.rotateBtnIcon.destroy());
  }

  private setupDownButtonHold(): void {
    this.downBtn.on('pointerdown', () => {
      this.downHoldStartMs = this.scene.game.getTime();
      this.downHoldTriggered = false;
    });
    this.downBtn.on('pointerup', () => {
      this.downHoldTriggered = false;
    });
    this.downBtn.on('pointerout', () => {
      this.downHoldTriggered = false;
    });
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

    // Keyboard: set hold start time when down key first pressed
    if (justDown(this.downKey)) {
      this.downHoldStartMs = this.scene.game.getTime();
      this.downHoldTriggered = false;
    }

    // Hold-to-drop: when down held for HOLD_TO_DROP_MS, trigger hard drop
    if (this.downTouchRef.value || this.downKey.isDown) {
      const heldMs = this.scene.game.getTime() - this.downHoldStartMs;
      if (heldMs >= HOLD_TO_DROP_MS && !this.downHoldTriggered) {
        this.downHoldTriggered = true;
        this.onDownHold?.();
      }
    }

    // Active = keyboard OR touch (for mobile visual feedback)
    const leftActive = (this.cursors.left?.isDown ?? false) || this.leftTouchRef.value;
    const rightActive = (this.cursors.right?.isDown ?? false) || this.rightTouchRef.value;
    const downActive = this.downKey.isDown || this.downTouchRef.value;
    const rotateActive =
      this.rotateKey.isDown || (this.cursors.up?.isDown ?? false) || this.rotateTouchActive;

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
