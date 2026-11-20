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

// ── house challengers (matchmaking) ─────────────────────────────────────
// Lives here — not in game/ai — so lightweight pages (the front page's
// "find me an opponent") can matchmake without pulling the engine bundle.

export type PolicyKey = "duelist" | "gambler" | "collector" | "archivist";

export interface BotProfile {
  key: PolicyKey;
  name: string;
  elo: number;
  blurb: string;
}

export const BOTS: BotProfile[] = [
  { key: "duelist", name: "The Duelist", elo: 900, blurb: "Aggro. Trades only when it must; otherwise the face is the place." },
  { key: "gambler", name: "The Gambler", elo: 1050, blurb: "Chaos. A fresh random deck every duel and 35% of decisions made on a whim." },
  { key: "collector", name: "The Collector", elo: 1150, blurb: "Value. Floods the board, draws cards, always plays on curve." },
  { key: "archivist", name: "The Archivist", elo: 1400, blurb: "Control. Removes your biggest threat and wins with late legendaries." },
];

export const BOT_BY_KEY: Record<string, BotProfile> = Object.fromEntries(BOTS.map((b) => [b.key, b]));

/** Choose the opponent whose Elo is nearest the player's MMR ± window, with slight randomization. */
export function pickBot(playerMmr: number, window = MATCHMAKING_WINDOW, rand = Math.random): BotProfile {
  const candidates = BOTS.filter((b) => Math.abs(b.elo - playerMmr) <= window);
  if (candidates.length === 0) {
    return BOTS.reduce((best, b) => (Math.abs(b.elo - playerMmr) < Math.abs(best.elo - playerMmr) ? b : best));
  }
  // weight nearer bots higher
  const weights = candidates.map((b) => 1 / (1 + Math.abs(b.elo - playerMmr)));
  const total = weights.reduce((a, w) => a + w, 0);
  let roll = rand() * total;
  for (let i = 0; i < candidates.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return candidates[i];
  }
  return candidates[candidates.length - 1];
}
