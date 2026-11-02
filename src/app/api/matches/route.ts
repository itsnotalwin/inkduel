import { z } from "zod";
import { prisma } from "@/lib/db";
import { fail, getSessionPlayer, ok } from "@/lib/session";
import { validateDeck } from "@/game/decks";
import { BOT_BY_KEY } from "@/game/ai";
import { recordMatch } from "@/lib/record-match";

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

  // Elo and all ranked side effects live in record-match; the bot's fixed
  // rating is the opponent MMR the delta is computed against.
  return ok(
    await recordMatch({
      playerId: player.id,
      opponentKey: m.opponentKey,
      opponentMmr: bot.elo,
      result: m.result,
      turns: m.turns,
      playerHpLeft: m.playerHpLeft,
      botHpLeft: m.botHpLeft,
      seed: m.seed,
      durationMs: m.durationMs,
      deckUsed: m.deckUsed,
      actionLog: m.actionLog,
      actions: m.actions,
      maxTurnDamage: m.maxTurnDamage,
      maxTurnKills: m.maxTurnKills,
      tookFatigue: m.tookFatigue,
    }),
  );
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
