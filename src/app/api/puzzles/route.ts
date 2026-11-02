import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { fail, getSessionPlayer, ok } from "@/lib/session";
import { applyAction, makePuzzle, type Action } from "@/game/engine";
import { DAILY_BONUS_INK, dailyPuzzle, dayStartMs, PUZZLES, PUZZLE_REWARD_INK } from "@/game/puzzles";

/**
 * The Archivist's Tests: GET serves the archive with the session player's
 * solved stamps; POST replays the submitted tape through the deterministic
 * engine (makePuzzle + applyAction) and pays ink only for a proven solve —
 * the same tape-verification trick the multiplayer result route uses.
 */

const bodySchema = z.object({
  puzzleId: z.string().min(1),
  actions: z
    .array(
      z.object({
        type: z.string(),
        side: z.string(),
      }).passthrough(),
    )
    .max(50),
});

/** Mirrors the harness no-op detector: a move the engine rejects is silent. */
function positionKey(s: ReturnType<typeof makePuzzle>): string {
  return JSON.stringify({ ...s, events: undefined });
}

export async function GET() {
  const player = await getSessionPlayer();
  const solvedRows = player
    ? await prisma.puzzleSolved.findMany({ where: { playerId: player.id } })
    : [];
  const solved = new Set(solvedRows.map((r) => r.puzzleId));
  const stamp = (id: string): boolean | null => (player ? solved.has(id) : null);

  const daily = dailyPuzzle();
  return ok({
    daily: {
      id: daily.id,
      title: daily.title,
      brief: daily.brief,
      par: daily.par,
      rewardInk: daily.rewardInk,
      solved: stamp(daily.id),
    },
    puzzles: PUZZLES.map((p) => ({
      id: p.id,
      title: p.title,
      brief: p.brief,
      par: p.par,
      rewardInk: PUZZLE_REWARD_INK,
      solved: stamp(p.id),
    })),
  });
}

export async function POST(request: Request) {
  const player = await getSessionPlayer();
  if (!player) return fail("Not signed in", 401);

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return fail("Invalid solve payload.");
  const { puzzleId, actions } = parsed.data;

  const puzzle = PUZZLES.find((p) => p.id === puzzleId);
  if (!puzzle) return fail("No such test in the archive.", 404);

  // rebuild the puzzle and replay the tape — a move the engine rejects is a
  // silent no-op, which is itself a broken tape
  let state = makePuzzle(puzzle.spec);
  for (const action of actions as Action[]) {
    const next = applyAction(state, action);
    if (positionKey(next) === positionKey(state)) {
      return fail("Invalid move on the tape.", 400);
    }
    state = next;
  }
  if (state.winner !== "A") {
    return fail("The tape does not solve this test.", 409);
  }

  // payout: 40 for the first solve of this test; +25 if it is the day's daily
  // AND this is the player's first solve of the day
  const solvesBeforeToday = await prisma.puzzleSolved.count({
    where: { playerId: player.id, solvedAt: { gte: new Date(dayStartMs(Date.now())) } },
  });
  const existing = await prisma.puzzleSolved.findUnique({
    where: { playerId_puzzleId: { playerId: player.id, puzzleId } },
  });
  if (existing) {
    return ok({ verified: true, inkAwarded: 0, alreadySolved: true });
  }

  const isDaily = puzzleId === dailyPuzzle(Date.now()).id;
  const isDayFirst = solvesBeforeToday === 0;
  const bonus = isDaily && isDayFirst ? DAILY_BONUS_INK : 0;
  const inkAwarded = puzzle.rewardInk + bonus;

  try {
    await prisma.$transaction([
      prisma.puzzleSolved.create({
        data: { playerId: player.id, puzzleId },
      }),
      prisma.player.update({
        where: { id: player.id },
        data: { coins: { increment: inkAwarded } },
      }),
    ]);
  } catch (err) {
    // @@id([playerId, puzzleId]) — a concurrent re-solve gets no payout
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return ok({ verified: true, inkAwarded: 0, alreadySolved: true });
    }
    throw err;
  }

  return ok({ verified: true, inkAwarded, alreadySolved: false });
}
