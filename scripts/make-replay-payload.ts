/**
 * Play a real engine game (duelist vs collector), record every action, and
 * dump the full match payload as JSON for the browser-session seeding.
 * Run: npx tsx scripts/make-replay-payload.ts > scripts/replay-payload.json
 */
import { applyAction, createGame } from "../src/game/engine";
import { botDeckIds, decideAction, mulliganAction } from "../src/game/ai";
import { eloDelta } from "../src/lib/elo";

const seed = 777333;
let s = createGame(seed, botDeckIds("duelist", seed), botDeckIds("collector", seed), "A", "You", "The Collector");
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
const result = s.winner === "A" ? "WIN" : s.winner === "B" ? "LOSS" : "DRAW";
const deckUsed = botDeckIds("duelist", seed).reduce((acc: { cardId: string; count: number }[], id: string) => {
  const e = acc.find((x) => x.cardId === id);
  if (e) e.count += 1;
  else acc.push({ cardId: id, count: 1 });
  return acc;
}, []);
const { newMmr } = eloDelta(1000, 1150, result);
void newMmr;

console.log(
  JSON.stringify({
    opponentKey: "collector",
    result,
    turns: s.sideTurns.A,
    playerHpLeft: Math.max(0, s.players.A.heroHp),
    botHpLeft: Math.max(0, s.players.B.heroHp),
    seed,
    durationMs: 165000,
    deckUsed,
    actionLog: s.log.slice(0, 400),
    actions,
    maxTurnDamage: 9,
    maxTurnKills: 2,
    tookFatigue: false,
  }),
);
