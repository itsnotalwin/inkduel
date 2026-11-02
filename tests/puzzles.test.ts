/**
 * The Archivist's Tests: every authored solution tape is proven to win by
 * replaying it through the deterministic engine (the solvability gate), the
 * makePuzzle contract is pinned for the duel UI, the daily rotation is
 * stable for fixed dates, and the /api/puzzles routes keep the {ok,data}/
 * {ok,error} envelope with tape-verified ink payouts. Route handlers run
 * directly against a throwaway SQLite database (INKDUEL_DB) — the same
 * harness as tests/mp-contract.test.ts.
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
import { GET as puzzlesGet, POST as puzzlesPost } from "@/app/api/puzzles/route";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE } from "@/lib/session";
import { CARDS, COLLECTIBLE_CARDS } from "@/game/cards";
import { applyAction, makePuzzle, type Action, type GameState } from "@/game/engine";
import { dailyIndex, dailyPuzzle, DAILY_BONUS_INK, DAILY_EPOCH_MS, PUZZLES } from "@/game/puzzles";
import { ACHIEVEMENTS } from "@/lib/achievements";

const BASE = "http://localhost:3000";

function req(path: string, method: string, body?: unknown): Request {
  return new Request(BASE + path, {
    method,
    ...(body === undefined
      ? {}
      : { body: JSON.stringify(body), headers: { "content-type": "application/json" } }),
  });
}

const post = (path: string, body?: unknown) => req(path, "POST", body);

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

/** Mirrors the route's no-op detector: a move the engine rejects is silent. */
function positionKey(s: GameState): string {
  return JSON.stringify({ ...s, events: undefined });
}

