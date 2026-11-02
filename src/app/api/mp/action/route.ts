import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { fail, getSessionPlayer, ok } from "@/lib/session";

const bodySchema = z.object({
  duelId: z.string().min(1),
  side: z.enum(["A", "B"]),
  seq: z.number().int().min(0),
  action: z.object({ type: z.string(), side: z.string() }).passthrough(),
});

/**
 * Append one move to the duel's action tape. The tape strictly alternates
 * starting with A (mulligans included), so the side for a seq is fully
 * determined: even seqs belong to A, odd seqs to B.
 */
export async function POST(request: Request) {
  const player = await getSessionPlayer();
  if (!player) return fail("Not signed in", 401);

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return fail("Invalid action payload.");
  const { duelId, side, seq, action } = parsed.data;

  const duel = await prisma.duel.findUnique({ where: { id: duelId } });
  if (!duel) return fail("Duel not found.", 404);

  // only the two participants may write to the tape, and only for sides they own
  // (a local-test duel can have the same player on both sides — that's fine)
  const ownsA = duel.playerAId === player.id;
  const ownsB = duel.playerBId === player.id;
  if (!ownsA && !ownsB) {
    return fail("You are not part of this duel.", 403);
  }
  if ((side === "A" && !ownsA) || (side === "B" && !ownsB)) {
    return fail("You can only act for your own side.", 403);
  }

  // turn gate: the engine's action stream strictly alternates from A
  if (seq % 2 !== (side === "A" ? 0 : 1)) return fail("Not your turn.", 403);

  // status gate: no actions until both decks are in, none after the result
  if (duel.status !== "active") return fail("This duel is not active.", 409);

  try {
    await prisma.duelAction.create({
      data: {
        duelId: duel.id,
        seq,
        side,
        action: JSON.parse(JSON.stringify(action)) as Prisma.InputJsonValue,
      },
    });
  } catch (err) {
    // @@unique([duelId, seq]) — the same slot is already taken on the tape
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return fail("That move is already on the tape.", 409);
    }
    throw err;
  }

  return ok({ seq });
}
