import { describe, expect, it } from "vitest";
import { applyAction, createGame, effectiveCost, getLegalActions, type GameState } from "@/game/engine";
import { getCard } from "@/game/cards";
import { BLOT_MUTATIONS, blotActiveMutationFor, blotMutationFor, blotWeekIndex, type TableMutation } from "@/game/blot";

const FILLER = "ink_blot"; // 1-cost 1/2 vanilla unit
const SPELL = "second_wind"; // 2-cost spell, no target required

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
/** Monday, January 5, 2026, 00:00 UTC — the week the blot began to spread. */
const EPOCH = Date.UTC(2026, 0, 5);

const HUNGRY: TableMutation = { key: "the-blot-hungers", name: "THE BLOT HUNGERS", blurb: "It starts with your blood ink.", heroHp: 25 };
const SMUDGED: TableMutation = { key: "smudged-signs", name: "SMUDGED SIGNS", blurb: "lettering runs", spellTax: 1 };
const WELL: TableMutation = { key: "the-well-runs-deep", name: "THE WELL RUNS DEEP", blurb: "the ink rises", extraStartingMana: 1 };

function deck(n = 20, cardId = FILLER): string[] {
  return Array.from({ length: n }, () => cardId);
}

/** Start a game with a mutation and finish both mulligans (keep everything).
 *  Returning state has side A on turn 1 with its mana clock already run. */
function startGame(seed = 42, deckA = deck(), deckB = deck(), mutation?: TableMutation): GameState {
  let s = createGame(seed, deckA, deckB, "A", "You", "Opponent", mutation);
  s = applyAction(s, { type: "MULLIGAN", side: "A", uids: [] });
  s = applyAction(s, { type: "MULLIGAN", side: "B", uids: [] });
  return s;
}

describe("blot rotation", () => {
  it("is stable for fixed dates: one mutation per week, in order", () => {
    expect(blotWeekIndex(EPOCH)).toBe(0);
    expect(blotMutationFor(EPOCH)).toBe(BLOT_MUTATIONS[0]);
    // the last instant of week 0 is still week 0
    expect(blotWeekIndex(EPOCH + WEEK_MS - 1)).toBe(0);
    expect(blotMutationFor(EPOCH + WEEK_MS - 1)).toBe(BLOT_MUTATIONS[0]);
    expect(blotMutationFor(EPOCH + 1 * WEEK_MS)).toBe(BLOT_MUTATIONS[1]);
    expect(blotMutationFor(EPOCH + 2 * WEEK_MS)).toBe(BLOT_MUTATIONS[2]);
    expect(blotMutationFor(EPOCH + 3 * WEEK_MS)).toBe(BLOT_MUTATIONS[3]);
    // mid-week dates resolve to the same mutation as their Monday
    expect(blotMutationFor(EPOCH + 2 * WEEK_MS + 3 * DAY_MS)).toBe(BLOT_MUTATIONS[2]);
    // a fixed real-world date: 2026-11-02 is exactly 43 weeks after the epoch
    expect(blotWeekIndex(Date.UTC(2026, 10, 2))).toBe(43);
    expect(blotMutationFor(Date.UTC(2026, 10, 2))).toBe(BLOT_MUTATIONS[3]);
  });

  it("wraps every 4 weeks and is deterministic", () => {
    for (let n = 0; n < 12; n++) {
      expect(blotMutationFor(EPOCH + n * WEEK_MS)).toBe(BLOT_MUTATIONS[n % 4]);
      // deterministic: the same instant always answers the same mutation
      expect(blotMutationFor(EPOCH + n * WEEK_MS)).toBe(blotMutationFor(EPOCH + n * WEEK_MS));
    }
    expect(blotWeekIndex(EPOCH + 4 * WEEK_MS)).toBe(4);
    expect(blotMutationFor(EPOCH + 4 * WEEK_MS)).toBe(blotMutationFor(EPOCH));
  });

  it("has exactly four mutations in rotation order; the mirror carries no numeric effect", () => {
    expect(BLOT_MUTATIONS).toHaveLength(4);
    expect(BLOT_MUTATIONS.map((m) => m.key)).toEqual(["the-blot-hungers", "smudged-signs", "the-well-runs-deep", "the-shadow-mirror"]);
    expect(BLOT_MUTATIONS[0].heroHp).toBe(25);
    expect(BLOT_MUTATIONS[1].spellTax).toBe(1);
    expect(BLOT_MUTATIONS[2].extraStartingMana).toBe(1);
    expect(BLOT_MUTATIONS[3].heroHp).toBeUndefined();
    expect(BLOT_MUTATIONS[3].spellTax).toBeUndefined();
    expect(BLOT_MUTATIONS[3].extraStartingMana).toBeUndefined();
  });

  it("reports no active mutation before the blot began to spread", () => {
    expect(blotActiveMutationFor(EPOCH - 1)).toBeNull();
    expect(blotActiveMutationFor(EPOCH)).toBe(BLOT_MUTATIONS[0]);
    expect(blotActiveMutationFor(Date.UTC(2026, 10, 2))).toBe(BLOT_MUTATIONS[3]);
  });
});

