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
  /** Highest campaign frontier — stage index n cleared ⇒ campaignStage > n. */
  campaignStage: number;
  /** Server-tracked counters for the set-2 progression systems. */
  packsOpened: number;
  puzzlesSolved: number;
  cardsCrafted: number;
  /** True when the duel just recorded carried this week's live Blot mutation. */
  blotActive: boolean;
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
  // ── set 2: the newer systems — campaign, packs, puzzles, draft, the blot ──
  { key: "stage_one", name: "New Assignment", description: "Clear campaign stage 1", icon: "page", check: (c) => c.campaignStage >= 2 },
  { key: "campaign_half", name: "Midnight Oil", description: "Clear 10 campaign stages", icon: "book", check: (c) => c.campaignStage >= 10 },
  { key: "campaign_complete", name: "The Whole Edition", description: "Clear the full campaign", icon: "stamp", unlocksCard: "the_collected_works", check: (c) => c.campaignStage >= 20 },
  { key: "pack_first", name: "Shrink-Wrapped", description: "Open your first pack", icon: "wax", check: (c) => c.packsOpened >= 1 },
  { key: "pack_ten", name: "The Collector's Eye", description: "Open 10 packs", icon: "badge", check: (c) => c.packsOpened >= 10 },
  { key: "pack_thirty", name: "Bound Volumes", description: "Open 30 packs", icon: "shelf", check: (c) => c.packsOpened >= 30 },
  { key: "puzzle_first", name: "Marginalia", description: "Solve your first daily test", icon: "nib", check: (c) => c.puzzlesSolved >= 1 },
  { key: "puzzle_archive", name: "The Proofreader", description: "Solve every test in the archive", icon: "pen", check: (c) => c.puzzlesSolved >= 6 },
  { key: "draft_win", name: "Fresh Ink", description: "Win a duel with a drafted deck", icon: "clock", unlocksCard: "the_second_edition", check: (c) => c.match.opponentKey === "ink-draft" && c.match.result === "WIN" },
  { key: "blot_survivor", name: "Stain Survivor", description: "Win a duel while a Blot mutation is live", icon: "target", check: (c) => c.blotActive && c.match.result === "WIN" },
  { key: "comeback", name: "Second Draft", description: "Win a match with 5 HP or less", icon: "heart", unlocksCard: "the_eraser_of_ends", check: (c) => c.match.result === "WIN" && c.match.playerHpLeft <= 5 },
  { key: "craft_first", name: "Paper Trail", description: "Craft a card from recycled slips", icon: "shield", check: (c) => c.cardsCrafted >= 1 },
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
