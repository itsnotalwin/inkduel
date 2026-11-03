import { applyAction, createGame } from "../src/game/engine";

const deck = (n = 20, cardId = "ink_blot"): string[] => Array.from({ length: n }, () => cardId);

let s = createGame(4, deck(20, "paper_swan"), deck(), "A", "You", "Foe", undefined, {
  turnStartDraw: 1,
  turnEndDamage: 2,
});
s = applyAction(s, { type: "MULLIGAN", side: "A", uids: [] });
s = applyAction(s, { type: "MULLIGAN", side: "B", uids: [] });
console.log("after mulligans: A hand", s.players.A.hand.length, "| phase", s.phase, "| current", s.current);
const myHand = s.players.A.hand.length;
const foeHpBefore = s.players.B.heroHp;
s = applyAction(s, { type: "END_TURN", side: "A" });
console.log("after END_TURN A: B hp", s.players.B.heroHp, "(before", foeHpBefore, ") | A hand", s.players.A.hand.length, "| current", s.current, "| phase", s.phase);
s = applyAction(s, { type: "END_TURN", side: "B" });
console.log("after END_TURN B: A hand", s.players.A.hand.length, "(myHand was", myHand, ") | current", s.current);
