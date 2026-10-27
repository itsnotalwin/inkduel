/**
 * Play a real engine game (duelist vs collector), record every action,
 * and POST it as a match with the full replay tape.
 * Run: node scripts/seed-replay.mjs
 */
import { applyAction, createGame, getLegalActions } from "../src/game/engine.ts";
import { botDeckIds, decideAction, mulliganAction } from "../src/game/ai.ts";
import { expandDeck } from "../src/game/decks.ts";
import { eloDelta } from "../src/lib/elo.ts";

const base = "http://localhost:3000";
const guest = await fetch(base + "/api/auth/guest", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name: "ReplayFox" }),
});
const cookie = guest.headers.get("set-cookie").split(";")[0];

const seed = 424242;
let s = createGame(seed, botDeckIds("duelist", seed), botDeckIds("collector", seed), "A", "ReplayFox", "The Collector");
const actions = [];
let steps = 0;
while (s.phase !== "GAME_OVER" && steps < 600) {
  steps++;
  if (s.phase === "MULLIGAN") {
    const side = s.mulliganDone.A ? "B" : "A";
    const a = mulliganAction(s, side, side === "A" ? "duelist" : "collector");
    actions.push(a);
    s = applyAction(s, a);
    continue;
  }
  const policy = s.current === "A" ? "duelist" : "collector";
  const a = decideAction(s, s.current, policy);
  if (!a) break;
  actions.push(a);
  s = applyAction(s, a);
}
console.log("game over:", s.winner, "turns:", s.sideTurns.A, "actions:", actions.length);

const result = s.winner === "A" ? "WIN" : s.winner === "B" ? "LOSS" : "DRAW";
const deckUsed = botDeckIds("duelist", seed).reduce((acc, id) => {
  const e = acc.find((x) => x.cardId === id);
  if (e) e.count += 1;
  else acc.push({ cardId: id, count: 1 });
  return acc;
}, []);
const { newMmr } = eloDelta(1000, 1150, result);

const res = await fetch(base + "/api/matches", {
  method: "POST",
  headers: { "Content-Type": "application/json", Cookie: cookie },
  body: JSON.stringify({
    opponentKey: "collector",
    result,
    turns: s.sideTurns.A,
    playerHpLeft: Math.max(0, s.players.A.heroHp),
    botHpLeft: Math.max(0, s.players.B.heroHp),
    seed,
    durationMs: 180000,
    deckUsed,
    actionLog: s.log.slice(0, 400),
    actions,
    maxTurnDamage: 9,
    maxTurnKills: 2,
    tookFatigue: false,
  }),
});
const body = await res.json();
console.log("posted:", res.status, JSON.stringify(body.data?.mmrAfter ?? body.error));
