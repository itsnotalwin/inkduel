import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { fail, getSessionPlayer, ok } from "@/lib/session";
import { eloDelta } from "@/lib/elo";
import { ACHIEVEMENTS, legendaryUnlocks } from "@/lib/achievements";
import { validateDeck } from "@/game/decks";
import { BOT_BY_KEY } from "@/game/ai";
import { getCard } from "@/game/cards";
import { questForDate, todayKey } from "@/lib/quests";
import { rankFor } from "@/config";

const matchSchema = z.object({
  opponentKey: z.string(),
  result: z.enum(["WIN", "LOSS", "DRAW"]),
  turns: z.number().int().min(0).max(500),
  playerHpLeft: z.number().int().min(0).max(30),
  botHpLeft: z.number().int().min(0).max(30),
  seed: z.number().int(),
  durationMs: z.number().int().min(0).max(1000 * 60 * 60).optional(),
  deckUsed: z.array(z.object({ cardId: z.string(), count: z.number().int().min(1).max(2) })),
  actionLog: z
    .array(z.object({ turn: z.number(), side: z.string(), text: z.string() }))
    .max(400)
    .optional(),
  actions: z
    .array(
      z.object({
        type: z.enum(["MULLIGAN", "PLAY_CARD", "ATTACK", "END_TURN"]),
        side: z.string(),
      }).passthrough(),
    )
    .max(2000)
    .optional(),
  maxTurnDamage: z.number().int().min(0).max(100).optional(),
  maxTurnKills: z.number().int().min(0).max(10).optional(),
  tookFatigue: z.boolean().optional(),
});

export async function POST(request: Request) {
  const player = await getSessionPlayer();
  if (!player) return fail("Not signed in", 401);

  const body = await request.json().catch(() => null);
  const parsed = matchSchema.safeParse(body);
  if (!parsed.success) return fail("Invalid match payload.");
  const m = parsed.data;

  const bot = BOT_BY_KEY[m.opponentKey];
  if (!bot) return fail("Unknown opponent.");

  // the deck must at least be a legal 20-card list (copy limits etc.)
  if (validateDeck(m.deckUsed).length > 0) return fail("The deck used is not a legal 20-card deck.");

  // Elo is recomputed server-side against the bot's fixed rating — client MMR is never trusted.
  const { delta, newMmr } = eloDelta(player.mmr, bot.elo, m.result);

  const result =
    m.result === "WIN" ? { wins: { increment: 1 } } : m.result === "LOSS" ? { losses: { increment: 1 } } : { draws: { increment: 1 } };
  const streak = m.result === "WIN" ? player.streak + 1 : m.result === "LOSS" ? 0 : player.streak;
  // ink economy: every duel pays out
  const coinsAwarded = m.result === "WIN" ? 50 : m.result === "DRAW" ? 25 : 15;

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
      opponentKey: m.opponentKey,
      result: m.result,
      playerHpLeft: m.playerHpLeft,
      botHpLeft: m.botHpLeft,
      turns: m.turns,
      playerMmrBefore: player.mmr,
      playerMmrAfter: newMmr,
      botMmr: bot.elo,
      durationMs: m.durationMs ?? 0,
      seed: m.seed,
      deckUsed: m.deckUsed,
      actionLog: m.actionLog ?? undefined,
      actions: m.actions ? (JSON.parse(JSON.stringify(m.actions)) as Prisma.InputJsonValue) : undefined,
      maxTurnDamage: m.maxTurnDamage ?? 0,
      maxTurnKills: m.maxTurnKills ?? 0,
      tookFatigue: m.tookFatigue ?? false,
    },
  });

  // CardStat aggregation (powers the meta page)
  const winner = m.result === "WIN";
  for (const entry of m.deckUsed) {
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
    const add = template.metric === "matches" ? 1 : template.metric === "wins" ? (m.result === "WIN" ? 1 : 0) : Math.max(0, 30 - m.botHpLeft);
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
      opponentKey: m.opponentKey,
      result: m.result,
      turns: m.turns,
      playerHpLeft: m.playerHpLeft,
      botHpLeft: m.botHpLeft,
      seed: m.seed,
      deckUsed: m.deckUsed,
      durationMs: m.durationMs ?? 0,
      maxTurnDamage: m.maxTurnDamage ?? 0,
      maxTurnKills: m.maxTurnKills ?? 0,
      tookFatigue: m.tookFatigue ?? false,
    },
    held,
  };
  const newlyUnlocked = ACHIEVEMENTS.filter((a) => !held.has(a.key) && a.check(ctx));
  for (const a of newlyUnlocked) {
    await prisma.playerAchievement.create({ data: { playerId: player.id, achievementKey: a.key } });
  }
  const unlockedCards = legendaryUnlocks(newlyUnlocked.map((a) => a.key));

  return ok({
    mmrBefore: player.mmr,
    mmrAfter: newMmr,
    coinsAwarded,
    coinsAfter: updated.coins,
    mmrDelta: delta,
    rankBefore: rankFor(player.mmr).name,
    rankAfter: rankFor(newMmr).name,
    newAchievements: newlyUnlocked.map((a) => ({ key: a.key, name: a.name, description: a.description, unlocksCard: a.unlocksCard ?? null })),
    unlockedCards,
    opponentMmr: bot.elo,
  });
}

export async function GET(request: Request) {
  const player = await getSessionPlayer();
  if (!player) return fail("Not signed in", 401);
  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const perPage = 20;
  const [matches, total] = await Promise.all([
    prisma.match.findMany({
      where: { playerId: player.id },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.match.count({ where: { playerId: player.id } }),
  ]);
  return ok({
    matches: matches.map((m) => ({ ...m, hasActions: m.actions !== null })),
    page,
    pages: Math.max(1, Math.ceil(total / perPage)),
    total,
  });
}

function getCardSafe(id: string) {
  try {
    return getCard(id);
  } catch {
    return null;
  }
}

