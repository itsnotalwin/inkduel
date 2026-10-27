import { describe, expect, it } from "vitest";
import { randomDeck, validateDeck, expandDeck } from "@/game/decks";
import { CARDS, LEGENDARY_IDS } from "@/game/cards";

describe("deck validation", () => {
  const legal = [
    { cardId: "ink_blot", count: 2 },
    { cardId: "paper_swan", count: 2 },
    { cardId: "red_pen", count: 2 },
    { cardId: "graphite_golem", count: 2 },
    { cardId: "page_knight", count: 2 },
    { cardId: "inkwell_imp", count: 2 },
    { cardId: "origami_crane", count: 2 },
    { cardId: "blank_page", count: 2 },
    { cardId: "fresh_ink", count: 2 },
    { cardId: "crumpled_note", count: 2 },
  ];

  it("accepts a legal 20-card deck", () => {
    expect(validateDeck(legal)).toEqual([]);
  });

  it("blocks a 21-card deck", () => {
    const bad = legal.map((e) => ({ ...e }));
    bad[0] = { cardId: "ink_blot", count: 3 };
    const errors = validateDeck(bad);
    expect(errors.some((e) => e.includes("exactly 20"))).toBe(true);
    expect(errors.some((e) => e.includes("Only two copies"))).toBe(true);
  });

  it("blocks a 3-copy deck", () => {
    const bad = [...legal, { cardId: "paper_swan", count: 1 }];
    const errors = validateDeck(bad);
    expect(errors.some((e) => e.includes("Only two copies"))).toBe(true);
  });

  it("blocks two copies of a legendary", () => {
    const bad = [...legal.slice(0, 9), { cardId: LEGENDARY_IDS[0], count: 2 }];
    const errors = validateDeck(bad);
    expect(errors.some((e) => e.toLowerCase().includes("legendary"))).toBe(true);
  });

  it("blocks unowned cards when a collection is given", () => {
    const owned = new Set(legal.map((e) => e.cardId));
    expect(validateDeck(legal, owned)).toEqual([]);
    const errors2 = validateDeck([{ cardId: "the_unwritten", count: 1 }, ...legal.slice(0, 9)], owned);
    expect(errors2.some((e) => e.includes("not in your collection"))).toBe(true);
  });

  it("blocks a 19-card deck", () => {
    const bad = [...legal.slice(0, 9), { cardId: "red_pen", count: 1 }];
    const errors = validateDeck(bad);
    expect(errors.some((e) => e.includes("19"))).toBe(true);
  });
});

describe("randomDeck (the Gambler)", () => {
  it("always produces a legal 20-card deck", () => {
    for (const seed of [1, 2, 3, 99, 12345, 777777]) {
      const d = randomDeck(seed);
      expect(validateDeck(d)).toEqual([]);
      expect(expandDeck(d)).toHaveLength(20);
    }
  });

  it("draws only from the supplied pool", () => {
    const pool = ["ink_blot", "paper_swan", "red_pen", "graphite_golem", "page_knight", "inkwell_imp", "origami_crane", "blank_page", "fresh_ink", "paper_cut", "crumpled_note"];
    const d = randomDeck(7, pool);
    expect(d.every((e) => pool.includes(e.cardId))).toBe(true);
  });

  it("never exceeds one copy of a legendary", () => {
    for (let seed = 0; seed < 30; seed++) {
      const d = randomDeck(seed);
      for (const e of d) {
        const def = CARDS.find((c) => c.id === e.cardId)!;
        if (def.rarity === "legendary") expect(e.count).toBe(1);
        else expect(e.count).toBeLessThanOrEqual(2);
      }
    }
  });
});
