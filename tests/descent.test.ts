/**
 * DESCENT INTO THE SEALED WING — the firstBonus engine contract (side-scoped
 * blessings), the blessing draft, and the floor mapping.
 */
import { describe, expect, it } from "vitest";
import { applyAction, createGame } from "@/game/engine";
import {
  BLESSINGS,
  DESCENT_FLOORS,
  blessingOffer,
  blessingsToFirstBonus,
  descentFloorBot,
  descentFloorSpec,
  startRun,
  takeBlessing,
} from "@/game/descent";
import { BOTS } from "@/game/ai";

const FILLER = "ink_blot";

function deck(n = 20, cardId = FILLER): string[] {
  return Array.from({ length: n }, () => cardId);
}

describe("descent — the firstBonus engine contract", () => {
  it("heroHpBonus raises only the first side's hero", () => {
    const s = createGame(1, deck(), deck(), "A", "You", "Foe", undefined, { heroHpBonus: 5 });
    expect(s.players.A.heroHp).toBe(35);
    expect(s.players.B.heroHp).toBe(30);
  });

  it("extraStartingMana rides only the first side's turns", () => {
    let s = createGame(2, deck(), deck(), "A", "You", "Foe", undefined, { extraStartingMana: 1 });
    s = applyAction(s, { type: "MULLIGAN", side: "A", uids: [] });
    s = applyAction(s, { type: "MULLIGAN", side: "B", uids: [] });
    expect(s.players.A.maxMana).toBe(4); // turn 1: 3 + 1
    s = applyAction(s, { type: "END_TURN", side: "A" });
    expect(s.players.B.maxMana).toBe(3); // the rival gets nothing
    s = applyAction(s, { type: "END_TURN", side: "B" });
    expect(s.players.A.maxMana).toBe(5); // turn 2: 4 + 1
  });

  it("summon buffs harden only the first side's units", () => {
    let s = createGame(3, deck(), deck(), "A", "You", "Foe", undefined, {
      summonBuffAtk: 2,
      summonBuffHp: 1,
    });
    s = applyAction(s, { type: "MULLIGAN", side: "A", uids: [] });
    s = applyAction(s, { type: "MULLIGAN", side: "B", uids: [] });
    s.players.A.hand = [{ uid: "h0", cardId: "paper_swan" }];
    s.players.A.mana = 10;
    s.players.A.maxMana = 10;
    s = applyAction(s, { type: "PLAY_CARD", side: "A", uid: "h0" });
    const swan = s.players.A.board.find((u) => u.cardId === "paper_swan");
    expect(swan?.attack).toBe(4); // 2 + 2
    expect(swan?.health).toBe(2); // 1 + 1
  });

  it("turnStartDraw and turnEndDamage ride the first side only", () => {
    let s = createGame(4, deck(20, "paper_swan"), deck(), "A", "You", "Foe", undefined, {
      turnStartDraw: 1,
      turnEndDamage: 2,
    });
    s = applyAction(s, { type: "MULLIGAN", side: "A", uids: [] });
    s = applyAction(s, { type: "MULLIGAN", side: "B", uids: [] });
    // turn 1: end of turn — the rival hero pays the toll
    const foeHpBefore = s.players.B.heroHp;
    const myHand = s.players.A.hand.length;
    s = applyAction(s, { type: "END_TURN", side: "A" });
    expect(s.players.B.heroHp).toBe(foeHpBefore - 2);
    expect(s.players.A.hand.length).toBe(myHand); // no draws on your own turn end
    // the rival's turn ends with no toll on me; then turn 2: normal draw + blessing draw
    const myHp = s.players.A.heroHp;
    s = applyAction(s, { type: "END_TURN", side: "B" });
    expect(s.players.A.heroHp).toBe(myHp);
    expect(s.players.A.hand.length).toBe(myHand + 2);
  });

  it("startHandBonus deepens only the first side's opening hand", () => {
    const s = createGame(5, deck(), deck(), "A", "You", "Foe", undefined, { startHandBonus: 2 });
    expect(s.players.A.hand.length).toBe(6); // 4 + 2
    expect(s.players.B.hand.length).toBe(4);
    expect(s.players.A.deck.length).toBe(14);
  });

  it("stays deterministic: same seed and bonus, identical state", () => {
    const a = createGame(42, deck(), deck(), "A", "You", "Foe", undefined, {
      heroHpBonus: 5,
      turnStartDraw: 1,
    });
    const b = createGame(42, deck(), deck(), "A", "You", "Foe", undefined, {
      heroHpBonus: 5,
      turnStartDraw: 1,
    });
    expect(JSON.stringify(b)).toBe(JSON.stringify(a));
  });
});

describe("descent — the run", () => {
  it("offers three distinct unowned blessings and takes one off the table", () => {
    const run = startRun(100);
    const offer = blessingOffer(run);
    expect(offer).toHaveLength(3);
    expect(new Set(offer).size).toBe(3);
    const after = takeBlessing(run, offer[0]!);
    expect(after.blessings).toContain(offer[0]!);
    // the taken blessing never re-offers
    expect(blessingOffer(after)).not.toContain(offer[0]!);
  });

  it("runs out of blessings gracefully — the wing runs dry", () => {
    let run = startRun(7);
    // take every blessing one offer at a time (the offer is 3 of the unowned)
    while (run.blessings.length < BLESSINGS.length) {
      const offer = blessingOffer(run);
      run = takeBlessing(run, offer[0]!);
    }
    expect(run.blessings).toHaveLength(BLESSINGS.length);
  });

  it("maps the seven floors to real bots with wing names and taints the last", () => {
    const botKeys = new Set(BOTS.map((b) => b.key));
    for (let n = 1; n <= DESCENT_FLOORS; n++) {
      const spec = descentFloorSpec(n);
      expect(botKeys.has(spec.policy), `floor ${n} policy ${spec.policy}`).toBe(true);
      const bot = descentFloorBot(n);
      expect(botKeys.has(bot.key)).toBe(true);
    }
    expect(descentFloorSpec(DESCENT_FLOORS).blotTainted).toBe(true);
    expect(descentFloorSpec(1).blotTainted).toBe(false);
  });

  it("aggregates blessings into a single firstBonus additively", () => {
    const bonus = blessingsToFirstBonus(["iron-fold", "guild-patron"]);
    expect(bonus.heroHpBonus).toBe(5);
    expect(bonus.summonBuffAtk).toBe(1);
    expect(bonus.extraStartingMana ?? 0).toBe(0);
  });
});