/** Sign in a fresh guest and return their player id, coins and session token. */
async function signIn(name: string): Promise<{ id: string; coins: number; token: string }> {
  jar.clear();
  const data = await expectOk(guestPost(post("/api/auth/guest", { name })));
  return { id: data.id as string, coins: data.coins as number, token: jar.get(SESSION_COOKIE)! };
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

describe("the six tests (engine level)", () => {
  it("only uses real collectible cards on boards and in hands", () => {
    const collectible = new Set(COLLECTIBLE_CARDS.map((c) => c.id));
    for (const p of PUZZLES) {
      for (const u of [...p.spec.boardA, ...p.spec.boardB]) {
        expect(collectible.has(u.cardId), `${p.id}: ${u.cardId} must be collectible`).toBe(true);
      }
      for (const id of [...p.spec.handA, ...(p.spec.handB ?? [])]) {
        expect(collectible.has(id), `${p.id}: ${id} must be collectible`).toBe(true);
      }
      expect(p.goal).toBe("win");
      expect(p.rewardInk).toBe(40);
      expect(p.spec.handA.length).toBeLessThanOrEqual(6);
    }
  });

  it("pins the makePuzzle contract the duel UI builds against", () => {
    const p = PUZZLES[0]!;
    const s = makePuzzle(p.spec);
    expect(s.phase).toBe("TURN");
    expect(s.current).toBe("A");
    expect(s.first).toBe("A");
    expect(s.mulliganDone).toEqual({ A: true, B: true });
    expect(s.areas).toEqual({ A: null, B: null });
    expect(s.winner).toBeNull();
    expect(s.sideTurns).toEqual({ A: 1, B: 1 });
    expect(s.players.A.heroHp).toBe(p.spec.heroHpA);
    expect(s.players.B.heroHp).toBe(p.spec.heroHpB);
    expect(s.players.A.maxMana).toBe(p.spec.manaA);
    expect(s.players.A.mana).toBe(p.spec.manaA);
    expect(s.players.B.maxMana).toBe(p.spec.manaB);
    // fixed uid scheme: hands p0.., B hand q0.., boards a0../b0..
    expect(s.players.A.hand.map((c) => c.uid)).toEqual(p.spec.handA.map((_, i) => `p${i}`));
    expect(s.players.A.hand.map((c) => c.cardId)).toEqual(p.spec.handA);
    expect(s.players.B.hand.map((c) => c.uid)).toEqual((p.spec.handB ?? []).map((_, i) => `q${i}`));
    expect(s.players.A.board.map((u) => u.uid)).toEqual(p.spec.boardA.map((_, i) => `a${i}`));
    expect(s.players.B.board.map((u) => u.uid)).toEqual(p.spec.boardB.map((_, i) => `b${i}`));
    // puzzle units open ready to strike
    for (const u of [...s.players.A.board, ...s.players.B.board]) {
      expect(u.attacksLeft).toBe(1);
      expect(u.sick).toBe(false);
      expect(u.maxHealth).toBe(u.health);
    }
    // decks default empty — fatigue looms instead
    expect(s.players.A.deck).toEqual([]);
    expect(s.players.B.deck).toEqual([]);
  });

  it("makePuzzle is fully deterministic (two calls, identical JSON)", () => {
    for (const p of PUZZLES) {
      expect(JSON.stringify(makePuzzle(p.spec))).toBe(JSON.stringify(makePuzzle(p.spec)));
    }
  });

  it("THE SOLVABILITY GATE: every solution tape replays to an A win", () => {
    for (const p of PUZZLES) {
      let state = makePuzzle(p.spec);
      for (const action of p.solution) {
        const next = applyAction(state, action);
        // every authored move must actually change the position
        expect(positionKey(state), `${p.id}: move was rejected: ${JSON.stringify(action)}`).not.toBe(
          positionKey(next),
        );
        state = next;
      }
      expect(state.winner, `${p.id} must be won by its own tape`).toBe("A");
      expect(p.par, `${p.id} par equals its tape length`).toBe(p.solution.length);
    }
  });

  it("the daily rotation is stable for fixed dates and wraps every 6 days", () => {
    const day = (n: number) => DAILY_EPOCH_MS + n * 86_400_000;
    expect(dailyIndex(day(0))).toBe(0); // 2026-01-01 — epoch day
    expect(dailyIndex(day(5))).toBe(5);
    expect(dailyIndex(day(6))).toBe(0); // wraps
    expect(dailyIndex(day(7))).toBe(1);
    expect(dailyIndex(day(305))).toBe(5); // 2026-11-02
    // stable within a day (midday == midnight of the same UTC day)
    expect(dailyIndex(day(305) + 3_600_000)).toBe(dailyIndex(day(305)));
    expect(dailyIndex(day(305) + 86_399_000)).toBe(dailyIndex(day(305)));
    // before the epoch the rotation still resolves safely
    expect(dailyIndex(day(-1))).toBe(5);
    expect(dailyPuzzle(day(0)).id).toBe(PUZZLES[0]!.id);
  });
});

describe("the /api/puzzles routes", () => {
  const daily = () => dailyPuzzle();
  const other = () => PUZZLES.find((p) => p.id !== daily().id)!;
  let solverOneToken = "";

  const solutionFor = (puzzleId: string): Action[] => PUZZLES.find((p) => p.id === puzzleId)!.solution;

  const postSolve = (puzzleId: string, actions: Action[]) =>
    puzzlesPost(post("/api/puzzles", { puzzleId, actions }));

  const coinsOf = async (id: string) =>
    (await prisma.player.findUniqueOrThrow({ where: { id } })).coins;

  it("GET: archive shape, unsigned solved is null", async () => {
    jar.clear();
    const data = await expectOk(puzzlesGet());
    const puzzles = data.puzzles as { id: string; title: string; brief: string; par: number; rewardInk: number; solved: boolean | null }[];
    expect(puzzles).toHaveLength(6);
    for (const row of puzzles) {
      expect(typeof row.id).toBe("string");
      expect(typeof row.title).toBe("string");
      expect(typeof row.brief).toBe("string");
      expect(typeof row.par).toBe("number");
      expect(row.rewardInk).toBe(40);
      expect(row.solved).toBeNull(); // unsigned: no stamps to show
    }
    const d = data.daily as (typeof puzzles)[number];
    expect(d.id).toBe(daily().id);
    expect(d.solved).toBeNull();
  });

  it("POST: unsigned is 401, unknown test is 404", async () => {
    jar.clear();
    await expectFailWith(postSolve(daily().id, []), 401, "Not signed in");
    await signIn("Puzzle Outsider");
    await expectFailWith(postSolve("no_such_test", []), 404, "No such test in the archive.");
  });

  it("signed GET: stamps start false for a fresh player", async () => {
    await signIn("Puzzle Reader");
    const data = await expectOk(puzzlesGet());
    const puzzles = data.puzzles as { solved: boolean | null }[];
    expect(puzzles.every((p) => p.solved === false)).toBe(true);
    expect((data.daily as { solved: boolean | null }).solved).toBe(false);
  });

  it("solving the daily pays 40+25, a re-solve pays nothing, a second same-day test pays 40", async () => {
    const solver = await signIn("Puzzle Solver One");
    solverOneToken = solver.token;
    expect(solver.coins).toBe(150);

    // first solve of the day, and it is the daily: 40 + 25
    const first = await expectOk(postSolve(daily().id, solutionFor(daily().id)));
    expect(first.verified).toBe(true);
    expect(first.alreadySolved).toBe(false);
    expect(first.inkAwarded).toBe(40 + DAILY_BONUS_INK);
    expect(await coinsOf(solver.id)).toBe(150 + 65);

    // the same test again: verified, no double payout
    const again = await expectOk(postSolve(daily().id, solutionFor(daily().id)));
    expect(again.verified).toBe(true);
    expect(again.alreadySolved).toBe(true);
    expect(again.inkAwarded).toBe(0);
    expect(await coinsOf(solver.id)).toBe(215);

    // a second solve TODAY is no longer the day's first: flat 40, no bonus
    const second = await expectOk(postSolve(other().id, solutionFor(other().id)));
    expect(second.inkAwarded).toBe(40);
    expect(second.alreadySolved).toBe(false);
    expect(await coinsOf(solver.id)).toBe(255);

    const rows = await prisma.puzzleSolved.findMany({ where: { playerId: solver.id } });
    expect(rows).toHaveLength(2);
  });

  it("a non-daily first solve pays 40 flat — the daily bonus needs the daily first", async () => {
    const solver = await signIn("Puzzle Solver Two");
    expect(solver.coins).toBe(150);

    const first = await expectOk(postSolve(other().id, solutionFor(other().id)));
    expect(first.inkAwarded).toBe(40); // not the daily: no bonus even on a first solve
    expect(await coinsOf(solver.id)).toBe(190);

    // the daily afterwards is no longer this player's first solve of today
    const second = await expectOk(postSolve(daily().id, solutionFor(daily().id)));
    expect(second.inkAwarded).toBe(40);
    expect(await coinsOf(solver.id)).toBe(230);
  });

  it("corrupted tapes are refused and record nothing", async () => {
    const solver = await signIn("Puzzle Solver Three");
    const note = PUZZLES.find((p) => p.id === "marginal-note")!;

    // a move the engine rejects (a third swing with an already-spent unit)
    // fails the tape even though the first two moves would have won
    await expectFailWith(
      postSolve(note.id, [...note.solution, { type: "ATTACK", side: "A", attackerUid: "a0", target: { hero: "B" } }]),
      400,
      "Invalid move on the tape.",
    );

    // every move legal, but the tape stops short of the kill
    await expectFailWith(
      postSolve(note.id, note.solution.slice(0, -1)),
      409,
      "The tape does not solve this test.",
    );

    expect(await prisma.puzzleSolved.count({ where: { playerId: solver.id } })).toBe(0);
    expect(await coinsOf(solver.id)).toBe(150);
  });

  it("GET: the solved stamps follow the PuzzleSolved rows", async () => {
    // Solver One solved the daily + one other in the earlier test
    jar.set(SESSION_COOKIE, solverOneToken);
    const data = await expectOk(puzzlesGet());
    const stamps = new Map(
      (data.puzzles as { id: string; solved: boolean | null }[]).map((r) => [r.id, r.solved]),
    );
    expect(stamps.get(daily().id)).toBe(true);
    expect(stamps.get(other().id)).toBe(true);
    expect((data.daily as { solved: boolean | null }).solved).toBe(true);
    expect([...stamps.values()].filter((s) => s === false)).toHaveLength(4);
    expect(await prisma.puzzleSolved.count()).toBe(4); // Solver One 2 + Solver Two 2
  });
});
