/**
 * Campaign AI smoke (ROADMAP §3.1): every campaign stage simulated headlessly
 * with a basic aggro policy as the human proxy. Asserts:
 *  - all games conclude with zero illegal actions
 *  - stages 0–3 are winnable by the proxy (onboarding must be gentle)
 *  - difficulty roughly escalates (late stages harder than early ones)
 * Run: npx tsx scripts/campaign-smoke.ts
 */
import { applyAction, createGame } from "../src/game/engine";
import { CAMPAIGN_STAGES } from "../src/game/campaign";
import { decideAction, mulliganAction } from "../src/game/ai";
import { expandDeck } from "../src/game/decks";

const GAMES_PER_STAGE = 30;
const PROXY_POLICY = "duelist";

function toDeck(tuples: [string, number][]): string[] {
  return expandDeck(tuples.map(([cardId, count]) => ({ cardId, count })));
}

const PROXY_DECK = toDeck([
  ["paper_swan", 2], ["origami_crane", 2], ["inkwell_imp", 2], ["ink_blot", 2],
  ["graphite_golem", 2], ["fountain_pen_fencer", 2], ["paper_dragon", 1],
  ["red_pen", 2], ["paper_cut", 2], ["sharpened_pencil", 1], ["crumpled_note", 2],
]);

interface StageResult {
  index: number;
  name: string;
  wins: number;
  losses: number;
  illegal: number;
  avgTurns: number;
  controlWinRate?: number;
}

let failed = false;
const results: StageResult[] = [];

for (const stage of CAMPAIGN_STAGES) {
  const r: StageResult = { index: stage.index, name: stage.name, wins: 0, losses: 0, illegal: 0, avgTurns: 0 };
  const enemyDeck = toDeck(stage.deck);

  for (let seed = 1; seed <= GAMES_PER_STAGE; seed++) {
    let s = createGame(seed, PROXY_DECK, enemyDeck, "A", "Proxy", stage.name);
    let steps = 0;
    while (s.phase !== "GAME_OVER" && steps < 900) {
      steps++;
      if (s.phase === "MULLIGAN") {
        const side = s.mulliganDone.A ? "B" : "A";
        s = applyAction(s, mulliganAction(s, side, side === "A" ? PROXY_POLICY : stage.policy));
        continue;
      }
      const before = s;
      const policy = s.current === "A" ? PROXY_POLICY : stage.policy;
      const action = decideAction(s, s.current, policy);
      if (!action) break;
      s = applyAction(s, action);
      if (s === before) r.illegal++;
    }
    r.avgTurns += s.turn / GAMES_PER_STAGE;
    if (s.winner === "A") r.wins++;
    else if (s.winner === "B") r.losses++;
    else r.losses += 0.5; // count draws as half-losses for difficulty scoring
  }

  results.push(r);
  const winRate = Math.round((r.wins / GAMES_PER_STAGE) * 100);
  console.log(
    `Stage ${String(stage.index + 1).padStart(2)} ${stage.name.padEnd(26)} proxy win rate ${String(winRate).padStart(3)}%` +
      ` | avg turns ${r.avgTurns.toFixed(1)} | illegal ${r.illegal}`,
  );
  if (r.illegal > 0) {
    console.error(`  FAIL: ${r.illegal} illegal actions in stage ${stage.index + 1}`);
    failed = true;
  }
}

// onboarding gentleness: stages 0–3 must be winnable by a basic policy
for (const r of results.slice(0, 4)) {
  if (r.wins === 0) {
    console.error(`  FAIL: stage ${r.index + 1} (${r.name}) is unwinnable by the basic policy — too hard for onboarding`);
    failed = true;
  }
}

// wall/control stages can hard-counter the aggro proxy — for those, re-run
// with a control proxy (the Collector's policy) and report the better result;
// every stage must be winnable by at least ONE proxy archetype
const CONTROL_POLICY = "collector";
const CONTROL_DECK = toDeck([
  ["apprentice_scribe", 2], ["quill_sergeant", 2], ["stamp_collector", 2],
  ["sketch_sentinel", 2], ["clipboard_clerk", 2], ["carbon_copy", 2],
  ["the_calligrapher", 1], ["blank_page", 2], ["fresh_page", 2],
  ["the_final_draft", 1], ["pressure_stamp", 1], ["the_second_printing", 1],
]);

for (const r of results) {
  if (r.wins / GAMES_PER_STAGE >= 0.1) continue;
  const stage = CAMPAIGN_STAGES[r.index];
  const enemyDeck = toDeck(stage.deck);
  let wins = 0;
  let illegal = 0;
  for (let seed = 1; seed <= GAMES_PER_STAGE; seed++) {
    let s = createGame(seed + 5000, CONTROL_DECK, enemyDeck, "A", "ProxyCtrl", stage.name);
    let steps = 0;
    while (s.phase !== "GAME_OVER" && steps < 900) {
      steps++;
      if (s.phase === "MULLIGAN") {
        const side = s.mulliganDone.A ? "B" : "A";
        s = applyAction(s, mulliganAction(s, side, side === "A" ? CONTROL_POLICY : stage.policy));
        continue;
      }
      const before = s;
      const policy = s.current === "A" ? CONTROL_POLICY : stage.policy;
      const action = decideAction(s, s.current, policy);
      if (!action) break;
      s = applyAction(s, action);
      if (s === before) illegal++;
    }
    if (s.winner === "A") wins++;
    if (illegal > r.illegal) r.illegal = illegal;
  }
  r.controlWinRate = Math.round((wins / GAMES_PER_STAGE) * 100);
  console.log(
    `  ↳ stage ${r.index + 1} with control proxy: ${r.controlWinRate}% win rate`,
  );
}

// difficulty should roughly escalate: late-stage proxy win rate < early-stage
const early = results.slice(0, 4).reduce((n, r) => n + r.wins, 0) / (4 * GAMES_PER_STAGE);
const late = results.slice(8).reduce((n, r) => n + r.wins, 0) / (4 * GAMES_PER_STAGE);
console.log(`early-stage win rate ${Math.round(early * 100)}% vs late-stage ${Math.round(late * 100)}%`);
if (late >= early) {
  console.error("  FAIL: late stages are not harder than early stages — difficulty does not escalate");
  failed = true;
}

// every stage must be beatable by at least one proxy archetype
for (const r of results) {
  const best = Math.max(r.wins / GAMES_PER_STAGE, r.controlWinRate ?? 0);
  if (best < 0.1) {
    console.error(`  FAIL: stage ${r.index + 1} (${r.name}) is unwinnable by every proxy archetype`);
    failed = true;
  }
}

if (failed) process.exitCode = 1;
console.log("Campaign smoke complete.");
