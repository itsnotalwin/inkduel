/**
 * API contract tests (ROADMAP §3.1): every route must keep its response
 * envelope ({ok:true,data} / {ok:false,error}) and status codes under
 * unauthenticated and Zod-invalid calls, and the ink ledger must balance
 * exactly across a random sequence of matches, packs, campaign clears and
 * logins. Route handlers run directly against a throwaway SQLite database
 * (INKDUEL_DB, see tests/vitest.setup.ts) — real play data is never touched.
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
import { GET as meGet } from "@/app/api/me/route";
import { POST as craftPost } from "@/app/api/craft/route";
import { GET as packsGet, POST as packsPost } from "@/app/api/packs/route";
import { GET as matchesGet, POST as matchesPost } from "@/app/api/matches/route";
import { GET as campaignGet, POST as campaignPost } from "@/app/api/campaign/route";
import { GET as decksGet, POST as decksPost } from "@/app/api/decks/route";
import { DELETE as deckDelete, PUT as deckPut } from "@/app/api/decks/[id]/route";
import { GET as leaderboardGet } from "@/app/api/leaderboard/route";
import { GET as achievementsGet } from "@/app/api/achievements/route";
import { GET as questsGet } from "@/app/api/quests/today/route";
import { GET as analyticsGet } from "@/app/api/analytics/meta/route";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE } from "@/lib/session";
import { ownedCardIds } from "@/lib/collection";
import { BOT_BY_KEY } from "@/game/ai";
import { mulberry32 } from "@/game/decks";
import { getCard, CARDS, ARCHIVE_SET_IDS } from "@/game/cards";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { CAMPAIGN_STAGES } from "@/game/campaign";
import { PACK_COST, PACK_PREMIUM_COST, PACK_SIZE } from "@/game/packs";

const BASE = "http://localhost:3000";
const REPLAY_REWARD = 10;
const WIN_INK = 50;

const BOT_KEY = Object.keys(BOT_BY_KEY)[0]!;

/**
 * An archive-set card the current player genuinely does not own — pack pulls
 * can grant archive cards (unowned-preference gacha), so hardcoding the first
 * set id would flake.
 */
async function unownedArchiveId(): Promise<string> {
  const me = await expectOk(meGet());
  const owned = new Set(
    (me.collection as { id: string; owned: boolean }[]).filter((c) => c.owned).map((c) => c.id),
  );
  const id = [...ARCHIVE_SET_IDS].find((cid) => !owned.has(cid) && getCard(cid).rarity !== "legendary");
  if (!id) throw new Error("no unowned non-legendary archive card available");
  return id;
}

/** 10 non-legendary starter cards ×2 — a legal 20-card list. */
const LEGAL_DECK = [...ownedCardIds([], [])]
  .filter((id) => getCard(id).rarity !== "legendary")
  .slice(0, 10)
  .map((cardId) => ({ cardId, count: 2 }));

function matchPayload(overrides: Record<string, unknown> = {}) {
  return {
    opponentKey: BOT_KEY,
    result: "WIN",
    turns: 8,
    playerHpLeft: 30,
    botHpLeft: 0,
    seed: 7,
    deckUsed: LEGAL_DECK,
    ...overrides,
  };
}

function req(path: string, method: string, body?: unknown): Request {
  return new Request(BASE + path, {
    method,
    ...(body === undefined
      ? {}
      : { body: JSON.stringify(body), headers: { "content-type": "application/json" } }),
  });
}

const post = (path: string, body?: unknown) => req(path, "POST", body);
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

