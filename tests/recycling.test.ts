import { describe, expect, it } from "vitest";
import {
  addSlips,
  canCraft,
  slipsFromDuplicates,
  spendSlips,
  ZERO_SLIPS,
  CRAFT_COST,
  type PackCard,
} from "@/game/packs";
import { COLLECTIBLE_CARDS, COLLECTIBLE_SETS, computeSetCompletion, pendingSetRewards } from "@/game/cards";
import { applySeasonRollover, currentSeason, seasonLabel, seasonPayout, seasonResetMmr } from "@/lib/season";

function card(cardId: string, isNew: boolean): PackCard {
  return { cardId, isNew, refund: isNew ? 0 : 20 };
}

describe("ink recycling slips", () => {
  it("count one slip per duplicate, grouped by rarity, ignoring new cards", () => {
    const slips = slipsFromDuplicates([
      card("paper_swan", true),
      card("red_pen", false), // common dupe
      card("red_pen", false), // common dupe
      card("editors_verdict", false), // rare dupe
      card("paper_storm", false), // epic dupe
      card("the_archivist", false), // legendary dupe
    ]);
    expect(slips).toEqual({ common: 2, rare: 1, epic: 1, legendary: 1 });
  });

  it("accumulate and spend exactly the craft cost", () => {
    let slips = addSlips(ZERO_SLIPS, { common: 1, rare: 0, epic: 0, legendary: 5 });
    slips = addSlips(slips, { common: 1, rare: 3, epic: 0, legendary: 0 });
    expect(slips).toEqual({ common: 2, rare: 3, epic: 0, legendary: 5 });

    expect(canCraft(slips, "common")).toBe(true);
    expect(canCraft(slips, "rare")).toBe(true);
    expect(canCraft(slips, "epic")).toBe(false);
    expect(canCraft(slips, "legendary")).toBe(true);

    const after = spendSlips(slips, "legendary");
    expect(after.legendary).toBe(0);
    expect(canCraft(after, "legendary")).toBe(false);
    // spendSlips never mutates its input
    expect(slips.legendary).toBe(5);
  });

  it("charges more for higher rarities", () => {
    expect(CRAFT_COST.common).toBeLessThan(CRAFT_COST.rare);
    expect(CRAFT_COST.rare).toBeLessThan(CRAFT_COST.epic);
    expect(CRAFT_COST.epic).toBeLessThan(CRAFT_COST.legendary);
  });
});

describe("card set completion", () => {
  it("partitions every collectible card into exactly one set", () => {
    const union = new Set(COLLECTIBLE_SETS.flatMap((s) => s.ids));
    expect(union.size).toBe(COLLECTIBLE_CARDS.length);
    for (const c of COLLECTIBLE_CARDS) expect(union.has(c.id), c.id).toBe(true);
  });

  it("tracks completion and grants each set reward exactly once", () => {
    const first = COLLECTIBLE_SETS[0];
    const owned = new Set(first!.ids);
    let completion = computeSetCompletion(owned, new Set());
    expect(completion[0]!.complete).toBe(true);
    expect(completion[0]!.rewardClaimed).toBe(false);
    expect(completion[1]!.complete).toBe(false);
    expect(pendingSetRewards(completion)).toEqual(["first-edition"]);

    // after claiming, the reward never pends again
    completion = computeSetCompletion(owned, new Set(["first-edition"]));
    expect(pendingSetRewards(completion)).toEqual([]);
    expect(completion[0]!.complete).toBe(true);
    expect(completion[0]!.rewardClaimed).toBe(true);
  });
});

describe("seasonal ladder", () => {
  it("labels issues in calendar order", () => {
    expect(currentSeason(new Date("2026-01-15"))).toBe(0);
    expect(currentSeason(new Date("2026-02-01"))).toBe(1);
    expect(currentSeason(new Date("2027-01-01"))).toBe(12);
    expect(seasonLabel(0)).toBe("Issue 1");
    expect(seasonLabel(11)).toBe("Issue 12");
  });

  it("soft-resets MMR halfway to baseline, never below 1000", () => {
    expect(seasonResetMmr(1400)).toBe(1200);
    expect(seasonResetMmr(2000)).toBe(1500);
    expect(seasonResetMmr(1000)).toBe(1000);
    expect(seasonResetMmr(950)).toBe(1000);
    expect(seasonResetMmr(980)).toBe(1000);
  });

  it("pays more for higher ranks", () => {
    const ladder = seasonPayout("wood");
    for (const key of ["bronze", "silver", "gold", "platinum", "obsidian", "ink-master"] as const) {
      expect(seasonPayout(key)).toBeGreaterThan(ladder);
    }
    expect(seasonPayout("ink-master")).toBeGreaterThan(seasonPayout("bronze"));
  });

  it("rolls over exactly once and only pays players who played", () => {
    const season = currentSeason();
    // active player: payout + reset, applied once
    const active = { seasonSeen: season - 1, mmr: 1400, coins: 100, matchesPlayed: 10 };
    const fired = applySeasonRollover(active, season);
    expect(fired.applied).toBe(true);
    expect(fired.payout).toBe(seasonPayout("gold"));
    expect(fired.mmr).toBe(1200);
    // same season again: nothing
    expect(applySeasonRollover({ ...active, seasonSeen: season }, season).applied).toBe(false);
    // never played: marked current, no payout, no reset
    const fresh = applySeasonRollover({ seasonSeen: season - 1, mmr: 1000, coins: 150, matchesPlayed: 0 }, season);
    expect(fresh.applied).toBe(true);
    expect(fresh.payout).toBe(0);
    expect(fresh.mmr).toBe(1000);
  });
});
