/**
 * Balance matrix (ROADMAP §4): every ordered pair of archetype policies,
 * headless, so deck/card changes can be judged on the full picture instead
 * of one lopsided matchup. 50 games per pair, fixed seeds.
 *
 * Run with: npx tsx scripts/balance-matrix.ts
 */
import { applyAction, createGame } from "../src/game/engine";
import { botDeckIds, mulliganAction, decideAction, BOTS, type PolicyKey } from "../src/game/ai";

const GAMES = 50;

function play(seed: number, a: PolicyKey, b: PolicyKey): { winner: "A" | "B" | "draw" | null; turn: number } {
  let s = createGame(seed, botDeckIds(a, seed), botDeckIds(b, seed + 1), "A");
  let steps = 0;
  while (s.phase !== "GAME_OVER" && steps < 900) {
    steps++;
    if (s.phase === "MULLIGAN") {
      const side = s.mulliganDone.A ? "B" : "A";
      s = applyAction(s, mulliganAction(s, side, side === "A" ? a : b));
      continue;
    }
    const action = decideAction(s, s.current, s.current === "A" ? a : b);
    if (!action) break;
    s = applyAction(s, action);
  }
  return { winner: s.winner, turn: s.turn };
}

const keys = BOTS.map((b) => b.key) as PolicyKey[];
const wins = new Map<string, number>();
const avgTurns = new Map<string, number>();

for (const a of keys) {
  for (const b of keys) {
    if (a === b) continue;
    let aWins = 0;
    let totalTurns = 0;
    for (let seed = 1; seed <= GAMES; seed++) {
      const r = play(seed, a, b);
      if (r.winner === "A") aWins++;
      totalTurns += r.turn;
    }
    wins.set(`${a}->${b}`, aWins);
    avgTurns.set(`${a}->${b}`, totalTurns / GAMES);
  }
}

console.log(`win % — rows beat columns (${GAMES} games/cell)`);
console.log("            " + keys.map((k) => k.padStart(10)).join(""));
for (const a of keys) {
  console.log(
    a.padEnd(12) +
      keys
        .map((b) => {
          if (a === b) return "       —  ";
          return `${Math.round(((wins.get(`${a}->${b}`) ?? 0) / GAMES) * 100).toString().padStart(9)}%`;
        })
        .join(""),
  );
}

console.log("\navg game length (turns)");
console.log("            " + keys.map((k) => k.padStart(10)).join(""));
for (const a of keys) {
  console.log(
    a.padEnd(12) +
      keys
        .map((b) => {
          if (a === b) return "       —  ";
          return (avgTurns.get(`${a}->${b}`) ?? 0).toFixed(1).padStart(11);
        })
        .join(""),
  );
}

// red flags: any archetype locked out of a matchup entirely
let lopsided = 0;
for (const [pair, w] of wins) {
  if (w === 0) {
    console.log(`  NOTE: ${pair.replace("->", " vs ")} is 0/${GAMES}`);
    lopsided++;
  }
}
if (lopsided === 0) console.log("  no 0/N cells");
