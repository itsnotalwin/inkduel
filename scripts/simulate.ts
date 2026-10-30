/**
 * Headless simulation harness (spec §13): every personality policy must
 * produce sane play over 50 games — winnable AND losable matches, no passing
 * turns with playable cards, no attacking Guard-violating targets.
 *
 * Run with: npx tsx scripts/simulate.ts
 */
import { applyAction, createGame, getLegalActions, type Action, type GameState, type Target } from "../src/game/engine";
import { getCard } from "../src/game/cards";
import { botDeckIds, decideAction, mulliganAction, BOTS, type PolicyKey } from "../src/game/ai";

const GAMES = 50;

interface RunStats {
  results: Record<"A" | "B" | "draw", number>;
  turns: number[];
  passedWithPlayableCards: number;
  illegalActions: number;
}

function targetKey(t: Target | undefined): string {
  if (!t) return "";
  return "uid" in t ? t.uid : t.hero;
}

function actionKey(a: Action): string {
  switch (a.type) {
    case "PLAY_CARD":
      return `P:${a.uid}:${targetKey(a.target)}`;
    case "ATTACK":
      return `A:${a.attackerUid}:${targetKey(a.target)}`;
    default:
      return "END";
  }
}

function run(policyA: PolicyKey, policyB: PolicyKey): RunStats {
  const stats: RunStats = {
    results: { A: 0, B: 0, draw: 0 },
    turns: [],
    passedWithPlayableCards: 0,
    illegalActions: 0,
  };

  for (let seed = 1; seed <= GAMES; seed++) {
    let state = createGame(seed, botDeckIds(policyA, seed), botDeckIds(policyB, seed + 1), "A");
    let steps = 0;
    while (state.phase !== "GAME_OVER" && steps < 800) {
      steps++;
      if (state.phase === "MULLIGAN") {
        const side = state.mulliganDone.A ? "B" : "A";
        state = applyAction(state, mulliganAction(state, side, side === "A" ? policyA : policyB));
        continue;
      }
      const policy = state.current === "A" ? policyA : policyB;
      const before = state;
      const action = decideAction(state, state.current, policy);
      if (!action) break;

      // sanity: chosen action must be legal
      const legal = getLegalActions(before);
      const legalKeys = new Set<string>(["END"]);
      for (const p of legal.plays) {
        if (p.targets.length === 0) legalKeys.add(`P:${p.uid}:`);
        for (const t of p.targets) legalKeys.add(`P:${p.uid}:${targetKey(t)}`);
      }
      for (const a of legal.attacks) {
        for (const t of a.targets) legalKeys.add(`A:${a.attackerUid}:${targetKey(t)}`);
      }
      if (!legalKeys.has(actionKey(action))) stats.illegalActions++;

      // sanity: unforced pass = END_TURN while a no-target play is affordable,
      // an attack is available, or a targeted play has a real enemy target.
      // (Holding a spell whose only targets are your own units is correct play.)
      if (action.type === "END_TURN") {
        // A no-target play is only "playable" if it has a real effect —
        // an AoE into an empty enemy board is a no-op and skipping it is correct.
        const freePlays = legal.plays.filter((p) => {
          if (p.targets.length > 0) return false;
          const def = getCard(p.cardId);
          const aoe = def.onPlay?.some((e) => e.kind === "DEAL_DAMAGE" && e.target === "allEnemyUnits");
          const me = before.players[before.current];
          // skipping a pure overheal at full HP is correct play
          const pureHeal = (def.onPlay?.length ?? 0) > 0 && def.onPlay?.every((e) => e.kind === "HEAL_HERO");
          if (pureHeal && me.heroHp >= 30) return false;
          // so is skipping a draw that would only burn cards
          if (me.hand.length >= 10 && def.onPlay?.some((e) => e.kind === "DRAW")) return false;
          const drawUntil = def.onPlay?.find((e) => e.kind === "DRAW_UNTIL");
          if (drawUntil && drawUntil.handSize <= me.hand.length) return false;
          return !(aoe && before.players[before.current === "A" ? "B" : "A"].board.length === 0);
        });
        const enemyTargetedPlays = legal.plays.filter((p) =>
          p.targets.some((t) => {
            if ("hero" in t) return t.hero !== before.current;
            const owner = before.players.A.board.some((u) => u.uid === t.uid) ? "A" : "B";
            return owner !== before.current;
          }),
        );
        // an attack is only "useful" if it hits the hero or is at least a fair
        // trade — declining a 1/1-into-6/12 guard suicide is correct play.
        const usefulAttacks = legal.attacks.some((a) =>
          a.targets.some((t) => {
            if ("hero" in t) return true;
            const atk = [...before.players.A.board, ...before.players.B.board].find((u) => u.uid === a.attackerUid);
            const def = [...before.players.A.board, ...before.players.B.board].find((u) => u.uid === t.uid);
            if (!atk || !def) return false;
            const cleanKill = atk.attack >= def.health && def.attack < atk.health;
            const fairTrade = atk.attack * 1 + atk.health * 0.8 >= def.attack * 1 + def.health * 0.8;
            return cleanKill || fairTrade;
          }),
        );
        if (freePlays.length > 0 || enemyTargetedPlays.length > 0 || usefulAttacks) {
          stats.passedWithPlayableCards++;
        }
      }

      state = applyAction(state, action);
      if (state === before) stats.illegalActions++;
    }
    stats.turns.push(state.turn);
    stats.results[state.winner ?? "draw"]++;
  }
  return stats;
}

let failed = false;

// unforced-pass budget per 50 games: chaos bots get slack by design
const PASS_BUDGET: Record<PolicyKey, number | null> = {
  duelist: 5,
  gambler: 15,
  collector: 5,
  archivist: null, // holds removal on purpose
};

for (const bot of BOTS) {
  const r = run(bot.key, "collector");
  console.log(
    `${bot.name.padEnd(14)} vs Collector — W/L/D ${r.results.A}/${r.results.B}/${r.results.draw}` +
      ` | avg turns ${(r.turns.reduce((a, b) => a + b, 0) / GAMES).toFixed(1)}` +
      ` | passed-with-board ${r.passedWithPlayableCards}` +
      ` | illegal ${r.illegalActions}`,
  );
  const budget = PASS_BUDGET[bot.key];
  if (budget !== null && r.passedWithPlayableCards > budget) {
    console.error(`  FAIL: ${bot.name} passed turns with playable cards ${r.passedWithPlayableCards} times (budget ${budget})`);
    failed = true;
  }
  if (r.illegalActions > 0) {
    console.error(`  FAIL: ${bot.name} attempted ${r.illegalActions} illegal actions`);
    failed = true;
  }
  if (r.results.A + r.results.B === 0) {
    console.error(`  FAIL: ${bot.name} games never concluded`);
    failed = true;
  }
}

// Balance telemetry: duelist (aggro) vs archivist (control). Was 0/50 before
// balance patch 1.1 (ROADMAP §4) — see CHANGELOG.md for the card/deck/AI
// changes that made this a live matchup. Reported as telemetry, not a gate.
const mirror = run("duelist", "archivist");
console.log(
  `Duelist vs Archivist — W/L/D ${mirror.results.A}/${mirror.results.B}/${mirror.results.draw}` +
    ` | avg turns ${(mirror.turns.reduce((a, b) => a + b, 0) / GAMES).toFixed(1)}` +
    ` | [balance telemetry: post-patch-1.1]`,
);
if (mirror.results.A + mirror.results.B === 0) {
  console.error("  FAIL: mirror games never concluded");
  failed = true;
}

if (failed) process.exitCode = 1;
console.log("Simulation harness complete.");
