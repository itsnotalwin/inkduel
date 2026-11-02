/**
 * The ranked core of match recording, shared by /api/matches (bot duels) and
 * the multiplayer tape verification (/api/mp/result). Runs without cookies —
 * the caller supplies the player id and the opponent's rating (bots use their
 * fixed elo; duel opponents their current MMR).
 */
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { eloDelta, type MatchResult } from "@/lib/elo";
import { ACHIEVEMENTS, legendaryUnlocks } from "@/lib/achievements";
import { getCard } from "@/game/cards";
import type { DeckEntry } from "@/game/decks";
import { questForDate, todayKey } from "@/lib/quests";
import { rankFor } from "@/config";

export interface RecordMatchInput {
  playerId: string;
  opponentKey: string;
  /** Rating the Elo delta is computed against — never the client's claim. */
  opponentMmr: number;
  result: MatchResult;
  turns: number;
  playerHpLeft: number;
  botHpLeft: number;
  seed: number;
  durationMs?: number;
  deckUsed: DeckEntry[];
  actionLog?: { turn: number; side: string; text: string }[];
  actions?: { type: string; side: string }[];
  maxTurnDamage?: number;
  maxTurnKills?: number;
  tookFatigue?: boolean;
}

export async function recordMatch(input: RecordMatchInput) {
  const player = await prisma.player.findUniqueOrThrow({ where: { id: input.playerId } });

  // Elo is recomputed server-side against the opponent's rating — client MMR is never trusted.
  const { delta, newMmr } = eloDelta(player.mmr, input.opponentMmr, input.result);

  const result =
    input.result === "WIN" ? { wins: { increment: 1 } } : input.result === "LOSS" ? { losses: { increment: 1 } } : { draws: { increment: 1 } };
  const streak = input.result === "WIN" ? player.streak + 1 : input.result === "LOSS" ? 0 : player.streak;
  // ink economy: every duel pays out
  const coinsAwarded = input.result === "WIN" ? 50 : input.result === "DRAW" ? 25 : 15;

  const updated = await prisma.player.update({
    where: { id: player.id },
    data: {
      ...result,
      mmr: newMmr,
      streak,
      bestStreak: Math.max(player.bestStreak, streak),
      coins: { increment: coinsAwarded },
    },
  });

  await prisma.match.create({
    data: {
      playerId: player.id,
      opponentKey: input.opponentKey,
      result: input.result,
      playerHpLeft: input.playerHpLeft,
      botHpLeft: input.botHpLeft,
      turns: input.turns,
      playerMmrBefore: player.mmr,
      playerMmrAfter: newMmr,
      botMmr: input.opponentMmr,
      durationMs: input.durationMs ?? 0,
      seed: input.seed,
      deckUsed: JSON.parse(JSON.stringify(input.deckUsed)) as Prisma.InputJsonValue,
      actionLog: input.actionLog ?? undefined,
      actions: input.actions ? (JSON.parse(JSON.stringify(input.actions)) as Prisma.InputJsonValue) : undefined,
      maxTurnDamage: input.maxTurnDamage ?? 0,
      maxTurnKills: input.maxTurnKills ?? 0,
      tookFatigue: input.tookFatigue ?? false,
    },
  });

  // CardStat aggregation (powers the meta page)
  const winner = input.result === "WIN";
  for (const entry of input.deckUsed) {
    if (!getCardSafe(entry.cardId)) continue;
    await prisma.cardStat.upsert({
      where: { cardId: entry.cardId },
      create: { cardId: entry.cardId, gamesPlayed: entry.count, wins: winner ? entry.count : 0 },
      update: {
        gamesPlayed: { increment: entry.count },
        ...(winner ? { wins: { increment: entry.count } } : {}),
      },
    });
  }

  // daily quest progress
  const dateKey = todayKey();
  const template = questForDate(dateKey, player.id);
  const quest = await prisma.dailyQuest.upsert({
    where: { playerId_date: { playerId: player.id, date: dateKey } },
    create: { playerId: player.id, date: dateKey, templateKey: template.key, target: template.target, progress: 0 },
    update: {},
  });
  if (!quest.completed) {
    const add = template.metric === "matches" ? 1 : template.metric === "wins" ? (input.result === "WIN" ? 1 : 0) : Math.max(0, 30 - input.botHpLeft);
    const progress = Math.min(template.target, quest.progress + add);
    await prisma.dailyQuest.update({
      where: { id: quest.id },
      data: { progress, completed: progress >= template.target },
    });
  }

  // achievements
  const heldRows = await prisma.playerAchievement.findMany({ where: { playerId: player.id } });
  const held = new Set(heldRows.map((h) => h.achievementKey));
  const customDeckCount = await prisma.deck.count({ where: { playerId: player.id, isCustom: true } });
  const ctx = {
    wins: updated.wins,
    losses: updated.losses,
    draws: updated.draws,
    streak: updated.streak,
    bestStreak: updated.bestStreak,
    mmr: updated.mmr,
    customDeckCount,
    match: {
      opponentKey: input.opponentKey,
      result: input.result,
      turns: input.turns,
      playerHpLeft: input.playerHpLeft,
      botHpLeft: input.botHpLeft,
      seed: input.seed,
      deckUsed: input.deckUsed,
      durationMs: input.durationMs ?? 0,
      maxTurnDamage: input.maxTurnDamage ?? 0,
      maxTurnKills: input.maxTurnKills ?? 0,
      tookFatigue: input.tookFatigue ?? false,
    },
    held,
  };
  const newlyUnlocked = ACHIEVEMENTS.filter((a) => !held.has(a.key) && a.check(ctx));
  for (const a of newlyUnlocked) {
    await prisma.playerAchievement.create({ data: { playerId: player.id, achievementKey: a.key } });
  }
  const unlockedCards = legendaryUnlocks(newlyUnlocked.map((a) => a.key));

  return {
    mmrBefore: player.mmr,
    mmrAfter: newMmr,
    coinsAwarded,
    coinsAfter: updated.coins,
    mmrDelta: delta,
    rankBefore: rankFor(player.mmr).name,
    rankAfter: rankFor(newMmr).name,
    newAchievements: newlyUnlocked.map((a) => ({ key: a.key, name: a.name, description: a.description, unlocksCard: a.unlocksCard ?? null })),
    unlockedCards,
    opponentMmr: input.opponentMmr,
  };
}

function getCardSafe(id: string) {
  try {
    return getCard(id);
  } catch {
    return null;
  }
}
