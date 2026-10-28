/** What does the gambler pass on, with the second-wave cards in the pool? */
import { applyAction, createGame, getLegalActions } from "../src/game/engine";
import { getCard } from "../src/game/cards";
import { botDeckIds, decideAction } from "../src/game/ai";

const counts = new Map<string, number>();
let total = 0;
for (let seed = 1; seed <= 50; seed++) {
  let s = createGame(seed, botDeckIds("gambler", seed), botDeckIds("collector", seed + 1), "A");
  let step = 0;
  while (s.phase !== "GAME_OVER" && step < 800) {
    step++;
    if (s.phase === "MULLIGAN") {
      const side = s.mulliganDone.A ? "B" : "A";
      s = applyAction(s, { type: "MULLIGAN", side, uids: [] });
      continue;
    }
    const before = s;
    const legal = getLegalActions(before);
    const action = decideAction(s, s.current, s.current === "A" ? "gambler" : "collector");
    if (!action) break;
    if (action.type === "END_TURN") {
      const freePlays = legal.plays.filter((p) => p.targets.length === 0);
      const held = freePlays.map((p) => getCard(p.cardId).name);
      for (const h of held) counts.set(`${before.current}: ${h}`, (counts.get(`${before.current}: ${h}`) ?? 0) + 1);
      if (held.length > 0) total++;
    }
    s = applyAction(s, action);
  }
}
console.log("gambler free-play passes:", total);
for (const [name, n] of [...counts.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${name}: ${n}`);
}
