import { z } from "zod";
import { prisma } from "@/lib/db";
import { fail, getSessionPlayer, ok } from "@/lib/session";
import { validateDeck, type DeckEntry } from "@/game/decks";
import { legendaryUnlocks } from "@/lib/achievements";
import { COLLECTIBLE_CARDS } from "@/game/cards";

const deckSchema = z.object({
  name: z.string().trim().min(1).max(40),
  cards: z.array(z.object({ cardId: z.string(), count: z.number().int().min(1).max(2) })).max(40),
  isActive: z.boolean().optional(),
});

async function ownedSet(playerId: string): Promise<Set<string>> {
  const unlocked = await prisma.playerAchievement.findMany({ where: { playerId } });
  const legendaries = new Set(legendaryUnlocks(unlocked.map((u) => u.achievementKey)));
  return new Set(
    COLLECTIBLE_CARDS.filter((c) => c.rarity !== "legendary" || legendaries.has(c.id)).map((c) => c.id),
  );
}

export async function GET() {
  const player = await getSessionPlayer();
  if (!player) return fail("Not signed in", 401);
  const decks = await prisma.deck.findMany({
    where: { playerId: player.id },
    orderBy: { createdAt: "asc" },
  });
  return ok(decks);
}

export async function POST(request: Request) {
  const player = await getSessionPlayer();
  if (!player) return fail("Not signed in", 401);
  const body = await request.json().catch(() => null);
  const parsed = deckSchema.safeParse(body);
  if (!parsed.success) return fail("Invalid deck payload.");
  const { name, cards, isActive } = parsed.data;

  const errors = validateDeck(cards as DeckEntry[], await ownedSet(player.id));
  if (errors.length > 0) return fail(errors.join(" "), 422);

  const deck = await prisma.deck.create({
    data: { playerId: player.id, name, cards, isCustom: true, isActive: false },
  });
  if (isActive) {
    await prisma.deck.updateMany({ where: { playerId: player.id }, data: { isActive: false } });
    await prisma.deck.update({ where: { id: deck.id }, data: { isActive: true } });
  }
  return ok(deck, { status: 201 });
}
