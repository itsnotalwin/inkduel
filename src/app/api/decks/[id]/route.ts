import { z } from "zod";
import { prisma } from "@/lib/db";
import { fail, getSessionPlayer, ok } from "@/lib/session";
import { validateDeck, type DeckEntry } from "@/game/decks";
import { legendaryUnlocks } from "@/lib/achievements";
import { COLLECTIBLE_CARDS } from "@/game/cards";

const deckSchema = z.object({
  name: z.string().trim().min(1).max(40).optional(),
  cards: z.array(z.object({ cardId: z.string(), count: z.number().int().min(1).max(2) })).max(40).optional(),
  isActive: z.boolean().optional(),
});

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const player = await getSessionPlayer();
  if (!player) return fail("Not signed in", 401);
  const { id } = await params;
  const deck = await prisma.deck.findUnique({ where: { id } });
  if (!deck || deck.playerId !== player.id) return fail("Deck not found", 404);

  const body = await request.json().catch(() => null);
  const parsed = deckSchema.safeParse(body);
  if (!parsed.success) return fail("Invalid deck payload.");
  const { name, cards, isActive } = parsed.data;

  if (cards) {
    const unlockedRows = await prisma.playerAchievement.findMany({ where: { playerId: player.id } });
    const legendaries = new Set(legendaryUnlocks(unlockedRows.map((u) => u.achievementKey)));
    const owned = new Set(
      COLLECTIBLE_CARDS.filter((c) => c.rarity !== "legendary" || legendaries.has(c.id)).map((c) => c.id),
    );
    const errors = validateDeck(cards as DeckEntry[], owned);
    if (errors.length > 0) return fail(errors.join(" "), 422);
  }

  if (isActive) {
    await prisma.deck.updateMany({ where: { playerId: player.id }, data: { isActive: false } });
  }
  const updated = await prisma.deck.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(cards !== undefined ? { cards } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    },
  });
  return ok(updated);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const player = await getSessionPlayer();
  if (!player) return fail("Not signed in", 401);
  const { id } = await params;
  const deck = await prisma.deck.findUnique({ where: { id } });
  if (!deck || deck.playerId !== player.id) return fail("Deck not found", 404);
  await prisma.deck.delete({ where: { id } });
  return ok({ deleted: id });
}
