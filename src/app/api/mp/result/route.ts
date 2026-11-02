import { z } from "zod";
import { prisma } from "@/lib/db";
import { fail, getSessionPlayer, ok } from "@/lib/session";
import { applyAction, createGame, type Action } from "@/game/engine";
import { expandDeck, type DeckEntry } from "@/game/decks";
import { recordMatch } from "@/lib/record-match";

const bodySchema = z.object({
  duelId: z.string().min(1),
  winner: z.enum(["A", "B", "DRAW"]),
  turns: z.number().int().min(0).max(500),
  playerHpLeft: z.number().int().min(0).max(30),
  botHpLeft: z.number().int().min(0).max(30),
  seed: z.number().int(),
  durationMs: z.number().int().min(0).max(1000 * 60 * 60).optional(),
});

/**
 * End of duel: the reported winner is only accepted if the deterministic
 * engine agrees. The whole tape is replayed against the two stored decks —
 * seed + deck lists + ordered actions = the exact match (MULTIPLAYER.md §4) —
 * and only then do both players go through the normal ranked flow.
 */
export async function POST(request: Request) {
  const player = await getSessionPlayer();
  if (!player) return fail("Not signed in", 401);

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return fail("Invalid result payload.");
  const m = parsed.data;

  const duel = await prisma.duel.findUnique({ where: { id: m.duelId }, include: { actions: true } });
  if (!duel) return fail("Duel not found.", 404);
  if (duel.playerAId !== player.id && duel.playerBId !== player.id) {
    return fail("You are not part of this duel.", 403);
  }
  if (duel.status !== "active") {
    return fail(duel.status === "waiting" ? "This duel has not started yet." : "This duel has already been recorded.", 409);
  }
  if (!duel.playerBId || !duel.deckB) return fail("This duel has not started yet.", 409);

  // tape verification — the cheat-proof part
  const deckA = duel.deckA as unknown as DeckEntry[];
  const deckB = duel.deckB as unknown as DeckEntry[];
  const tape = duel.actions.slice().sort((a, b) => a.seq - b.seq);
  let state = createGame(duel.seed, expandDeck(deckA), expandDeck(deckB), "A");
  for (const entry of tape) state = applyAction(state, entry.action as unknown as Action);
  const derived = state.winner === "draw" ? "DRAW" : state.winner; // "A" | "B" | "DRAW" | null
  if (derived === null || derived !== m.winner) {
    return fail("The tape tells a different story.", 409);
  }

  await prisma.duel.update({ where: { id: duel.id }, data: { status: "finished", winner: derived } });

  // both participants go through the ranked flow; Elo deltas are computed
  // against each opponent's pre-duel MMR (snapshotted before either update)
  const playerA = await prisma.player.findUniqueOrThrow({ where: { id: duel.playerAId } });
  const playerB = await prisma.player.findUniqueOrThrow({ where: { id: duel.playerBId } });
  const resultA = derived === "A" ? "WIN" : derived === "B" ? "LOSS" : "DRAW";
  const resultB = derived === "B" ? "WIN" : derived === "A" ? "LOSS" : "DRAW";
  const actions = tape.map((t) => t.action as { type: string; side: string });
  const actionLog = state.log.map((l) => ({ turn: l.turn, side: l.side, text: l.text }));
  const turns = m.turns;
  const durationMs = m.durationMs;

  await recordMatch({
    playerId: playerA.id,
    opponentKey: `duel:${playerB.id}`,
    opponentMmr: playerB.mmr,
    result: resultA,
    turns,
    playerHpLeft: m.playerHpLeft,
    botHpLeft: m.botHpLeft,
    seed: duel.seed,
    durationMs,
    deckUsed: deckA,
    actionLog,
    actions,
    tookFatigue: state.players.A.fatigue > 0,
  });
  await recordMatch({
    playerId: playerB.id,
    opponentKey: `duel:${playerA.id}`,
    opponentMmr: playerA.mmr,
    result: resultB,
    turns,
    playerHpLeft: m.botHpLeft,
    botHpLeft: m.playerHpLeft,
    seed: duel.seed,
    durationMs,
    deckUsed: deckB,
    actionLog,
    actions,
    tookFatigue: state.players.B.fatigue > 0,
  });

  return ok({ verified: true, winner: derived, matchesRecorded: 2 });
}
