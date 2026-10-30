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
