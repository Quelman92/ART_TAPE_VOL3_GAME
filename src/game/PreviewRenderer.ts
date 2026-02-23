import Phaser from 'phaser';
import { COLORS } from './constants';
import type { PieceDefinition } from './Piece';

const PREVIEW_CELL = 12;
const PREVIEW_PADDING = 8;
const SLOT_WIDTH = PREVIEW_CELL * 2 + PREVIEW_PADDING;
const SLOT_HEIGHT = PREVIEW_CELL * 2 + PREVIEW_PADDING;
const GAP_BELOW_BOARD = 16;

export class PreviewRenderer {
  constructor(
    private scene: Phaser.Scene,
    private boardOriginX: number,
    private boardOriginY: number,
    private boardWidth: number,
    private boardHeight: number
  ) {}

  /**
   * Draw next queue (up to 3 pieces) in a row below the playfield, bottom left.
   * @param colors Optional two-element array for block colors (e.g. track 2 orange/grey); defaults to COLORS.
   */
  render(graphics: Phaser.GameObjects.Graphics, queue: PieceDefinition[], colors?: number[]): void {
    const colorSet = colors ?? COLORS;
    const originX = this.boardOriginX;
    const originY = this.boardOriginY + this.boardHeight + GAP_BELOW_BOARD;

    for (let i = 0; i < Math.min(3, queue.length); i += 1) {
      const layout = queue[i];
      if (!layout || layout.length < 2) continue;

      const slotX = originX + PREVIEW_PADDING + i * (SLOT_WIDTH + PREVIEW_PADDING);

      for (let dy = 0; dy < 2; dy += 1) {
        for (let dx = 0; dx < 2; dx += 1) {
          const color = layout[dy][dx];
          const hex = colorSet[color % colorSet.length];
          const px = slotX + dx * PREVIEW_CELL;
          const py = originY + PREVIEW_PADDING + dy * PREVIEW_CELL;
          graphics.fillStyle(hex, 1);
          graphics.fillRect(px + 1, py + 1, PREVIEW_CELL - 2, PREVIEW_CELL - 2);
        }
      }
    }
  }
}
