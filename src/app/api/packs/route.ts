import { randomInt } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { fail, getSessionPlayer, ok } from "@/lib/session";
import { ownedCardIds } from "@/lib/collection";
import { PACK_COST, rollPack, slipsFromDuplicates, addSlips, ZERO_SLIPS, type Slips } from "@/game/packs";

/**
 * Open a card pack for ink. Server-side roll (authoritative). New cards are
 * added to the player's extraCards; duplicates refund ink.
 */
export async function POST(request: Request) {
  const player = await getSessionPlayer();
  if (!player) return fail("Not signed in", 401);

  // a purchase endpoint must never guess: malformed or non-conforming
  // bodies are rejected instead of silently opening a pack
  const body = await request.json().catch(() => null);
  const parsed = z
    .object({ packs: z.number().int().min(1).max(10).optional() })
    .safeParse(body);
  if (!parsed.success) return fail("Invalid packs payload.");
  const packs = parsed.data.packs ?? 1;
  const cost = packs * PACK_COST;
  if (player.coins < cost) return fail(`Not enough ink — a pack costs ${PACK_COST}.`, 402);

  // everything the player owns: wave-1 commons/rares/epics + achievement
  // legendaries + previously pulled cards (wave-3 cards are pull-only)
  const held = await prisma.playerAchievement.findMany({ where: { playerId: player.id } });
  const extras = (player.extraCards as string[] | null) ?? [];
  const owned = ownedCardIds(held.map((h) => h.achievementKey), extras);

  const allResults = [];
  const newCards: string[] = [];
  let totalRefund = 0;

  for (let i = 0; i < packs; i++) {
    const result = rollPack(owned, () => randomInt(1_000_000) / 1_000_000);
    for (const card of result.cards) {
      if (card.isNew && !newCards.includes(card.cardId)) {
        newCards.push(card.cardId);
        owned.add(card.cardId);
      }
    }
    allResults.push(result.cards);
    totalRefund += result.totalRefund;
  }

  // Ink Recycling: every duplicate becomes a slip of its rarity
  const currentSlips: Slips = { ...ZERO_SLIPS, ...((player.recycleSlips as Slips | null) ?? {}) };
  const earned = slipsFromDuplicates(allResults.flat());
  const slipsAfter = addSlips(currentSlips, earned);

  const coinsAfter = player.coins - cost + totalRefund;
  const flat = allResults.flat();
  await prisma.player.update({
    where: { id: player.id },
    data: { coins: coinsAfter, extraCards: [...extras, ...newCards], recycleSlips: slipsAfter },
  });

  return ok({
    cards: flat,
    newCards,
    totalRefund,
    cost,
    coinsBefore: player.coins,
    coinsAfter,
    slipsEarned: earned,
    slips: slipsAfter,
    opened: new Date().toISOString(),
  });
}

export async function GET() {
  const player = await getSessionPlayer();
  if (!player) return fail("Not signed in", 401);
  return ok({ coins: player.coins, cost: PACK_COST });
}
