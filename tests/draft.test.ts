import { describe, expect, it } from "vitest";
import {
  DECK_PICKS,
  buildDraftStash,
  pickFromOffer,
  picksToDeck,
  rivalDraft,
  startDraftRun,
} from "@/game/draft";
import { expandDeck, validateDeck, type DeckEntry } from "@/game/decks";
import { CARD_BY_ID, COLLECTIBLE_CARDS } from "@/game/cards";

describe("draft offers", () => {
  it("over 200 seeds: every offer is 3 distinct collectible non-token cards, and greedy picking yields a legal 20-card deck", () => {
    for (let seed = 0; seed < 200; seed++) {
      let run = startDraftRun(seed);
      let offersWithUnit = 0;
      let offersSeen = 0;
      for (let i = 0; i < DECK_PICKS; i++) {
        expect(run.offer).toHaveLength(3);
        expect(new Set(run.offer).size).toBe(3);
        for (const id of run.offer) {
          const def = CARD_BY_ID.get(id);
          expect(def, `seed ${seed} offered unknown card "${id}"`).toBeDefined();
          expect(def!.token ?? false).toBe(false); // collectible, never a token
        }
        // curve rule: at least one cheap card (cost <= 3) in every offer
        expect(run.offer.some((id) => CARD_BY_ID.get(id)!.cost <= 3)).toBe(true);
        if (run.offer.some((id) => CARD_BY_ID.get(id)!.type === "unit")) offersWithUnit++;
        offersSeen++;

        run = pickFromOffer(run, run.offer[0]); // greedy: always pick offer[0]
      }
      expect(run.complete).toBe(true);
      expect(run.picks).toHaveLength(DECK_PICKS);
      // curve rule: at least one unit in 4 of every 5 offers
      expect(offersWithUnit / offersSeen).toBeGreaterThanOrEqual(0.75);

      const deck: DeckEntry[] = run.picks.map((id) => ({ cardId: id, count: 1 }));
      expect(validateDeck(deck)).toEqual([]);
      expect(expandDeck(deck)).toHaveLength(DECK_PICKS);
    }
  });

  it("copy caps are never violated: no 3rd copy, no 2nd copy of a legendary", () => {
    for (let seed = 0; seed < 60; seed++) {
      let run = startDraftRun(seed * 7919);
      const counts = new Map<string, number>();
      for (let i = 0; i < DECK_PICKS; i++) {
        const id = run.offer[0];
        const def = CARD_BY_ID.get(id)!;
        const used = counts.get(id) ?? 0;
        const limit = def.rarity === "legendary" ? 1 : 2;
        expect(used, `seed ${seed} offered a ${used + 1}th copy of "${id}"`).toBeLessThan(limit);
        counts.set(id, used + 1);
        run = pickFromOffer(run, id);
      }
    }
  });

  it("same seed → identical offers; the run replays byte-for-byte", () => {
    for (const seed of [1, 42, 987654, 20261028]) {
      let a = startDraftRun(seed);
      let b = startDraftRun(seed);
      expect(a.offer).toEqual(b.offer);
      for (let i = 0; i < 6; i++) {
        const id = a.offer[i % 3];
        a = pickFromOffer(a, id);
        b = pickFromOffer(b, id);
        expect(a.picks).toEqual(b.picks);
        expect(a.offer).toEqual(b.offer);
      }
    }
  });

  it("rejects a pick that is not in the offer", () => {
    const run = startDraftRun(11);
    const notOffered = COLLECTIBLE_CARDS.map((c) => c.id).find((id) => !run.offer.includes(id))!;
    expect(() => pickFromOffer(run, notOffered)).toThrow();
    expect(() => pickFromOffer(run, "ghost_text")).toThrow(); // a token is never offered
  });
});

describe("rivalDraft", () => {
  it("produces legal 20-card decks with no tokens, deterministically", () => {
    for (let seed = 0; seed < 30; seed++) {
      const ids = rivalDraft(seed);
      expect(ids).toHaveLength(DECK_PICKS);
      for (const id of ids) {
        expect(CARD_BY_ID.get(id)!.token ?? false).toBe(false);
      }
      expect(validateDeck(picksToDeck(ids))).toEqual([]);
      expect(rivalDraft(seed)).toEqual(ids); // deterministic per seed
    }
  });

  it("is curve-weighted: the opening picks lean toward cost <= 4", () => {
    let cheap = 0;
    let total = 0;
    for (let seed = 0; seed < 40; seed++) {
      const ids = rivalDraft(seed);
      for (let i = 0; i < 10; i++) {
        total++;
        if (CARD_BY_ID.get(ids[i])!.cost <= 4) cheap++;
      }
    }
    expect(cheap / total).toBeGreaterThan(0.7);
  });
});

describe("draft stash", () => {
  it("builds two legal decks plus the shared seed", () => {
    let run = startDraftRun(31337);
    const rival = rivalDraft(31337);
    for (let i = 0; i < DECK_PICKS; i++) run = pickFromOffer(run, run.offer[0]);
    const stash = buildDraftStash(run, rival);
    expect(stash.seed).toBe(31337);
    expect(stash.player).toHaveLength(DECK_PICKS);
    expect(stash.player.every((e) => e.count === 1)).toBe(true);
    expect(expandDeck(stash.player)).toEqual(run.picks);
    expect(expandDeck(stash.rival)).toEqual(rival);
    expect(validateDeck(stash.player)).toEqual([]);
    expect(validateDeck(stash.rival)).toEqual([]);
  });

  it("picksToDeck merges duplicate picks", () => {
    expect(picksToDeck(["a", "b", "a"])).toEqual([
      { cardId: "a", count: 2 },
      { cardId: "b", count: 1 },
    ]);
  });
});
