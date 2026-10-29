/** Trace duelist-vs-archivist games: who wins and why. */
import { applyAction, createGame } from "../src/game/engine";
import { botDeckIds, decideAction, mulliganAction } from "../src/game/ai";

const wins = { A: 0, B: 0, draw: 0 };
for (let seed = 1; seed <= 20; seed++) {
  let s = createGame(seed, botDeckIds("duelist", seed), botDeckIds("archivist", seed + 1), "A");
  let steps = 0;
  while (s.phase !== "GAME_OVER" && steps < 800) {
    steps++;
    if (s.phase === "MULLIGAN") {
      const side = s.mulliganDone.A ? "B" : "A";
      s = applyAction(s, mulliganAction(s, side, side === "A" ? "duelist" : "archivist"));
      continue;
    }
    const policy = s.current === "A" ? "duelist" : "archivist";
    const a = decideAction(s, s.current, policy);
    if (!a) break;
    s = applyAction(s, a);
  }
  wins[s.winner ?? "draw"]++;
  console.log(seed, s.winner, "hpA=" + s.players.A.heroHp, "hpB=" + s.players.B.heroHp, "turns=" + s.sideTurns.A, "deckA=" + s.players.A.deck.length, "deckB=" + s.players.B.deck.length);
}
console.log(JSON.stringify(wins));
