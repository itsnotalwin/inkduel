import { prisma } from "@/lib/db";
import { fail, ok } from "@/lib/session";

/**
 * Public read of a duel's current shape: status, the actions after `since`
 * (ascending), the winner once known, both display names and both deck lists.
 * Clients poll this and apply returned actions with applyAction().
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const duelId = url.searchParams.get("duelId") ?? "";
  const sinceRaw = Number(url.searchParams.get("since") ?? "0");
  const since = Number.isFinite(sinceRaw) ? sinceRaw : 0;

  const duel = await prisma.duel.findUnique({ where: { id: duelId } });
  if (!duel) return fail("Duel not found.", 404);

  const [playerA, playerB, actions] = await Promise.all([
    prisma.player.findUnique({ where: { id: duel.playerAId } }),
    duel.playerBId ? prisma.player.findUnique({ where: { id: duel.playerBId } }) : Promise.resolve(null),
    prisma.duelAction.findMany({
      where: { duelId: duel.id, seq: { gt: since } },
      orderBy: { seq: "asc" },
      select: { seq: true, side: true, action: true },
    }),
  ]);

  return ok({
    status: duel.status,
    actions,
    winner: duel.winner,
    playerAName: playerA ? `${playerA.name}${playerA.tag}` : null,
    playerBName: playerB ? `${playerB.name}${playerB.tag}` : null,
    deckA: duel.deckA,
    deckB: duel.deckB ?? null,
  });
}
