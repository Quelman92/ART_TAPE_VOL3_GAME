import type { ClearedGroup } from './MatchFinder';

/** Base points per cell (x1 per square). */
const POINTS_PER_CELL = 10;

/** Initial 2×2 block = 2 "rows of two". Combo = base × (extra rows of two) beyond that. */
const INITIAL_PAIRS = 2;

export class Scoring {
  /** Base points (per cell); always added. Not combined with combo until end. */
  private _score = 0;
  /** Combo bonus (base × extra rows of two per group). Stacks all level, never resets. */
  private _combo = 0;

  get score(): number {
    return this._score;
  }

  get combo(): number {
    return this._combo;
  }

  /** Final total = base score + combo (used at game over and for persistence). */
  get total(): number {
    return this._score + this._combo;
  }

  reset(): void {
    this._score = 0;
    this._combo = 0;
  }

  /**
   * When the sweeper clears a zone: base points go to score, combo bonus to combo.
   * Final score at game over = score + combo.
   */
  registerClear(groups: ClearedGroup[], _nowMs: number): void {
    if (groups.length === 0) return;

    for (const g of groups) {
      const cellCount = g.cellCount;
      const base = cellCount * POINTS_PER_CELL;
      const pairs = Math.floor(cellCount / 2);
      const extraRowsOfTwo = Math.max(0, pairs - INITIAL_PAIRS);
      const bonus = base * extraRowsOfTwo;

      this._score += base;
      this._combo += bonus;
    }
  }
}

