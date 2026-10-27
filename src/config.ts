/**
 * Global game configuration. Rename the game by changing GAME_NAME here.
 */
export const GAME_NAME = "INKDUEL";
export const GAME_TAGLINE = "the paper duel gazette";

/** Elo K-factor. */
export const ELO_K = 32;
export const STARTING_MMR = 1000;
export const MATCHMAKING_WINDOW = 80;
export const LEADERBOARD_SIZE = 100;

/** Hero + board constants (authoritative, mirrored by the engine). */
export const HERO_HP = 30;
export const BOARD_SLOTS = 5;
export const DECK_SIZE = 20;
export const MAX_COPIES = 2;
export const MAX_LEGENDARY_COPIES = 1;
export const START_HAND = 4;
export const STARTING_MANA = 3;
export const MANA_CAP = 10;
export const TURN_SECONDS = 75;

export const RANKS = [
  { key: "wood", name: "Wood", min: 0 },
  { key: "bronze", name: "Bronze", min: 1000 },
  { key: "silver", name: "Silver", min: 1200 },
  { key: "gold", name: "Gold", min: 1400 },
  { key: "platinum", name: "Platinum", min: 1600 },
  { key: "obsidian", name: "Obsidian", min: 1800 },
  { key: "ink-master", name: "INK MASTER", min: 2000 },
] as const;

export type RankKey = (typeof RANKS)[number]["key"];

export function rankFor(mmr: number): (typeof RANKS)[number] {
  let rank: (typeof RANKS)[number] = RANKS[0];
  for (const r of RANKS) if (mmr >= r.min) rank = r;
  return rank;
}

export function nextRank(mmr: number): (typeof RANKS)[number] | null {
  for (const r of RANKS) if (r.min > mmr) return r;
  return null;
}
