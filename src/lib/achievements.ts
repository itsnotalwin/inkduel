/**
 * Achievement definitions (seeded verbatim from the spec §8.1) and the
 * server-side evaluation that unlocks them. ★ achievements also unlock a
 * legendary card into the player's collection.
 */
import type { MatchCore } from "./match-summary";

export interface AchievementDef {
  key: string;
  name: string;
  description: string;
  icon: string;
  /** Legendary card unlocked by this achievement, if any. */
  unlocksCard?: string;
  /** Condition over the player's aggregate record + the match just played. */
  check: (ctx: AchievementContext) => boolean;
}

export interface AchievementContext {
  wins: number;
  losses: number;
  draws: number;
  streak: number;
  bestStreak: number;
  mmr: number;
  customDeckCount: number;
  /** Stats from the match just played (all fields materialized). */
  match: MatchCore;
  /** Achievements the player already holds. */
  held: Set<string>;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { key: "first_blood", name: "Opening Line", description: "Win your first match", icon: "nib", check: (c) => c.wins >= 1 },
  { key: "hat_trick", name: "Hattrick in Ink", description: "Win 3 matches in a row", icon: "wax", unlocksCard: "the_living_manuscript", check: (c) => c.bestStreak >= 3 },
  { key: "last_page", name: "The Last Page", description: "Win a match with exactly 1 HP", icon: "page", check: (c) => c.match.result === "WIN" && c.match.playerHpLeft === 1 },
  { key: "assassin", name: "Red Ink", description: "Deal 12+ damage in a single turn", icon: "pen", unlocksCard: "the_unwritten", check: (c) => c.match.maxTurnDamage >= 12 },
  { key: "speedrun", name: "First Draft", description: "Win a match in 8 turns or fewer", icon: "clock", unlocksCard: "the_archivist", check: (c) => c.match.result === "WIN" && c.match.turns <= 8 },
  { key: "gold_rush", name: "Gold Standard", description: "Reach Gold rank", icon: "badge", unlocksCard: "the_grand_palimpsest", check: (c) => c.mmr >= 1400 },
  { key: "scholar", name: "Well-Read", description: "Play 25 matches", icon: "book", check: (c) => c.wins + c.losses + c.draws >= 25 },
  { key: "hunter", name: "Bounty Hunter", description: "Win 10 matches", icon: "target", check: (c) => c.wins >= 10 },
  { key: "perfect_trade", name: "Clean Margins", description: "Destroy 3+ enemy units in one turn", icon: "shield", check: (c) => c.match.maxTurnKills >= 3 },
  { key: "librarian", name: "The Librarian", description: "Create 3 custom decks", icon: "shelf", check: (c) => c.customDeckCount >= 3 },
  { key: "survivor", name: "Fatigue Proof", description: "Win a match after taking fatigue damage", icon: "heart", check: (c) => c.match.result === "WIN" && c.match.tookFatigue },
  { key: "veteran", name: "Permanent Record", description: "Reach Platinum rank", icon: "stamp", check: (c) => c.mmr >= 1600 },
];

export const ACHIEVEMENT_BY_KEY = new Map(ACHIEVEMENTS.map((a) => [a.key, a]));

/** Which legendaries the player owns: all C/R/E are free; legendaries come from ★ achievements. */
export function legendaryUnlocks(unlockedKeys: Iterable<string>): string[] {
  const out: string[] = [];
  for (const key of unlockedKeys) {
    const a = ACHIEVEMENT_BY_KEY.get(key);
    if (a?.unlocksCard) out.push(a.unlocksCard);
  }
  return out;
}
