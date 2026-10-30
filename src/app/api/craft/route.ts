import { z } from "zod";
import { prisma } from "@/lib/db";
import { fail, getSessionPlayer, ok } from "@/lib/session";
import { ownedCardIds } from "@/lib/collection";
import { getCard } from "@/game/cards";
import { canCraft, spendSlips, ZERO_SLIPS, CRAFT_COST, type Slips } from "@/game/packs";

/**
 * Ink Recycling: spend duplicate slips to craft any collectible card the
 * player does not own yet. The cost is the card's rarity; slips come from
 * pack duplicates (see /api/packs).
 */
const bodySchema = z.object({ cardId: z.string().min(1) });

export async function POST(request: Request) {
  const player = await getSessionPlayer();
  if (!player) return fail("Not signed in", 401);

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return fail("Invalid craft payload.");

  let def;
  try {
    def = getCard(parsed.data.cardId);
  } catch {
    return fail("Unknown card.");
  }

  const held = await prisma.playerAchievement.findMany({ where: { playerId: player.id } });
  const extras = (player.extraCards as string[] | null) ?? [];
  const owned = ownedCardIds(held.map((h) => h.achievementKey), extras);
  if (owned.has(def.id)) return fail("You already own that card.");

  const slips: Slips = { ...ZERO_SLIPS, ...((player.recycleSlips as Slips | null) ?? {}) };
  if (!canCraft(slips, def.rarity)) {
    return fail(
      `Not enough slips — crafting a ${def.rarity} card takes ${CRAFT_COST[def.rarity]} duplicates of the same rarity.`,
      422,
    );
  }

  const slipsAfter = spendSlips(slips, def.rarity);
  await prisma.player.update({
    where: { id: player.id },
    data: { recycleSlips: slipsAfter, extraCards: [...extras, def.id] },
  });

  return ok({ cardId: def.id, rarity: def.rarity, slips: slipsAfter });
}
