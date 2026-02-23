/**
 * Base URL for all art/assets (images, video, audio).
 * - If VITE_ASSETS_BASE is set (e.g. CDN or second repo), use that so the main repo stays small.
 * - Otherwise use Vite BASE_URL (same origin: '' in dev, '/REPO_NAME/' on GitHub Pages).
 * Use: ASSET_BASE + 'assets/...' (no leading slash after ASSET_BASE).
 */
function getAssetBase(): string {
  if (typeof import.meta === 'undefined') return '/';
  const env = (import.meta as { env?: { BASE_URL?: string; VITE_ASSETS_BASE?: string } }).env;
  const external = env?.VITE_ASSETS_BASE;
  if (external && typeof external === 'string') {
    return external.endsWith('/') ? external : `${external}/`;
  }
  return env?.BASE_URL ?? '/';
}
export const ASSET_BASE = getAssetBase();

export const GRID_COLS = 16;
export const GRID_ROWS = 10;
export const BOARD_WIDTH = 460;
export const BOARD_HEIGHT = 300;
/** Grid video (track 1 intro, track 10): scale width so video sits further inside the box. 1 = full width. */
export const GRID_VIDEO_WIDTH_SCALE = 0.8;
export const CELL_WIDTH = BOARD_WIDTH / GRID_COLS;
export const CELL_HEIGHT = BOARD_HEIGHT / GRID_ROWS;

export const BOARD_MARGIN_TOP = 80;
/** Space above the grid for the "current piece" preview */
export const CURRENT_PIECE_PREVIEW_HEIGHT = 44;
export const COLORS = [0xffd54f, 0x4fc3f7];

/** Block colors for Art Tape track 1 (Touched): green and orange */
const BLOCK_COLORS_STAGE1 = [0x4caf50, 0xff9800];

/** Block colors for Art Tape track 2 (stage 2): blue and red */
const BLOCK_COLORS_STAGE2 = [0x2196f3, 0xf44336];
/** Block colors for Art Tape track 3 (stage 3): red and white */
const BLOCK_COLORS_STAGE3 = [0xff5252, 0xffffff];
/** Block colors for Art Tape track 4 (stage 4): pink and sea green */
const BLOCK_COLORS_STAGE4 = [0xf48fb1, 0x2e8b57];
/** Block colors for Art Tape track 5 (stage 5): white and blue */
const BLOCK_COLORS_STAGE5 = [0xffffff, 0x2196f3];
/** Block colors for Art Tape track 7 (Lucky Guy): green and purple */
const BLOCK_COLORS_STAGE7 = [0x66bb6a, 0x9c27b0];
/** Block colors for Art Tape track 8 (Better off): red and orange */
const BLOCK_COLORS_STAGE8 = [0xff5252, 0xff9800];
/** Block colors for Art Tape track 9 (Night Sweat): teal and gold */
const BLOCK_COLORS_STAGE9 = [0x00897b, 0xffb300];
/** Block colors for Art Tape track 10 (video track) */
const BLOCK_COLORS_STAGE10 = [0xe040fb, 0x00e5ff];

/** Arcade mode: pool of two-color palettes; one is picked at random each game. */
const ARCADE_COLOR_PALETTES: number[][] = [
  COLORS,
  BLOCK_COLORS_STAGE1,
  BLOCK_COLORS_STAGE2,
  BLOCK_COLORS_STAGE3,
  BLOCK_COLORS_STAGE4,
  BLOCK_COLORS_STAGE5,
  BLOCK_COLORS_STAGE7,
  BLOCK_COLORS_STAGE8,
  BLOCK_COLORS_STAGE9,
  [0xffd54f, 0x9e9e9e],
  [0x4fc3f7, 0xffeb3b],
  [0xe91e63, 0x00bcd4],
];

/** Returns a random two-color palette for arcade mode. */
export function getRandomArcadeColors(): number[] {
  const i = Math.floor(Math.random() * ARCADE_COLOR_PALETTES.length);
  return [...ARCADE_COLOR_PALETTES[i]];
}

/** Returns the two block colors for the current track. */
export function getBlockColors(trackId?: string | null): number[] {
  if (trackId === 'v3-01') return BLOCK_COLORS_STAGE1;
  if (trackId === 'v3-02') return BLOCK_COLORS_STAGE2;
  if (trackId === 'v3-03') return BLOCK_COLORS_STAGE3;
  if (trackId === 'v3-04') return BLOCK_COLORS_STAGE4;
  if (trackId === 'v3-05') return BLOCK_COLORS_STAGE5;
  if (trackId === 'v3-07') return BLOCK_COLORS_STAGE7;
  if (trackId === 'v3-08') return BLOCK_COLORS_STAGE8;
  if (trackId === 'v3-09') return BLOCK_COLORS_STAGE9;
  if (trackId === 'v3-10') return BLOCK_COLORS_STAGE10;
  return COLORS;
}

export const GRAVITY_INTERVAL_MS = 700;
export const SWEEP_INTERVAL_MS = 520;
/** Arcade mode: sweeper starts a bit faster than default. */
export const ARCADE_SWEEP_INTERVAL_MS = 400;
/** Pause before the piece starts falling (one beat feel) */
export const SPAWN_HOLD_MS = 600;

/** Arcade / Darkstalkers-style pixel font */
export const ARCADE_FONT = '"Press Start 2P", monospace';

