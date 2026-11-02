import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { fail, getSessionPlayer, ok } from "@/lib/session";
import { validateDeck } from "@/game/decks";

const bodySchema = z.object({
  code: z.string().transform((s) => s.trim().toUpperCase()),
  name: z.string().trim().min(2).max(24),
  deck: z.array(z.object({ cardId: z.string(), count: z.number().int().min(1).max(2) })),
});

/**
 * Join a waiting duel by invite code: the caller becomes player B, both deck
 * lists are stored, and the duel flips to `active` — from here both clients
 * build the same game with createGame(seed, deckA, deckB, "A").
 */
export async function POST(request: Request) {
  const player = await getSessionPlayer();
  if (!player) return fail("Not signed in", 401);

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return fail("Invalid duel payload.");

  const deckErrors = validateDeck(parsed.data.deck);
  if (deckErrors.length > 0) return fail(deckErrors.join(" "), 400);

  const duel = await prisma.duel.findUnique({ where: { code: parsed.data.code } });
  if (!duel) return fail("No duel with that code.", 404);
  if (duel.status !== "waiting") return fail("That duel is already full.", 409);

  const playerA = await prisma.player.findUnique({ where: { id: duel.playerAId } });
  if (!playerA) return fail("No duel with that code.", 404);

  const updated = await prisma.duel.update({
    where: { id: duel.id },
    data: {
      playerBId: player.id,
      deckB: JSON.parse(JSON.stringify(parsed.data.deck)) as Prisma.InputJsonValue,
      status: "active",
    },
  });

  return ok({
    duelId: updated.id,
    code: updated.code,
    seed: updated.seed,
    deckA: updated.deckA,
    deckB: updated.deckB,
    yourSide: "B" as const,
    opponentName: `${playerA.name}${playerA.tag}`,
  });
}