describe("blot engine effects", () => {
  it("heroHp mutation: both heroes start there", () => {
    const s = createGame(3, deck(), deck(), "A", "You", "Opponent", HUNGRY);
    expect(s.mutation).toBe(HUNGRY);
    expect(s.players.A.heroHp).toBe(25);
    expect(s.players.B.heroHp).toBe(25);
    // the rest of setup is untouched: hands were still dealt
    expect(s.players.A.hand).toHaveLength(4);
    expect(s.players.B.hand).toHaveLength(4);
  });

  it("extraStartingMana: turn 1 mana = 3+1 for both sides, then +1 per turn", () => {
    const s = startGame(7, deck(), deck(), WELL);
    // A's turn 1 already ran through startTurn (after both mulligans)
    expect(s.players.A.maxMana).toBe(4);
    expect(s.players.A.mana).toBe(4);
    // B's first turn also starts at 3+1
    let t = applyAction(s, { type: "END_TURN", side: "A" });
    expect(t.players.B.maxMana).toBe(4);
    expect(t.players.B.mana).toBe(4);
    // A's second turn: 3 + 1 (clock) + 1 (blot) = 5
    t = applyAction(t, { type: "END_TURN", side: "B" });
    expect(t.players.A.maxMana).toBe(5);
    expect(t.players.A.mana).toBe(5);
  });

  it("spellTax: a 2-cost spell needs 3 mana — legality and payment agree", () => {
    const s = startGame(9, deck(20, SPELL), deck(), SMUDGED);
    s.players.A.hand = [{ uid: "spell1", cardId: SPELL }];
    expect(effectiveCost(s, getCard(SPELL))).toBe(3);

    // at 2 mana the spell is not legal
    s.players.A.mana = 2;
    expect(getLegalActions(s).plays.find((p) => p.uid === "spell1")).toBeUndefined();
    // at 3 mana it is
    s.players.A.mana = 3;
    expect(getLegalActions(s).plays.find((p) => p.uid === "spell1")).toBeDefined();
    // playing it deducts the taxed cost (3), not the printed one (2)
    const played = applyAction(s, { type: "PLAY_CARD", side: "A", uid: "spell1" });
    expect(played.players.A.mana).toBe(0);
    expect(played.players.A.hand).toHaveLength(0);
  });

  it("spellTax: units stay untaxed, and a plain table plays the spell at 2", () => {
    // units are never taxed
    const taxed = startGame(9, deck(), deck(), SMUDGED);
    taxed.players.A.hand = [{ uid: "unit1", cardId: FILLER }];
    taxed.players.A.mana = 1;
    expect(effectiveCost(taxed, getCard(FILLER))).toBe(1);
    expect(getLegalActions(taxed).plays.find((p) => p.uid === "unit1")).toBeDefined();
    // control: without the tax the 2-cost spell is legal at 2 mana
    const plain = startGame(9, deck(20, SPELL));
    plain.players.A.hand = [{ uid: "spell1", cardId: SPELL }];
    plain.players.A.mana = 2;
    expect(effectiveCost(plain, getCard(SPELL))).toBe(2);
    expect(getLegalActions(plain).plays.find((p) => p.uid === "spell1")).toBeDefined();
  });

  it("no mutation behaves exactly like today", () => {
    const dA = deck();
    const dB = deck();
    const plain = createGame(42, dA, dB, "A");
    const withUndefined = createGame(42, dA, dB, "A", undefined, undefined, undefined);
    expect(withUndefined.mutation).toBeNull();
    expect(JSON.stringify(withUndefined)).toBe(JSON.stringify(plain));
    expect(plain.players.A.heroHp).toBe(30);
    expect(plain.players.B.heroHp).toBe(30);
    expect(effectiveCost(plain, getCard(SPELL))).toBe(getCard(SPELL).cost);
  });
});
