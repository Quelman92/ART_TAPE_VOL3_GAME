import type { Grid } from './Grid';
import type { GridCell } from './types';

const key = (x: number, y: number): string => `${x},${y}`;
const parseKey = (k: string): [number, number] => {
  const [a, b] = k.split(',').map(Number);
  return [a, b];
};

const ORTH = [
  { dx: 1, dy: 0 },
  { dx: -1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: 0, dy: -1 }
];

/**
 * ELIGIBLE = only cells in at least one 2x2 same-color. Connection over eligible only.
 * Doomed = frozen: never remove doomedId until cell is cleared. Sync group.cells from grid after gravity.
 */
export interface ClearedGroup {
  cellCount: number;
  hasDot: boolean;
}

export class MatchFinder {
  readonly componentCells = new Map<number, { x: number; y: number }[]>();
  readonly doomedGroups = new Map<number, { cells: Set<string>; hasDot?: boolean }>();
  private nextDoomedId = 0;

  /**
   * Set each group's cells to current grid positions of all cells with that doomedId.
   */
  private syncDoomedGroupsFromGrid(grid: Grid): void {
    for (const [id, group] of this.doomedGroups) {
      group.cells.clear();
      for (let y = 0; y < grid.height; y += 1) {
        for (let x = 0; x < grid.width; x += 1) {
          const cell = grid.get(x, y);
          if (cell && cell.doomedId === id) group.cells.add(key(x, y));
        }
      }
      if (group.cells.size === 0) this.doomedGroups.delete(id);
    }
  }

  findAndMarkMatches(grid: Grid): void {
    grid.clearAllMarks();
    this.syncDoomedGroupsFromGrid(grid);

    const eligibleByColor = new Map<number, Set<string>>();

    for (let y = 0; y < grid.height - 1; y += 1) {
      for (let x = 0; x < grid.width - 1; x += 1) {
        const c00 = grid.get(x, y);
        const c10 = grid.get(x + 1, y);
        const c01 = grid.get(x, y + 1);
        const c11 = grid.get(x + 1, y + 1);
        if (!c00 || !c10 || !c01 || !c11) continue;
        const color = c00.color;
        if (c10.color !== color || c01.color !== color || c11.color !== color) continue;
        if (!eligibleByColor.has(color)) eligibleByColor.set(color, new Set());
        const set = eligibleByColor.get(color)!;
        set.add(key(x, y));
        set.add(key(x + 1, y));
        set.add(key(x, y + 1));
        set.add(key(x + 1, y + 1));
      }
    }

    const inBounds = (x: number, y: number) =>
      x >= 0 && x < grid.width && y >= 0 && y < grid.height;

    this.componentCells.clear();

    for (const [color, eligibleSet] of eligibleByColor) {
      const visited = new Set<string>();
      for (const seed of eligibleSet) {
        if (visited.has(seed)) continue;
        const component: { x: number; y: number }[] = [];
        const lit = new Set<string>();
        const queue: string[] = [seed];
        lit.add(seed);
        while (queue.length > 0) {
          const p = queue.shift()!;
          const [cx, cy] = parseKey(p);
          component.push({ x: cx, y: cy });
          visited.add(p);
          for (const d of ORTH) {
            const nx = cx + d.dx;
            const ny = cy + d.dy;
            const nk = key(nx, ny);
            if (!inBounds(nx, ny) || lit.has(nk)) continue;
            if (!eligibleSet.has(nk)) continue;
            const cell = grid.get(nx, ny);
            if (!cell || cell.color !== color) continue;
            lit.add(nk);
            queue.push(nk);
          }
        }

        const existingIds = new Set<number>();
        for (const pos of component) {
          const cell = grid.get(pos.x, pos.y);
          if (cell && cell.doomedId >= 0) existingIds.add(cell.doomedId);
        }
        const canonicalId =
          existingIds.size > 0 ? Math.min(...existingIds) : this.nextDoomedId++;
        if (!this.doomedGroups.has(canonicalId)) {
          this.doomedGroups.set(canonicalId, { cells: new Set(), hasDot: false });
        }
        const canonicalGroup = this.doomedGroups.get(canonicalId)!;

        for (const id of existingIds) {
          if (id === canonicalId) continue;
          const other = this.doomedGroups.get(id);
          if (other) {
            if (other.hasDot) canonicalGroup.hasDot = true;
            for (const k of other.cells) {
              const [gx, gy] = parseKey(k);
              const cell = grid.get(gx, gy);
              if (cell) cell.doomedId = canonicalId;
            }
            this.doomedGroups.delete(id);
          }
        }

        for (const pos of component) {
          const cell = grid.get(pos.x, pos.y);
          if (cell) {
            cell.marked = true;
            cell.doomedId = canonicalId;
            if (cell.hasDot) canonicalGroup.hasDot = true;
          }
        }
        const compId = this.componentCells.size;
        this.componentCells.set(compId, component);
        for (const pos of component) {
          const cell = grid.get(pos.x, pos.y);
          if (cell) cell.componentId = compId;
        }
      }
    }

    this.syncDoomedGroupsFromGrid(grid);
    this.expandSuperGroups(grid);
    this.syncDoomedGroupsFromGrid(grid);

    for (let y = 0; y < grid.height; y += 1) {
      for (let x = 0; x < grid.width; x += 1) {
        const cell = grid.get(x, y);
        if (cell && cell.doomedId >= 0) cell.marked = true;
      }
    }
  }

