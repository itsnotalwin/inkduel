/**
 * Multiplayer v0 contract tests (MULTIPLAYER.md §4-§5): the /api/mp/* routes
 * keep the {ok,data}/{ok,error} envelope, gate the tape by turn and
 * participant, and verify a reported result by replaying the whole action
 * tape through the deterministic engine. Route handlers run directly against
 * a throwaway SQLite database (INKDUEL_DB) — the same harness as
 * tests/api-contract.test.ts.
 */
import { execSync } from "node:child_process";
import { rmSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// route handlers read the session via next/headers — swap in a cookie jar
const jar = vi.hoisted(() => new Map<string, string>());

// db.ts reads INKDUEL_DB at import time — set it BEFORE any route module
// loads. Hoisted + local to this file so sibling test files can never
// interfere (a global setupFiles hook re-ran per file and raced).
const TMP_DB = vi.hoisted(() => {
  const tmp = (process.env.TEMP ?? process.env.TMP ?? "/tmp").replace(/\\/g, "/");
  const file = `${tmp}/inkduel-vitest-${process.pid}-${Date.now()}-${Math.floor(Math.random() * 1e6)}.db`;
  process.env.INKDUEL_DB = file;
  return file;
});

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name) } : undefined),
    set: (name: string, value: string) => {
      jar.set(name, value);
    },
  }),
}));

import { POST as guestPost } from "@/app/api/auth/guest/route";
import { POST as mpCreatePost } from "@/app/api/mp/create/route";
import { POST as mpJoinPost } from "@/app/api/mp/join/route";
import { POST as mpActionPost } from "@/app/api/mp/action/route";
import { GET as mpStateGet } from "@/app/api/mp/state/route";
import { POST as mpResultPost } from "@/app/api/mp/result/route";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE } from "@/lib/session";
import { ownedCardIds } from "@/lib/collection";
import { expandDeck } from "@/game/decks";
import { getCard, CARDS } from "@/game/cards";
import { applyAction, createGame, type Action, type Side } from "@/game/engine";
import { ACHIEVEMENTS } from "@/lib/achievements";

const BASE = "http://localhost:3000";

/** 10 non-legendary starter cards ×2 — a legal 20-card list. */
function legalDeck(slice: number): { cardId: string; count: number }[] {
  return [...ownedCardIds([], [])]
    .filter((id) => getCard(id).rarity !== "legendary")
    .slice(slice, slice + 10)
    .map((cardId) => ({ cardId, count: 2 }));
}
const DECK_A = legalDeck(0);
const DECK_B = legalDeck(10);

function req(path: string, method: string, body?: unknown): Request {
  return new Request(BASE + path, {
    method,
    ...(body === undefined
      ? {}
      : { body: JSON.stringify(body), headers: { "content-type": "application/json" } }),
  });
}

const post = (path: string, body?: unknown) => req(path, "POST", body);

async function expectFail(resOr: Response | Promise<Response>, status: number) {
  const res = await resOr;
  expect(res.status, `expected ${status}, got ${res.status}`).toBe(status);
  const j = (await res.json()) as { ok: boolean; error?: string };
  expect(j.ok).toBe(false);
  expect(typeof j.error).toBe("string");
  expect(j.error!.length).toBeGreaterThan(0);
}

/** Same as expectFail but pins the exact error message the contract specifies. */
async function expectFailWith(resOr: Response | Promise<Response>, status: number, message: string) {
  const res = await resOr;
  expect(res.status, `expected ${status}, got ${res.status}`).toBe(status);
  const j = (await res.json()) as { ok: boolean; error?: string };
  expect(j.ok).toBe(false);
  expect(j.error).toBe(message);
}

async function expectOk(
  resOr: Response | Promise<Response>,
  status = 200,
): Promise<Record<string, unknown>> {
  const res = await resOr;
  expect(res.status, `expected ${status}, got ${res.status}`).toBe(status);
  const j = (await res.json()) as { ok: boolean; data?: Record<string, unknown> };
  expect(j.ok).toBe(true);
  return j.data!;
}

beforeAll(async () => {
  // prisma.config.ts hardcodes the real database, so the CLI gets a test
  // config whose datasource URL is the throwaway INKDUEL_DB file
  execSync(`npx prisma db push --config prisma.test.config.ts --skip-generate --accept-data-loss`, {
    stdio: "pipe",
    env: { ...process.env, DATABASE_URL: `file:${TMP_DB}` },
  });
  // a fresh database has empty catalog tables — seed them exactly like
  // prisma/seed.ts does, or achievement unlocks violate their foreign keys
  await prisma.card.createMany({
    data: CARDS.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      cost: c.cost,
      atk: c.attack ?? null,
      hp: c.health ?? null,
      rarity: c.rarity,
    })),
  });
  await prisma.achievement.createMany({
    data: ACHIEVEMENTS.map((a) => ({
      key: a.key,
      name: a.name,
      description: a.description,
      icon: a.icon,
      unlocksCard: a.unlocksCard ?? null,
    })),
  });
}, 180_000);

