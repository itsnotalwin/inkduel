import { describe, expect, it } from "vitest";
import { decodeDeckCode, encodeDeckCode } from "@/lib/deck-code";
import { ARCHETYPE_DECKS } from "@/game/cards";

describe("deck share codes", () => {
  it("round-trips every archetype deck", () => {
    for (const deck of Object.values(ARCHETYPE_DECKS)) {
      const entries = deck.cards.map(([cardId, count]) => ({ cardId, count }));
      const code = encodeDeckCode(entries);
      expect(code).not.toMatch(/[^a-z0-9_.;]/); // URL-safe by construction
      expect(decodeDeckCode(code)).toEqual([...entries].sort((x, y) => x.cardId.localeCompare(y.cardId)));
    }
  });

  it("is stable regardless of input order", () => {
    const a = encodeDeckCode([{ cardId: "paper_swan", count: 2 }, { cardId: "red_pen", count: 2 }]);
    const b = encodeDeckCode([{ cardId: "red_pen", count: 2 }, { cardId: "paper_swan", count: 2 }]);
    expect(a).toBe(b);
  });

  it("rejects garbage, unknown cards, tokens, and illegal counts", () => {
    expect(decodeDeckCode("not-a-code")).toBeNull();
    expect(decodeDeckCode("ghost_card.2")).toBeNull();
    expect(decodeDeckCode("scribble.2")).toBeNull(); // token
    expect(decodeDeckCode("paper_swan.3")).toBeNull(); // over copy limit
    expect(decodeDeckCode("the_archivist.2")).toBeNull(); // legendary ×2
    expect(decodeDeckCode("paper_swan.2;paper_swan.1")).toBeNull(); // duplicate entry
    expect(decodeDeckCode("paper_swan")).toBeNull(); // missing count
    expect(decodeDeckCode("")).toBeNull();
  });
});
