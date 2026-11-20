/**
 * The single evaluation point for achievements, shared by every flow that can
 * unlock one: ranked matches (recordMatch), campaign clears, pack opens,
 * puzzle solves, and crafting. The aggregate context is built server-side —
 * counters, campaign frontier, the live Blot mutation — so nothing here
 * trusts the client; callers only contribute the match they recorded.
 */
import { prisma } from "@/lib/db";
import { ACHIEVEMENTS, legendaryUnlocks, type AchievementContext } from "@/lib/achievements";
import { blotActiveMutationFor } from "@/game/blot";
import type { MatchCore } from "@/lib/match-summary";

export interface UnlockResult {
  newAchievements: { key: string; name: string; description: string; unlocksCard: string | null }[];
  unlockedCards: string[];
}

/** A neutral match so non-match flows can't trip match-conditional checks. */
const EMPTY_MATCH: MatchCore = {
  opponentKey: "",
  result: "DRAW",
  turns: 0,
  playerHpLeft: 0,
  botHpLeft: 0,
  seed: 0,
  deckUsed: [],
  durationMs: 0,
  maxTurnDamage: 0,
  maxTurnKills: 0,
  tookFatigue: false,
};

/**
 * Check every achievement against the player's current server state plus the
 * caller's match (if any), persist the newly unlocked, and return them.
 * Call AFTER the counter/state this evaluation should see has been written.
 */
export async function evaluateAchievements(playerId: string, match?: MatchCore): Promise<UnlockResult> {
  const player = await prisma.player.findUniqueOrThrow({ where: { id: playerId } });
  const heldRows = await prisma.playerAchievement.findMany({ where: { playerId } });
  const held = new Set(heldRows.map((h) => h.achievementKey));
  const [customDeckCount, puzzlesSolved] = await Promise.all([
    prisma.deck.count({ where: { playerId, isCustom: true } }),
    prisma.puzzleSolved.count({ where: { playerId } }),
  ]);
  const ctx: AchievementContext = {
    wins: player.wins,
    losses: player.losses,
    draws: player.draws,
    streak: player.streak,
    bestStreak: player.bestStreak,
    mmr: player.mmr,
    customDeckCount,
    campaignStage: player.campaignStage,
    packsOpened: player.packsOpened,
    puzzlesSolved,
    cardsCrafted: player.cardsCrafted,
    blotActive: blotActiveMutationFor(Date.now()) !== null,
    match: match ?? EMPTY_MATCH,
    held,
  };
  const newlyUnlocked = ACHIEVEMENTS.filter((a) => !held.has(a.key) && a.check(ctx));
  for (const a of newlyUnlocked) {
    await prisma.playerAchievement.create({ data: { playerId, achievementKey: a.key } });
  }
  return {
    newAchievements: newlyUnlocked.map((a) => ({
      key: a.key,
      name: a.name,
      description: a.description,
      unlocksCard: a.unlocksCard ?? null,
    })),
    unlockedCards: legendaryUnlocks(newlyUnlocked.map((a) => a.key)),
  };
}
