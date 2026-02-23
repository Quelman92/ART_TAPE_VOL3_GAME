import { GRID_COLS, GRID_ROWS } from './constants';
import type { GridCell } from './types';

export class Grid {
  readonly width = GRID_COLS;
  readonly height = GRID_ROWS;
  readonly cells: (GridCell | null)[][];

  constructor() {
    this.cells = [];
    for (let y = 0; y < this.height; y += 1) {
      const row: (GridCell | null)[] = [];
      for (let x = 0; x < this.width; x += 1) {
        row.push(null);
      }
      this.cells.push(row);
    }
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  get(x: number, y: number): GridCell | null {
    if (!this.inBounds(x, y)) return null;
    return this.cells[y][x];
  }

  set(x: number, y: number, cell: GridCell | null): void {
    if (!this.inBounds(x, y)) return;
    this.cells[y][x] = cell;
  }

  clearAllMarks(): void {
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        const cell = this.cells[y][x];
        if (cell) cell.marked = false;
      }
    }
  }

  /** True if the two cells at (x, 0) and (x+1, 0) are in bounds and empty (room for top row of a 2x2). */
  canPlaceTopRow(originX: number): boolean {
    if (originX < 0 || originX + 1 >= this.width) return false;
    return !this.cells[0][originX] && !this.cells[0][originX + 1];
  }

  /** Allow y < 0 so piece can sit one row above grid, then drop to top row. */
  canPlace(positions: { x: number; y: number }[]): boolean {
    for (const p of positions) {
      if (p.x < 0 || p.x >= this.width) return false;
      if (p.y < 0) continue;
      if (p.y >= this.height) return false;
      if (this.cells[p.y][p.x]) return false;
    }
    return true;
  }

  /**
   * When the piece has any cell above the grid (y < 0), movement/rotate should not be
   * blocked by grid content below. Only enforce horizontal bounds so the piece can move freely.
   */
  canMoveWhenAboveGrid(positions: { x: number; y: number }[]): boolean {
    for (const p of positions) {
      if (p.x < 0 || p.x >= this.width) return false;
    }
    return true;
  }

  lockCells(cells: { x: number; y: number; color: number; hasDot?: boolean }[]): void {
    for (const c of cells) {
      if (!this.inBounds(c.x, c.y)) continue;
      this.cells[c.y][c.x] = {
        color: c.color,
        marked: false,
        componentId: -1,
        doomedId: -1,
        hasDot: c.hasDot ?? false
      };
    }
  }

  clearCellsAt(positions: { x: number; y: number }[]): number {
    let removed = 0;
    for (const p of positions) {
      if (!this.inBounds(p.x, p.y)) continue;
      if (this.cells[p.y][p.x]) removed += 1;
      this.cells[p.y][p.x] = null;
    }
    return removed;
  }

  clearMarkedInColumn(col: number): number {
    if (col < 0 || col >= this.width) return 0;
    let removed = 0;
    for (let y = 0; y < this.height; y += 1) {
      const cell = this.cells[y][col];
      if (cell && cell.marked) {
        this.cells[y][col] = null;
        removed += 1;
      }
    }
    return removed;
  }

  /**
   * Clear every cell in column col that has doomedId set (x === sweepCol). Returns count cleared.
   */
  clearDoomedAtColumn(col: number): number {
    if (col < 0 || col >= this.width) return 0;
    let removed = 0;
    for (let y = 0; y < this.height; y += 1) {
      const cell = this.cells[y][col];
      if (cell && cell.doomedId >= 0) {
        this.cells[y][col] = null;
        removed += 1;
      }
    }
    return removed;
  }

  /**
   * Column collapse: in each column, all non-empty cells fall to the lowest
   * available row. No holes (empty cells) remain below filled cells.
   */
  applyGravity(): void {
    for (let x = 0; x < this.width; x += 1) {
      const column: (GridCell | null)[] = [];
      for (let y = this.height - 1; y >= 0; y -= 1) {
        const cell = this.cells[y][x];
        if (cell) column.push(cell);
      }
      let writeY = this.height - 1;
      for (const cell of column) {
        this.cells[writeY][x] = cell;
        writeY -= 1;
      }
      for (let y = writeY; y >= 0; y -= 1) {
        this.cells[y][x] = null;
      }
    }
  }

  applyGravityCollapse(): void {
    this.applyGravity();
  }
}

