import { randomInt } from "node:crypto";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { fail, getSessionPlayer, ok } from "@/lib/session";
import { validateDeck } from "@/game/decks";

// 6-character invite codes: unambiguous uppercase alphanumerics
const CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

const bodySchema = z.object({
  name: z.string().trim().min(2).max(24),
  deck: z.array(z.object({ cardId: z.string(), count: z.number().int().min(1).max(2) })),
});

function inviteCode(): string {
  let out = "";
  for (let i = 0; i < 6; i++) out += CODE_CHARS[randomInt(CODE_CHARS.length)];
  return out;
}

/**
 * Open a duel: the caller becomes player A, the server rolls the shared seed
 * and hands back an invite code. The duel sits in `waiting` until someone
 * joins with the code (MULTIPLAYER.md §4).
 */
export async function POST(request: Request) {
  const player = await getSessionPlayer();
  if (!player) return fail("Not signed in", 401);

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return fail("Invalid duel payload.");

  const deckErrors = validateDeck(parsed.data.deck);
  if (deckErrors.length > 0) return fail(deckErrors.join(" "), 400);

  let code = inviteCode();
  while (await prisma.duel.findUnique({ where: { code } })) code = inviteCode();

  const duel = await prisma.duel.create({
    data: {
      code,
      seed: randomInt(0x7fffffff),
      status: "waiting",
      playerAId: player.id,
      deckA: JSON.parse(JSON.stringify(parsed.data.deck)) as Prisma.InputJsonValue,
    },
  });

  return ok({ duelId: duel.id, code, seed: duel.seed, yourSide: "A" as const });
}
