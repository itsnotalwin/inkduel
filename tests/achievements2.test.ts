/**
 * Achievement set 2 — the newer systems: campaign clears, pack/craft counters,
 * puzzle archive, draft wins, the live Blot, and comeback wins. The checks are
 * pure functions over AchievementContext, so the whole matrix runs without a
 * server; the shared evaluator wires the same contexts from real records
 * (covered by the api-contract suite).
 */
import { describe, expect, it } from "vitest";
import { ACHIEVEMENTS, ACHIEVEMENT_BY_KEY, type AchievementContext } from "@/lib/achievements";
import { makePuzzle, applyAction, positionChanged } from "@/game/engine";
import { pickBot, BOTS } from "@/config";
import { getCard } from "@/game/cards";

function ctx(overrides: Partial<AchievementContext>): AchievementContext {
  return {
    wins: 0,
    losses: 0,
    draws: 0,
    streak: 0,
    bestStreak: 0,
    mmr: 1000,
    customDeckCount: 0,
    campaignStage: 0,
    packsOpened: 0,
    puzzlesSolved: 0,
    cardsCrafted: 0,
    blotActive: false,
    match: {
      opponentKey: "duelist",
      result: "WIN",
      turns: 10,
      playerHpLeft: 20,
      botHpLeft: 0,
      seed: 1,
      deckUsed: [],
      durationMs: 0,
      maxTurnDamage: 0,
      maxTurnKills: 0,
      tookFatigue: false,
    },
    held: new Set<string>(),
    ...overrides,
  };
}

const check = (key: string, c: AchievementContext) => ACHIEVEMENT_BY_KEY.get(key)!.check(c);

describe("achievement set 2 — checks", () => {
  it("campaign frontier gates the campaign stamps", () => {
    expect(check("stage_one", ctx({ campaignStage: 2 }))).toBe(true);
    expect(check("stage_one", ctx({ campaignStage: 1 }))).toBe(false);
    expect(check("campaign_half", ctx({ campaignStage: 10 }))).toBe(true);
    expect(check("campaign_half", ctx({ campaignStage: 9 }))).toBe(false);
    expect(check("campaign_complete", ctx({ campaignStage: 20 }))).toBe(true);
    expect(check("campaign_complete", ctx({ campaignStage: 19 }))).toBe(false);
  });

  it("the full campaign unlock is a legendary", () => {
    const unlock = ACHIEVEMENT_BY_KEY.get("campaign_complete")!.unlocksCard;
    expect(unlock).toBeDefined();
    expect(getCard(unlock!).rarity).toBe("legendary");
  });

  it("pack, craft and puzzle counters unlock on thresholds", () => {
    expect(check("pack_first", ctx({ packsOpened: 1 }))).toBe(true);
    expect(check("pack_first", ctx({ packsOpened: 0 }))).toBe(false);
    expect(check("pack_ten", ctx({ packsOpened: 10 }))).toBe(true);
    expect(check("pack_thirty", ctx({ packsOpened: 29 }))).toBe(false);
    expect(check("craft_first", ctx({ cardsCrafted: 1 }))).toBe(true);
    expect(check("puzzle_first", ctx({ puzzlesSolved: 1 }))).toBe(true);
    expect(check("puzzle_archive", ctx({ puzzlesSolved: 6 }))).toBe(true);
    expect(check("puzzle_archive", ctx({ puzzlesSolved: 5 }))).toBe(false);
  });

  it("fresh ink requires a won draft duel", () => {
    expect(check("draft_win", ctx({ match: { opponentKey: "ink-draft", result: "WIN", turns: 10, playerHpLeft: 20, botHpLeft: 0, seed: 1, deckUsed: [], durationMs: 0, maxTurnDamage: 0, maxTurnKills: 0, tookFatigue: false } }))).toBe(true);
    expect(check("draft_win", ctx({ match: { opponentKey: "ink-draft", result: "LOSS", turns: 10, playerHpLeft: 0, botHpLeft: 30, seed: 1, deckUsed: [], durationMs: 0, maxTurnDamage: 0, maxTurnKills: 0, tookFatigue: false } }))).toBe(false);
    expect(check("draft_win", ctx({}))).toBe(false);
  });

  it("stain survivor needs a live blot AND a win", () => {
    expect(check("blot_survivor", ctx({ blotActive: true }))).toBe(true);
    expect(check("blot_survivor", ctx({ blotActive: false }))).toBe(false);
    expect(
      check(
        "blot_survivor",
        ctx({
          blotActive: true,
          match: { opponentKey: "duelist", result: "LOSS", turns: 10, playerHpLeft: 0, botHpLeft: 30, seed: 1, deckUsed: [], durationMs: 0, maxTurnDamage: 0, maxTurnKills: 0, tookFatigue: false },
        }),
      ),
    ).toBe(false);
  });

  it("second draft pays for low-hp wins", () => {
    expect(check("comeback", ctx({ match: { opponentKey: "duelist", result: "WIN", turns: 10, playerHpLeft: 5, botHpLeft: 0, seed: 1, deckUsed: [], durationMs: 0, maxTurnDamage: 0, maxTurnKills: 0, tookFatigue: false } }))).toBe(true);
    expect(check("comeback", ctx({ match: { opponentKey: "duelist", result: "WIN", turns: 10, playerHpLeft: 6, botHpLeft: 0, seed: 1, deckUsed: [], durationMs: 0, maxTurnDamage: 0, maxTurnKills: 0, tookFatigue: false } }))).toBe(false);
  });

  it("set 2 adds exactly twelve achievements and three legendary unlocks", () => {
    expect(ACHIEVEMENTS.length).toBe(24);
    const setTwo = ACHIEVEMENTS.slice(12);
    expect(setTwo.filter((a) => a.unlocksCard).length).toBe(3);
  });
});

describe("positionChanged — the puzzle no-op detector", () => {
  it("rejects a silent no-op (illegal action) as unchanged", () => {
    const spec = {
      seed: 7,
      heroHpA: 30,
      heroHpB: 1,
      manaA: 10,
      manaB: 0,
      boardA: [{ cardId: "paper_swan", attack: 5 }],
      boardB: [],
      handA: ["red_pen"],
      handB: [],
    };
    const state = makePuzzle(spec);
    // the legal attack must move the position (5 attack into 1 HP — a win)
    const next = applyAction(state, { type: "ATTACK", side: "A", attackerUid: "a0", target: { hero: "B" } });
    expect(positionChanged(state, next)).toBe(true);
    // an illegal attack (no such attacker) must leave the position untouched
    const noop = applyAction(state, { type: "ATTACK", side: "A", attackerUid: "missing_uid", target: { hero: "B" } });
    expect(positionChanged(state, noop)).toBe(false);
  });
});

describe("matchmaking pick", () => {
  it("stays inside the MMR window when neighbors exist", () => {
    for (let i = 0; i < 50; i++) {
      const bot = pickBot(1100, 80, Math.random);
      expect(Math.abs(bot.elo - 1100)).toBeLessThanOrEqual(80);
    }
  });

  it("falls back to the nearest challenger outside every window", () => {
    expect(pickBot(2200).key).toBe("archivist");
    expect(pickBot(200).key).toBe("duelist");
    expect(BOTS.length).toBe(4);
  });
});
