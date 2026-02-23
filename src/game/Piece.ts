import { GRID_COLS } from './constants';

export type PieceCell = { x: number; y: number; color: number; hasDot?: boolean };

/** 2x2 color layout row-major: [row0col0, row0col1, row1col0, row1col1] or 2x2 array */
export type PieceDefinition = number[][];

const COLORS = [0, 1];

function randomLayout(): number[][] {
  return [
    [COLORS[Math.floor(Math.random() * 2)], COLORS[Math.floor(Math.random() * 2)]],
    [COLORS[Math.floor(Math.random() * 2)], COLORS[Math.floor(Math.random() * 2)]]
  ];
}

export function createRandomPieceDefinition(): PieceDefinition {
  return randomLayout();
}

export class Piece {
  x: number;
  y: number;
  private layout: number[][];
  private dotCellIndex?: number;

  constructor(x: number, y: number, layout: number[][]) {
    this.x = x;
    this.y = y;
    this.layout = layout;
  }

  static fromDefinition(
    x: number,
    y: number,
    def: PieceDefinition,
    dotCellIndex?: number
  ): Piece {
    const layout = def.map((row) => [...row]);
    const piece = new Piece(x, y, layout);
    piece.dotCellIndex = dotCellIndex;
    return piece;
  }

  static random(): Piece {
    const layout = randomLayout();
    const centerX = Math.floor(GRID_COLS / 2) - 1;
    return new Piece(centerX, 0, layout);
  }

  cloneAt(x: number, y: number): Piece {
    const newLayout = this.layout.map((row) => [...row]);
    const p = new Piece(x, y, newLayout);
    p.dotCellIndex = this.dotCellIndex;
    return p;
  }

  getCells(): PieceCell[] {
    const cells: PieceCell[] = [];
    let idx = 0;
    for (let dy = 0; dy < 2; dy += 1) {
      for (let dx = 0; dx < 2; dx += 1) {
        const color = this.layout[dy][dx];
        const hasDot = this.dotCellIndex === idx;
        cells.push({ x: this.x + dx, y: this.y + dy, color, hasDot });
        idx += 1;
      }
    }
    return cells;
  }

  rotatedClockwise(): Piece {
    const a = this.layout;
    const rotated: number[][] = [
      [a[1][0], a[0][0]],
      [a[1][1], a[0][1]]
    ];
    const p = new Piece(this.x, this.y, rotated);
    const rotMap = [1, 3, 0, 2];
    if (this.dotCellIndex !== undefined) p.dotCellIndex = rotMap[this.dotCellIndex];
    return p;
  }
}