afterAll(async () => {
  await prisma.$disconnect();
  for (const suffix of ["", "-wal", "-shm"]) rmSync(TMP_DB + suffix, { force: true });
});

describe("multiplayer v0 (lockstep over polling)", () => {
  let tokenA = "";
  let tokenB = "";
  let duel1 = { id: "", code: "" };
  let duel2 = { id: "", code: "" };

  const resultPayload = (overrides: Record<string, unknown> = {}) => ({
    duelId: "nope",
    winner: "A",
    turns: 1,
    playerHpLeft: 30,
    botHpLeft: 30,
    seed: 1,
    ...overrides,
  });
  const endTurn = (side: Side): Action => ({ type: "END_TURN", side });
  const mulligan = (side: Side): Action => ({ type: "MULLIGAN", side, uids: [] });

  it("reject unsigned calls with 401", async () => {
    jar.clear();
    await expectFail(mpCreatePost(post("/api/mp/create", { name: "Mp Alice", deck: DECK_A })), 401);
    await expectFail(mpJoinPost(post("/api/mp/join", { code: "ABC123", name: "Mp Alice", deck: DECK_A })), 401);
    await expectFail(mpActionPost(post("/api/mp/action", { duelId: "nope", side: "A", seq: 0, action: endTurn("A") })), 401);
    await expectFail(mpResultPost(post("/api/mp/result", resultPayload())), 401);
  });

  it("reject illegal decks with 400", async () => {
    jar.clear();
    await expectOk(guestPost(post("/api/auth/guest", { name: "Mp Alice" })));
    tokenA = jar.get(SESSION_COOKIE)!;
    await expectFail(mpCreatePost(post("/api/mp/create", { name: "Mp Alice", deck: DECK_A.slice(0, 5) })), 400);
    await expectFail(
      mpCreatePost(post("/api/mp/create", { name: "Mp Alice", deck: [{ cardId: "ghost_card", count: 2 }, ...DECK_A.slice(0, 9)] })),
      400,
    );
  });

  it("404 unknown codes and duels", async () => {
    jar.set(SESSION_COOKIE, tokenA);
    await expectFailWith(mpJoinPost(post("/api/mp/join", { code: "ZZZZZZ", name: "Mp Alice", deck: DECK_A })), 404, "No duel with that code.");
    await expectFail(mpStateGet(new Request(`${BASE}/api/mp/state?duelId=nope&since=0`)), 404);
    await expectFail(mpActionPost(post("/api/mp/action", { duelId: "nope", side: "A", seq: 0, action: endTurn("A") })), 404);
    await expectFail(mpResultPost(post("/api/mp/result", resultPayload())), 404);
  });

  it(
    "runs a full duel: create → join → tape → verified result",
    async () => {
      // player A creates a duel
      jar.clear();
      const a = await expectOk(guestPost(post("/api/auth/guest", { name: "Mp Alpha" })));
      tokenA = jar.get(SESSION_COOKIE)!;
      const created = await expectOk(mpCreatePost(post("/api/mp/create", { name: "Mp Alpha", deck: DECK_A })));
      expect(created.yourSide).toBe("A");
      expect(created.code as string).toMatch(/^[A-Z0-9]{6}$/);
      expect(typeof created.seed).toBe("number");
      duel1 = { id: created.duelId as string, code: created.code as string };
      const seed = created.seed as number;

      // the duel is visible while waiting: deckA in, deckB absent
      const waiting = await expectOk(mpStateGet(new Request(`${BASE}/api/mp/state?duelId=${duel1.id}&since=0`)));
      expect(waiting.status).toBe("waiting");
      expect(waiting.deckA).toEqual(DECK_A);
      expect(waiting.deckB ?? null).toBeNull();
      expect(waiting.winner ?? null).toBeNull();
      expect(waiting.actions).toEqual([]);
      expect(waiting.playerAName).toBe(a.name);
      expect(waiting.playerBName ?? null).toBeNull();

      // player B joins from a separate session
      jar.clear();
      const b = await expectOk(guestPost(post("/api/auth/guest", { name: "Mp Bravo" })));
      tokenB = jar.get(SESSION_COOKIE)!;
      const joined = await expectOk(mpJoinPost(post("/api/mp/join", { code: duel1.code, name: "Mp Bravo", deck: DECK_B })));
      expect(joined.duelId).toBe(duel1.id);
      expect(joined.code).toBe(duel1.code);
      expect(joined.seed).toBe(seed);
      expect(joined.yourSide).toBe("B");
      expect(joined.deckA).toEqual(DECK_A);
      expect(joined.deckB).toEqual(DECK_B);
      expect(joined.opponentName).toBe(a.name);

      const active = await expectOk(mpStateGet(new Request(`${BASE}/api/mp/state?duelId=${duel1.id}&since=0`)));
      expect(active.status).toBe("active");
      expect(active.deckB).toEqual(DECK_B);
      expect(active.playerBName).toBe(b.name);

      // build the tape by replaying it locally: two mulligans, then
      // alternating END_TURNs until the engine reaches game over (fatigue
      // does the killing — END_TURN is always legal)
      let state = createGame(seed, expandDeck(DECK_A), expandDeck(DECK_B), "A");
      const tape: Action[] = [mulligan("A"), mulligan("B")];
      state = applyAction(state, tape[0]!);
      state = applyAction(state, tape[1]!);
      for (let seq = 2; state.winner === null && seq < 200; seq++) {
        const action = endTurn(seq % 2 === 0 ? "A" : "B");
        tape.push(action);
        state = applyAction(state, action);
      }
      if (state.winner === null) throw new Error("replay never reached game over");

      // post the tape: seq 0..5 first, then read it back incrementally
      const postSeq = async (seq: number) => {
        const side: Side = seq % 2 === 0 ? "A" : "B";
        jar.set(SESSION_COOKIE, side === "A" ? tokenA : tokenB);
        const d = await expectOk(mpActionPost(post("/api/mp/action", { duelId: duel1.id, side, seq, action: tape[seq] })));
        expect(d.seq).toBe(seq);
      };
      for (let seq = 0; seq < 6; seq++) await postSeq(seq);

      const partial = await expectOk(mpStateGet(new Request(`${BASE}/api/mp/state?duelId=${duel1.id}&since=3`)));
      // since is the last seq the client holds: everything strictly after it
      expect((partial.actions as { seq: number; side: string }[]).map((x) => x.seq)).toEqual([4, 5]);
      expect((partial.actions as { side: string }[]).map((x) => x.side)).toEqual(["A", "B"]);
      expect(partial.status).toBe("active");
      expect(partial.winner ?? null).toBeNull();

      for (let seq = 6; seq < tape.length; seq++) await postSeq(seq);

      // the reported winner comes from the test's own replay — never hardcoded
      const w = state.winner;
      const reportedWinner = w === "draw" ? "DRAW" : w;
      jar.set(SESSION_COOKIE, tokenB); // either participant may post the result
      const result = await expectOk(
        mpResultPost(
          post("/api/mp/result", {
            duelId: duel1.id,
            winner: reportedWinner,
            turns: state.turn,
            playerHpLeft: Math.max(0, state.players.A.heroHp),
            botHpLeft: Math.max(0, state.players.B.heroHp),
            seed,
            durationMs: 4321,
          }),
        ),
      );
      expect(result.verified).toBe(true);
      expect(result.winner).toBe(reportedWinner);
      expect(result.matchesRecorded).toBe(2);

      // the duel is finished and the tape is the source of truth
      const duelRow = await prisma.duel.findUniqueOrThrow({ where: { id: duel1.id } });
      expect(duelRow.status).toBe("finished");
      expect(duelRow.winner).toBe(reportedWinner);
      const finalState = await expectOk(mpStateGet(new Request(`${BASE}/api/mp/state?duelId=${duel1.id}&since=0`)));
      expect(finalState.status).toBe("finished");
      expect(finalState.winner).toBe(reportedWinner);

      // both players went through the ranked flow, zero-sum Elo
      const matchA = await prisma.match.findFirst({ where: { playerId: a.id as string, opponentKey: `duel:${b.id as string}` } });
      const matchB = await prisma.match.findFirst({ where: { playerId: b.id as string, opponentKey: `duel:${a.id as string}` } });
      expect(matchA).toBeTruthy();
      expect(matchB).toBeTruthy();
      const resultA = reportedWinner === "A" ? "WIN" : reportedWinner === "B" ? "LOSS" : "DRAW";
      expect(matchA!.result).toBe(resultA);
      expect(matchB!.result).toBe(resultA === "WIN" ? "LOSS" : resultA === "LOSS" ? "WIN" : "DRAW");
      const pa = await prisma.player.findUniqueOrThrow({ where: { id: a.id as string } });
      const pb = await prisma.player.findUniqueOrThrow({ where: { id: b.id as string } });
      expect(pa.mmr).not.toBe(1000);
      expect(pa.mmr - 1000).toBe(-(pb.mmr - 1000));
    },
    120_000,
  );

  it("gates the tape: wrong turn, wrong side, outsiders, duplicates", async () => {
    // a second duel, joined by B (a bad deck is a 400 and consumes nothing)
    jar.set(SESSION_COOKIE, tokenA);
    const created = await expectOk(mpCreatePost(post("/api/mp/create", { name: "Mp Alpha", deck: DECK_A })));
    duel2 = { id: created.duelId as string, code: created.code as string };
    jar.set(SESSION_COOKIE, tokenB);
    await expectFail(mpJoinPost(post("/api/mp/join", { code: duel2.code, name: "Mp Bravo", deck: DECK_B.slice(0, 3) })), 400);
    await expectOk(mpJoinPost(post("/api/mp/join", { code: duel2.code, name: "Mp Bravo", deck: DECK_B })));

    // A posting on B's seq slot is not their turn
    jar.set(SESSION_COOKIE, tokenA);
    await expectFailWith(
      mpActionPost(post("/api/mp/action", { duelId: duel2.id, side: "A", seq: 1, action: endTurn("A") })),
      403,
      "Not your turn.",
    );
    // …and the mirror: B cannot post on A's slot either
    jar.set(SESSION_COOKIE, tokenB);
    await expectFailWith(
      mpActionPost(post("/api/mp/action", { duelId: duel2.id, side: "B", seq: 2, action: endTurn("B") })),
      403,
      "Not your turn.",
    );
    // a participant cannot act for the other side at all
    jar.set(SESSION_COOKIE, tokenA);
    await expectFail(
      mpActionPost(post("/api/mp/action", { duelId: duel2.id, side: "B", seq: 1, action: endTurn("B") })),
      403,
    );
    // an outsider cannot write to the tape
    jar.clear();
    await expectOk(guestPost(post("/api/auth/guest", { name: "Mp Charlie" })));
    await expectFail(
      mpActionPost(post("/api/mp/action", { duelId: duel2.id, side: "A", seq: 0, action: mulligan("A") })),
      403,
    );

    // A mulligans at seq 0 — the same slot is then taken on the tape
    jar.set(SESSION_COOKIE, tokenA);
    const first = await expectOk(mpActionPost(post("/api/mp/action", { duelId: duel2.id, side: "A", seq: 0, action: mulligan("A") })));
    expect(first.seq).toBe(0);
    await expectFailWith(
      mpActionPost(post("/api/mp/action", { duelId: duel2.id, side: "A", seq: 0, action: mulligan("A") })),
      409,
      "That move is already on the tape.",
    );
  });

  it("reads the state by invite code for spectators", async () => {
    // by code: the same response the duelId path gives, plus the seed for
    // a read-only spectator to replay the tape with
    const byCode = await expectOk(mpStateGet(new Request(`${BASE}/api/mp/state?code=${duel2.code}&since=0`)));
    const byId = await expectOk(mpStateGet(new Request(`${BASE}/api/mp/state?duelId=${duel2.id}&since=0`)));
    expect(byCode).toEqual(byId);
    expect(byCode.status).toBe("active");
    expect(typeof byCode.seed).toBe("number");
    // codes are unambiguous uppercase alphanumerics, but the lookup is case-safe
    const lower = await expectOk(mpStateGet(new Request(`${BASE}/api/mp/state?code=${duel2.code.toLowerCase()}&since=0`)));
    expect(lower.status).toBe("active");
    // an unknown code is the same 404 as an unknown duelId
    await expectFail(mpStateGet(new Request(`${BASE}/api/mp/state?code=ZZZZZZ&since=0`)), 404);
    // neither duelId nor code → 404
    await expectFail(mpStateGet(new Request(`${BASE}/api/mp/state?since=0`)), 404);
  });

  it("rejects a result the tape does not support, recording nothing", async () => {
    // duel2 has only A's mulligan on the tape — no winner exists there
    jar.set(SESSION_COOKIE, tokenA);
    await expectFailWith(
      mpResultPost(post("/api/mp/result", resultPayload({ duelId: duel2.id, winner: "A" }))),
      409,
      "The tape tells a different story.",
    );
    const duelRow = await prisma.duel.findUniqueOrThrow({ where: { id: duel2.id } });
    expect(duelRow.status).toBe("active");
    expect(duelRow.winner ?? null).toBeNull();
    const recorded = await prisma.match.count({ where: { opponentKey: { startsWith: "duel:" } } });
    expect(recorded).toBe(2); // only the finished duel1 matches are on file
  });

  it("refuses to join a duel that is no longer waiting", async () => {
    jar.clear();
    await expectOk(guestPost(post("/api/auth/guest", { name: "Mp Delta" })));
    // duel2 is active (full), duel1 is finished — neither is waiting
    await expectFail(mpJoinPost(post("/api/mp/join", { code: duel2.code, name: "Mp Delta", deck: DECK_B })), 409);
    await expectFail(mpJoinPost(post("/api/mp/join", { code: duel1.code, name: "Mp Delta", deck: DECK_B })), 409);
  });
});
