import { GRID_COLS, SWEEP_INTERVAL_MS } from './constants';

export class SweepLine {
  readonly width = GRID_COLS;
  currentColumn = 0;
  private elapsedMs = 0;
  private intervalMs: number;

  constructor(sweepIntervalMs?: number) {
    this.intervalMs = sweepIntervalMs ?? SWEEP_INTERVAL_MS;
  }

  getIntervalMs(): number {
    return this.intervalMs;
  }

  setIntervalMs(ms: number): void {
    this.intervalMs = Math.max(50, ms);
  }

  update(deltaMs: number, onSweep: (column: number) => void): void {
    this.elapsedMs += deltaMs;
    while (this.elapsedMs >= this.intervalMs) {
      this.elapsedMs -= this.intervalMs;
      onSweep(this.currentColumn);
      this.currentColumn = (this.currentColumn + 1) % this.width;
    }
  }

  /** Fractional column [0, width) for smooth drawing between logical column steps. */
  getDisplayColumn(): number {
    const fraction = this.elapsedMs / this.intervalMs;
    return (this.currentColumn + fraction) % this.width;
  }
}