async function expectFail(resOr: Response | Promise<Response>, status: number) {
  const res = await resOr;
  expect(res.status, `expected ${status}, got ${res.status}`).toBe(status);
  const j = (await res.json()) as { ok: boolean; error?: string };
  expect(j.ok).toBe(false);
  expect(typeof j.error).toBe("string");
  expect(j.error!.length).toBeGreaterThan(0);
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
    // schema.prisma validates env("DATABASE_URL"); the actual target comes
    // from the test config's datasource (INKDUEL_DB)
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

describe("unauthenticated requests", () => {
  it("reject every mutating route with 401 + {ok:false}", async () => {
    await expectFail(packsPost(post("/api/packs", { packs: 1 })), 401);
    await expectFail(matchesPost(post("/api/matches", matchPayload())), 401);
    await expectFail(campaignPost(post("/api/campaign", { stage: 0, result: "WIN" })), 401);
    await expectFail(decksPost(post("/api/decks", { name: "X", cards: LEGAL_DECK })), 401);
    await expectFail(deckPut(req("/api/decks/d1", "PUT", { name: "X" }), ctx("d1")), 401);
    await expectFail(
      deckDelete(new Request(BASE + "/api/decks/d1", { method: "DELETE" }), ctx("d1")),
      401,
    );
  });

  it("gate every private GET with 401", async () => {
    await expectFail(meGet(), 401);
    await expectFail(packsGet(), 401);
    await expectFail(matchesGet(new Request(BASE + "/api/matches")), 401);
    await expectFail(campaignGet(), 401);
    await expectFail(decksGet(), 401);
    await expectFail(achievementsGet(), 401);
    await expectFail(questsGet(), 401);
  });

  it("serve public GETs without a session", async () => {
    const board = await expectOk(leaderboardGet());
    expect(Array.isArray(board.rows)).toBe(true);
    expect(board.ownRow ?? null).toBeNull();
    const meta = await expectOk(analyticsGet());
    expect(meta.totalMatches).toBe(0);
  });
});

describe("guest onboarding", () => {
  it("rejects invalid names", async () => {
    await expectFail(guestPost(post("/api/auth/guest", { name: "a" })), 400);
    await expectFail(guestPost(post("/api/auth/guest", { name: "x".repeat(25) })), 400);
    await expectFail(guestPost(post("/api/auth/guest", { name: 123 })), 400);
  });

  it("creates a guest with starting ink", async () => {
    const d = await expectOk(guestPost(post("/api/auth/guest", { name: "Contract Tester" })));
    expect(d.coins).toBe(150);
    expect(jar.get(SESSION_COOKIE)).toBeTruthy();
  });

  it("pays the daily bonus once per day", async () => {
    const first = await expectOk(guestPost(post("/api/auth/guest", {})));
    expect(first.dailyBonus).toBe(100);
    const second = await expectOk(guestPost(post("/api/auth/guest", {})));
    expect(second.dailyBonus).toBe(0);
    expect(second.coins).toBe(first.coins);
  });
});

describe("packs", () => {
  it("reject invalid payloads instead of guessing", async () => {
    await expectFail(packsPost(post("/api/packs", { packs: 0 })), 400);
    await expectFail(packsPost(post("/api/packs", { packs: 11 })), 400);
    await expectFail(packsPost(post("/api/packs", { packs: "2" })), 400);
    await expectFail(packsPost(post("/api/packs", { packs: 1, type: "banana" })), 400);
    await expectFail(
      packsPost(
        new Request(BASE + "/api/packs", {
          method: "POST",
          body: "{oops",
          headers: { "content-type": "application/json" },
        }),
      ),
      400,
    );
  });

  it("refuse unaffordable purchases without spending ink", async () => {
    await expectFail(packsPost(post("/api/packs", { packs: 10 })), 402);
    await expectFail(packsPost(post("/api/packs", { packs: 10, type: "collected" })), 402);
  });

  it("price and floor the Collected Works pack", async () => {
    const before = await expectOk(packsGet());
    const coinsBefore = before.coins as number;
    if (coinsBefore < PACK_PREMIUM_COST) {
      await expectFail(packsPost(post("/api/packs", { packs: 1, type: "collected" })), 402);
      return;
    }
    const d = await expectOk(packsPost(post("/api/packs", { packs: 1, type: "collected" })));
    expect(d.cost).toBe(PACK_PREMIUM_COST);
    expect(d.packType).toBe("collected");
    const hasEpicPlus = (d.cards as { cardId: string }[]).some((c) =>
      ["epic", "legendary"].includes(getCard(c.cardId).rarity),
    );
    expect(hasEpicPlus).toBe(true);
  });

  it("open a pack at the listed cost and refund duplicates", async () => {
    const before = await expectOk(packsGet());
    const d = await expectOk(packsPost(post("/api/packs", { packs: 1 })));
    expect(d.cost).toBe(PACK_COST);
    expect((d.cards as unknown[]).length).toBe(PACK_SIZE);
    expect(d.coinsAfter).toBe((before.coins as number) - PACK_COST + (d.totalRefund as number));
    const after = await expectOk(packsGet());
    expect(after.coins).toBe(d.coinsAfter);
  });
});

describe("matches", () => {
  it("reject malformed payloads", async () => {
    await expectFail(matchesPost(post("/api/matches", matchPayload({ result: "banana" }))), 400);
    await expectFail(matchesPost(post("/api/matches", matchPayload({ turns: 501 }))), 400);
    await expectFail(matchesPost(post("/api/matches", matchPayload({ playerHpLeft: 31 }))), 400);
    await expectFail(
      matchesPost(
        post("/api/matches", matchPayload({ deckUsed: [{ cardId: "paper_swan", count: 3 }] })),
      ),
      400,
    );
    await expectFail(matchesPost(post("/api/matches", matchPayload({ deckUsed: undefined }))), 400);
  });

  it("reject unknown opponents", async () => {
    await expectFail(matchesPost(post("/api/matches", matchPayload({ opponentKey: "ghost" }))), 400);
  });

  it("reject illegal decks", async () => {
    await expectFail(
      matchesPost(post("/api/matches", matchPayload({ deckUsed: LEGAL_DECK.slice(0, 5) }))),
      400,
    );
  });

  it("record a win with a fixed ink award", async () => {
    const before = await expectOk(meGet());
    const d = await expectOk(matchesPost(post("/api/matches", matchPayload({ result: "WIN" }))));
    expect(d.coinsAwarded).toBe(WIN_INK);
    expect(d.coinsAfter).toBe((before.coins as number) + WIN_INK);
    expect(typeof d.mmrAfter).toBe("number");
  });

  it("award 25 for a draw and 15 for a loss", async () => {
    const draw = await expectOk(matchesPost(post("/api/matches", matchPayload({ result: "DRAW" }))));
    expect(draw.coinsAwarded).toBe(25);
    const loss = await expectOk(matchesPost(post("/api/matches", matchPayload({ result: "LOSS" }))));
    expect(loss.coinsAwarded).toBe(15);
  });

  it("list match history", async () => {
    const d = await expectOk(matchesGet(new Request(BASE + "/api/matches?page=1")));
    expect(d.total as number).toBeGreaterThanOrEqual(3);
    expect((d.matches as unknown[]).length).toBeGreaterThan(0);
  });
});

describe("campaign", () => {
  it("reject invalid and out-of-range payloads", async () => {
    await expectFail(campaignPost(post("/api/campaign", { stage: 99, result: "WIN" })), 400);
    await expectFail(campaignPost(post("/api/campaign", { stage: -1, result: "WIN" })), 400);
    await expectFail(campaignPost(post("/api/campaign", { stage: "0", result: "WIN" })), 400);
    await expectFail(campaignPost(post("/api/campaign", { stage: 0, result: "banana" })), 400);
  });

  it("block skip-ahead with 409", async () => {
    await expectFail(campaignPost(post("/api/campaign", { stage: 3, result: "WIN" })), 409);
  });

  it("pay nothing for a loss", async () => {
    const d = await expectOk(campaignPost(post("/api/campaign", { stage: 0, result: "LOSS" })));
    expect(d.cleared).toBe(false);
    expect(d.coinsAwarded).toBe(0);
  });

  it("pay first-clear rewards, then a replay token", async () => {
    const before = await expectOk(meGet());
    const clear = await expectOk(campaignPost(post("/api/campaign", { stage: 0, result: "WIN" })));
    expect(clear.cleared).toBe(true);
    expect(clear.coinsAwarded).toBe(CAMPAIGN_STAGES[0]!.rewardCoins);
    expect(clear.progress).toBe(1);
    expect(clear.coinsAfter).toBe((before.coins as number) + CAMPAIGN_STAGES[0]!.rewardCoins);

    const replay = await expectOk(campaignPost(post("/api/campaign", { stage: 0, result: "WIN" })));
    expect(replay.cleared).toBe(false);
    expect(replay.coinsAwarded).toBe(REPLAY_REWARD);

    const state = await expectOk(campaignGet());
    expect(state.progress).toBe(1);
    const stages = state.stages as { index: number; cleared: boolean; unlocked: boolean }[];
    expect(stages[0]!.cleared).toBe(true);
    expect(stages[1]!.unlocked).toBe(true);
  });
});

describe("decks", () => {
  it("reject invalid payloads", async () => {
    await expectFail(decksPost(post("/api/decks", { name: "", cards: LEGAL_DECK })), 400);
    await expectFail(decksPost(post("/api/decks", { name: "X", cards: "nope" })), 400);
    await expectFail(
      decksPost(post("/api/decks", { name: "X", cards: [{ cardId: "paper_swan", count: 5 }] })),
      400,
    );
  });

  it("reject decks with unowned cards (422)", async () => {
    const archive = await unownedArchiveId();
    const unowned = [{ cardId: archive, count: 2 }, ...LEGAL_DECK.slice(0, 9)];
    await expectFail(decksPost(post("/api/decks", { name: "Archive Dream", cards: unowned })), 422);
  });

  it("create, update and delete a legal custom deck", async () => {
    const created = await expectOk(
      decksPost(post("/api/decks", { name: "Contract Deck", cards: LEGAL_DECK, isActive: true })),
      201,
    );
    const id = created.id as string;

    const renamed = await expectOk(
      deckPut(req(`/api/decks/${id}`, "PUT", { name: "Renamed Deck" }), ctx(id)),
    );
    expect(renamed.name).toBe("Renamed Deck");

    const archive = await unownedArchiveId();
    const unowned = [{ cardId: archive, count: 2 }, ...LEGAL_DECK.slice(0, 9)];
    await expectFail(deckPut(req(`/api/decks/${id}`, "PUT", { cards: unowned }), ctx(id)), 422);

    await expectFail(deckPut(req(`/api/decks/${id}`, "PUT", { name: "X" }), ctx("not-a-real-id")), 404);

    const del = await expectOk(
      deckDelete(new Request(BASE + `/api/decks/${id}`, { method: "DELETE" }), ctx(id)),
    );
    expect(del.deleted).toBe(id);
  });

  it("list decks", async () => {
    const d = await expectOk(decksGet());
    expect(Array.isArray(d)).toBe(true);
    expect((d as unknown as unknown[]).length).toBeGreaterThanOrEqual(3); // starters created at signup
  });
});

describe("profile readouts", () => {
  it("serve the profile, quest, and achievements", async () => {
    const me = await expectOk(meGet());
    expect(me.coins).toBeGreaterThan(0);
    expect(me.campaignStage).toBe(1);
    const quest = await expectOk(questsGet());
    expect(quest.progress).toBeGreaterThanOrEqual(0);
    const ach = await expectOk(achievementsGet());
    expect((ach.achievements as unknown[]).length).toBeGreaterThan(0);
  });
});

describe("ink recycling (craft)", () => {
  it("rejects unsigned and malformed calls", async () => {
    const mainToken = jar.get(SESSION_COOKIE)!;
    jar.clear(); // prior describes leave a session — the 401 check needs a bare request
    await expectFail(craftPost(post("/api/craft", { cardId: "ink_drop" })), 401);
    await expectOk(guestPost(post("/api/auth/guest", { name: "Recycler" })));
    await expectFail(craftPost(post("/api/craft", {})), 400);
    await expectFail(craftPost(post("/api/craft", { cardId: "" })), 400);
    await expectFail(craftPost(post("/api/craft", { cardId: "ghost_card" })), 400);
    jar.set(SESSION_COOKIE, mainToken);
  });

  it("refuses owned cards and empty slip purses", async () => {
    const mainToken = jar.get(SESSION_COOKIE)!;
    jar.clear();
    await expectOk(guestPost(post("/api/auth/guest", { name: "Recycler Two" })));
    // paper_swan is default-owned (wave 1)
    await expectFail(craftPost(post("/api/craft", { cardId: "paper_swan" })), 400);
    // fresh player has zero slips — the cheapest archive card is out of reach
    await expectFail(craftPost(post("/api/craft", { cardId: "ink_drop" })), 422);
    jar.set(SESSION_COOKIE, mainToken);
  });

  it("crafts from a funded slip purse and spends exactly the cost", async () => {
    const mainToken = jar.get(SESSION_COOKIE)!;
    jar.clear();
    await expectOk(guestPost(post("/api/auth/guest", { name: "Recycler Three" })));
    const player = await prisma.player.findFirst({ where: { sessionToken: jar.get(SESSION_COOKIE)! } });
    expect(player).toBeTruthy();
    await prisma.player.update({
      where: { id: player!.id },
      data: { recycleSlips: { common: 2, rare: 0, epic: 0, legendary: 0 } },
    });
    const d = await expectOk(craftPost(post("/api/craft", { cardId: "ink_drop" })));
    expect((d.slips as { common: number }).common).toBe(0);
    const me = await expectOk(meGet());
    expect(((me.slips as { common: number }).common)).toBe(0);
    expect((me.collection as { id: string; owned: boolean }[]).find((c) => c.id === "ink_drop")?.owned).toBe(true);
    jar.set(SESSION_COOKIE, mainToken);
  });

  it("accrues slips from pack duplicates", async () => {
    const mainToken = jar.get(SESSION_COOKIE)!;
    jar.clear();
    await expectOk(guestPost(post("/api/auth/guest", { name: "Recycler Four" })));
    const d = await expectOk(packsPost(post("/api/packs", { packs: 1 })));
    const dupes = (d.cards as { cardId: string; isNew: boolean }[]).filter((c) => !c.isNew);
    const earned = { common: 0, rare: 0, epic: 0, legendary: 0 };
    for (const dupe of dupes) earned[getCard(dupe.cardId).rarity as keyof typeof earned]++;
    expect(d.slipsEarned).toEqual(earned);
    const me = await expectOk(meGet());
    expect(me.slips).toEqual(d.slips);
    jar.set(SESSION_COOKIE, mainToken);
  });
});

describe("ink ledger fuzz", () => {
  // 48 ops × several DB round-trips each — needs more than the 5s default on
  // slow filesystems when the suite runs in parallel
  it("keeps the ledger exact across a random session", async () => {
    const mainToken = jar.get(SESSION_COOKIE)!;
    jar.clear();
    const g = await expectOk(guestPost(post("/api/auth/guest", { name: "Ledger Fuzzer" })));
    let expected = g.coins as number;
    let progress = 0;

    const rand = mulberry32(20261030);
    const outcomes = ["WIN", "DRAW", "LOSS"] as const;

    for (let i = 0; i < 48; i++) {
      const roll = rand();
      if (roll < 0.4) {
        const result = outcomes[Math.floor(rand() * 3)]!;
        const d = await expectOk(matchesPost(post("/api/matches", matchPayload({ result }))));
        expected += d.coinsAwarded as number;
        expect(d.coinsAfter).toBe(expected);
      } else if (roll < 0.65) {
        const packs = 1 + Math.floor(rand() * 3);
        const res = await packsPost(post("/api/packs", { packs }));
        if (expected < packs * PACK_COST) {
          await expectFail(res, 402);
        } else {
          const d = await expectOk(res);
          expected += (d.totalRefund as number) - (d.cost as number);
          expect(d.coinsAfter).toBe(expected);
        }
      } else if (roll < 0.75) {
        const d = await expectOk(guestPost(post("/api/auth/guest", {})));
        expected += d.dailyBonus as number;
        expect(d.coins).toBe(expected);
      } else if (roll < 0.9) {
        if (progress < CAMPAIGN_STAGES.length) {
          const d = await expectOk(
            campaignPost(post("/api/campaign", { stage: progress, result: "WIN" })),
          );
          expect(d.cleared).toBe(true);
          expect(d.coinsAwarded).toBe(CAMPAIGN_STAGES[progress]!.rewardCoins);
          expected += d.coinsAwarded as number;
          progress++;
        } else {
          const d = await expectOk(campaignPost(post("/api/campaign", { stage: 0, result: "WIN" })));
          expect(d.coinsAwarded).toBe(REPLAY_REWARD);
          expected += d.coinsAwarded as number;
        }
      } else {
        const d = await expectOk(meGet());
        expect(d.coins).toBe(expected);
      }
    }

    const final = await expectOk(meGet());
    expect(final.coins).toBe(expected);
    jar.set(SESSION_COOKIE, mainToken);
  }, 60_000);
});
