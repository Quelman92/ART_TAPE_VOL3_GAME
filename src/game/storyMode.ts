import { ASSET_BASE } from './constants';

export interface TrackDef {
  id: string;
  title: string;
  file: string;
  bpm: number;
  unlockScore: number;
}

export interface TracklistManifest {
  albumTitle: string;
  tracks: TrackDef[];
}

const UNLOCK_STORAGE_KEY = 'arttapev3_unlocked_track_ids';
const TOTAL_SCORE_STORAGE_KEY = 'arttapev3_best_total_score';
const UNLOCKED_COUNT_KEY = 'arttapev3_unlocked_track_count';
const TRACKLIST_URL = `${ASSET_BASE}assets/arttapev3/tracklist.json`;

export function getUnlockedTrackIds(): string[] {
  try {
    const raw = localStorage.getItem(UNLOCK_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function unlockTrackId(id: string): void {
  const ids = getUnlockedTrackIds();
  if (ids.includes(id)) return;
  ids.push(id);
  localStorage.setItem(UNLOCK_STORAGE_KEY, JSON.stringify(ids));
}

/** Best total score from any single game; used to determine which tracks are unlocked. */
export function getTotalScoreEver(): number {
  try {
    let raw = localStorage.getItem(TOTAL_SCORE_STORAGE_KEY);
    if (raw == null) {
      const hadUnlocks = getUnlockedTrackIds().length > 0;
      if (hadUnlocks) {
        setTotalScoreEver(3000);
        raw = localStorage.getItem(TOTAL_SCORE_STORAGE_KEY);
      }
    }
    if (raw == null) return 0;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

/** Update stored best total score to at least this run's score. Call when leaving a game. */
export function setTotalScoreEver(score: number): void {
  const current = getTotalScoreEver();
  if (score > current) localStorage.setItem(TOTAL_SCORE_STORAGE_KEY, String(score));
}

/** Number of tracks unlocked (0–9). Unlocks one at a time in order. */
export function getUnlockedTrackCount(tracks: TrackDef[]): number {
  const raw = localStorage.getItem(UNLOCKED_COUNT_KEY);
  if (raw != null) {
    const n = parseInt(raw, 10);
    if (Number.isFinite(n) && n >= 0) return Math.min(n, tracks.length);
  }
  const total = getTotalScoreEver();
  let count = 0;
  for (let i = 0; i < tracks.length; i++) {
    if (total >= tracks[i].unlockScore) count = i + 1;
    else break;
  }
  localStorage.setItem(UNLOCKED_COUNT_KEY, String(count));
  return count;
}

export function setUnlockedTrackCount(count: number): void {
  const n = Math.max(0, Math.min(99, Math.floor(count)));
  localStorage.setItem(UNLOCKED_COUNT_KEY, String(n));
}

/** Call when a game ends: if score meets the next track's threshold, unlock one more (max +1 per game). */
export function tryUnlockNextTrack(score: number, tracks: TrackDef[]): void {
  const count = getUnlockedTrackCount(tracks);
  if (count >= tracks.length) return;
  if (score >= tracks[count].unlockScore) setUnlockedTrackCount(count + 1);
}

/** Track at index i is unlocked if i < unlockedCount (one-at-a-time in order). */
export function isTrackUnlockedByIndex(trackIndex: number, unlockedCount: number): boolean {
  return trackIndex < unlockedCount;
}

export async function fetchTracklist(): Promise<TracklistManifest> {
  const res = await fetch(TRACKLIST_URL);
  if (!res.ok) throw new Error('Failed to load tracklist');
  return res.json() as Promise<TracklistManifest>;
}

export const BEATS_PER_SWEEP = 4;
export const DROPS_PER_BEAT = 1;

export function beatMs(bpm: number): number {
  return 60000 / bpm;
}

export function sweepIntervalMs(bpm: number, gridCols: number): number {
  const beat = beatMs(bpm);
  // One full sweep across the grid = 6 beats (sweeper at 1/6 BPM)
  const sweepTotalMs = beat * 6;
  return sweepTotalMs / gridCols;
}

export function gravityIntervalMs(bpm: number): number {
  return beatMs(bpm) / DROPS_PER_BEAT;
}