  /**
   * Any doomed group that contains a cell with hasDot (super cube) expands to include
   * all same-color cells that are orthogonally connected to the group.
   */
  private expandSuperGroups(grid: Grid): void {
    const inBounds = (x: number, y: number) =>
      x >= 0 && x < grid.width && y >= 0 && y < grid.height;

    for (const [id, group] of this.doomedGroups) {
      let hasSuper = false;
      let groupColor = -1;
      for (const k of group.cells) {
        const [gx, gy] = parseKey(k);
        const cell = grid.get(gx, gy);
        if (cell && cell.hasDot) {
          hasSuper = true;
          groupColor = cell.color;
          break;
        }
        if (cell) groupColor = cell.color;
      }
      if (!hasSuper || groupColor < 0) continue;
      group.hasDot = true;

      const added = new Set<string>();
      const queue: string[] = [...group.cells];
      while (queue.length > 0) {
        const k = queue.shift()!;
        const [cx, cy] = parseKey(k);
        for (const d of ORTH) {
          const nx = cx + d.dx;
          const ny = cy + d.dy;
          const nk = key(nx, ny);
          if (!inBounds(nx, ny) || group.cells.has(nk) || added.has(nk)) continue;
          const cell = grid.get(nx, ny);
          if (!cell || cell.color !== groupColor) continue;
          added.add(nk);
          queue.push(nk);
          const c = grid.get(nx, ny)!;
          c.doomedId = id;
          c.marked = true;
          group.cells.add(nk);
        }
      }
    }
  }

  /**
   * Clear doomed groups only in the step when the sweep has just passed the group's rightmost column.
   * Returns total cells cleared and per-group info (cellCount, hasDot) for scoring.
   */
  clearDoomedGroupsPassedBySweep(grid: Grid, sweepCol: number): { totalCleared: number; groups: ClearedGroup[] } {
    this.syncDoomedGroupsFromGrid(grid);
    const width = grid.width;
    let total = 0;
    const groupsToRemove: number[] = [];
    const clearedGroups: ClearedGroup[] = [];
    for (const [id, group] of this.doomedGroups) {
      if (group.cells.size === 0) {
        groupsToRemove.push(id);
        continue;
      }
      let maxX = -1;
      for (const k of group.cells) {
        const [x] = parseKey(k);
        if (x > maxX) maxX = x;
      }
      const colAfterGroup = (maxX + 1) % width;
      if (sweepCol !== colAfterGroup) continue;
      let groupCleared = 0;
      for (const k of group.cells) {
        const [gx, gy] = parseKey(k);
        if (grid.get(gx, gy)) {
          grid.set(gx, gy, null);
          total += 1;
          groupCleared += 1;
        }
      }
      clearedGroups.push({ cellCount: groupCleared, hasDot: group.hasDot === true });
      groupsToRemove.push(id);
    }
    for (const id of groupsToRemove) this.doomedGroups.delete(id);
    return { totalCleared: total, groups: clearedGroups };
  }
}
