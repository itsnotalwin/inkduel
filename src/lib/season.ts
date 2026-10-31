/**
 * Seasonal ladder ("Issues"): a soft MMR reset each calendar month, an ink
 * payout by final rank, and an Issue badge on the profile. Pure logic shared
 * by the server, the client and the paper edition — the rollover itself is
 * applied lazily wherever a profile is read (no cron needed).
 */
import type { RankKey } from "@/config";
import { rankFor } from "@/config";

/** Issue 1 = January 2026. */
export function currentSeason(now: Date = new Date()): number {
  return (now.getUTCFullYear() - 2026) * 12 + now.getUTCMonth();
}

export function seasonLabel(season: number): string {
  return `Issue ${season + 1}`;
}

/** Soft reset: halfway back to the 1000 baseline, never below it. */
export function seasonResetMmr(mmr: number): number {
  return Math.max(1000, 1000 + Math.round((mmr - 1000) / 2));
}

/** End-of-season ink payout by the rank held when the rollover happens. */
export function seasonPayout(rankKey: RankKey): number {
  const table: Record<RankKey, number> = {
    wood: 50,
    bronze: 100,
    silver: 150,
    gold: 250,
    platinum: 350,
    obsidian: 500,
    "ink-master": 750,
  };
  return table[rankKey];
}

export interface SeasonRolloverResult {
  /** true when the rollover fired for this read */
  applied: boolean;
  /** ink granted with the rollover (0 when none) */
  payout: number;
  /** mmr after the rollover (unchanged when not applied) */
  mmr: number;
  season: number;
}

/**
 * Decide whether a season rollover happens for a player profile.
 * `seasonSeen` is the last season the player was active in (0 = never).
 * Players who never finished a match just get marked current — no payout.
 */
export function applySeasonRollover(
  player: { seasonSeen: number; mmr: number; coins: number; matchesPlayed: number },
  season: number,
): SeasonRolloverResult {
  if (player.seasonSeen >= season) {
    return { applied: false, payout: 0, mmr: player.mmr, season };
  }
  if (player.matchesPlayed <= 0) {
    return { applied: true, payout: 0, mmr: player.mmr, season };
  }
  return {
    applied: true,
    payout: seasonPayout(rankFor(player.mmr).key),
    mmr: seasonResetMmr(player.mmr),
    season,
  };
}
