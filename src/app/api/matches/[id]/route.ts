import { prisma } from "@/lib/db";
import { fail, getSessionPlayer, ok } from "@/lib/session";

/** Full match detail (including the stored action sequence) for the replay viewer. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const player = await getSessionPlayer();
  if (!player) return fail("Not signed in", 401);
  const { id } = await params;
  const match = await prisma.match.findUnique({ where: { id } });
  if (!match || match.playerId !== player.id) return fail("Match not found", 404);
  return ok(match);
}
