/**
 * AI opponents. Policies are greedy heuristic scorers over legal actions,
 * evaluated inside the pure engine (zero latency). One action per call —
 * the UI paces the loop (~700ms) so plays read clearly.
 */
import { applyAction, createGame, getLegalActions, type Action, type GameState, type Target } from "./engine";
import { ARCHETYPE_DECKS, getCard } from "./cards";
import { randomDeck, expandDeck, type DeckEntry } from "./decks";

export type PolicyKey = "duelist" | "gambler" | "collector" | "archivist";

export interface BotProfile {
  key: PolicyKey;
  name: string;
  elo: number;
  blurb: string;
}

export const BOTS: BotProfile[] = [
  { key: "duelist", name: "The Duelist", elo: 900, blurb: "Aggro. Trades only when it must; otherwise the face is the place." },
  { key: "gambler", name: "The Gambler", elo: 1050, blurb: "Chaos. A fresh random deck every duel and 35% of decisions made on a whim." },
  { key: "collector", name: "The Collector", elo: 1150, blurb: "Value. Floods the board, draws cards, always plays on curve." },
  { key: "archivist", name: "The Archivist", elo: 1400, blurb: "Control. Removes your biggest threat and wins with late legendaries." },
];

export const BOT_BY_KEY: Record<string, BotProfile> = Object.fromEntries(BOTS.map((b) => [b.key, b]));

/** Choose the opponent whose Elo is nearest the player's MMR ± window, with slight randomization. */
export function pickBot(playerMmr: number, window = 80, rand = Math.random): BotProfile {
  const candidates = BOTS.filter((b) => Math.abs(b.elo - playerMmr) <= window);
  if (candidates.length === 0) {
    return BOTS.reduce((best, b) => (Math.abs(b.elo - playerMmr) < Math.abs(best.elo - playerMmr) ? b : best));
  }
  // weight nearer bots higher
  const weights = candidates.map((b) => 1 / (1 + Math.abs(b.elo - playerMmr)));
  const total = weights.reduce((a, w) => a + w, 0);
  let roll = rand() * total;
  for (let i = 0; i < candidates.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return candidates[i];
  }
  return candidates[candidates.length - 1];
}

export function botDeck(policy: PolicyKey, seed: number): DeckEntry[] {
  if (policy === "gambler") return randomDeck(seed);
  return ARCHETYPE_DECKS[policy].cards.map(([cardId, count]) => ({ cardId, count } as DeckEntry));
}

export function botDeckIds(policy: PolicyKey, seed: number): string[] {
  return expandDeck(botDeck(policy, seed));
}

// ── Mulligan ────────────────────────────────────────────────────────────

let aiSalt = 0;

/** Deterministic AI randomness: derived from game state, not the wall clock. */
function aiRng(s: GameState): () => number {
  let a = (s.rngState ^ (s.turn * 0x9e3779b9) ^ ++aiSalt) | 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function mulliganAction(s: GameState, side: "A" | "B", policy: PolicyKey): Action {
  const hand = s.players[side].hand;
  const rand = aiRng(s);
  const keepCost = policy === "duelist" ? 3 : 4;
  const uids = hand
    .filter((c) => {
      const def = getCard(c.cardId);
      if (c.cardId === "tempo_token") return false;
      if (policy === "gambler") return rand() < 0.4;
      return def.cost > keepCost;
    })
    .map((c) => c.uid);
  return { type: "MULLIGAN", side, uids };
}

// ── Evaluation ──────────────────────────────────────────────────────────

interface Weights {
  face: number; // enemy hero damage
  unit: number; // own unit value
  enemyUnit: number; // enemy unit on their board (penalty)
  hand: number;
  boardCount: number;
  heroHp: number;
}

const WEIGHTS: Record<PolicyKey, Weights> = {
  duelist: { face: 4.0, unit: 0.7, enemyUnit: 1.0, hand: 0.5, boardCount: 0.4, heroHp: 0.8 },
  gambler: { face: 3.2, unit: 0.7, enemyUnit: 1.0, hand: 0.5, boardCount: 0.4, heroHp: 1.0 },
  collector: { face: 1.0, unit: 1.0, enemyUnit: 0.9, hand: 1.6, boardCount: 1.2, heroHp: 1.2 },
  archivist: { face: 1.6, unit: 1.1, enemyUnit: 1.4, hand: 0.9, boardCount: 0.5, heroHp: 1.3 },
};

function unitValue(attack: number, health: number, keywords: string[]): number {
  let v = attack * 1.0 + health * 0.8;
  if (keywords.includes("guard")) v += 0.6;
  if (keywords.includes("swift")) v += 0.5;
  if (keywords.includes("twinstrike")) v += 0.8;
  return v;
}

function evaluate(s: GameState, side: "A" | "B", policy: PolicyKey): number {
  const w = WEIGHTS[policy];
  const me = s.players[side];
  const foe = s.players[side === "A" ? "B" : "A"];
  let score = 0;
  score += (me.heroHp - foe.heroHp) * w.heroHp;
  score += (30 - foe.heroHp) * w.face * 0.25; // cumulative face damage preference
  for (const u of me.board) score += unitValue(u.attack, u.health, u.keywords) * w.unit;
  for (const u of foe.board) score -= unitValue(u.attack, u.health, u.keywords) * w.enemyUnit;
  score += me.board.length * w.boardCount;
  score += (me.hand.length - foe.hand.length) * w.hand;
  score += me.deck.length * 0.05;
  score += me.mana * 0.15; // unspent mana is potential — stops hoarding the Tempo Token
  return score;
}

// ── Action selection ────────────────────────────────────────────────────

/** Archivist holds removal until it removes something worth removing. */
function archivistApprovesPlay(s: GameState, side: "A" | "B", cardId: string, target: Target | undefined): boolean {
  const def = getCard(cardId);
  if (def.type !== "spell") return true;
  const dmg = def.onPlay?.find((e) => e.kind === "DEAL_DAMAGE");
  const destroy = def.onPlay?.find((e) => e.kind === "DESTROY");
  const foe = s.players[side === "A" ? "B" : "A"];
  const biggest = foe.board.reduce((m, u) => Math.max(m, u.attack), 0);
  if (destroy) {
    if (!target || !("uid" in target)) return false;
    const t = [...s.players.A.board, ...s.players.B.board].find((u) => u.uid === target.uid);
    return !!t && (t.attack >= 3 || t.health >= 4 || biggest >= 3);
  }
  if (dmg && dmg.n >= 2) {
    if (!target || !("uid" in target)) return true; // hero burn is fine late
    const t = [...s.players.A.board, ...s.players.B.board].find((u) => u.uid === target.uid);
    return !!t && t.health <= dmg.n + 1; // only efficient kills
  }
  return true;
}

export function decideAction(s: GameState, side: "A" | "B", policy: PolicyKey): Action | null {
  const legal = getLegalActions(s);
  const rand = aiRng(s);
  if (s.phase === "MULLIGAN") return mulliganAction(s, side, policy);
  if (s.phase !== "TURN" || s.current !== side) return null;

  if (policy === "gambler" && rand() < 0.35) {
    const plays = legal.plays;
    const attacks = legal.attacks.filter((a) => a.targets.length > 0);
    const options: Action[] = [];
    for (const p of plays) options.push({ type: "PLAY_CARD", side, uid: p.uid, target: p.targets[Math.floor(rand() * p.targets.length)] });
    for (const a of attacks) options.push({ type: "ATTACK", side, attackerUid: a.attackerUid, target: a.targets[Math.floor(rand() * a.targets.length)] });
    if (options.length > 0) return options[Math.floor(rand() * options.length)];
    return { type: "END_TURN", side };
  }

  let best: { action: Action; score: number } | null = null;
  const consider = (action: Action) => {
    const next = applyAction(s, action);
    if (next === s) return; // rejected (no change)
    let score = evaluate(next, side, policy);
    // tie-breaker noise keeps games from looping identically
    score += rand() * 0.15;
    if (!best || score > best.score) best = { action, score };
  };

  for (const play of legal.plays) {
    const def = getCard(play.cardId);
    if (play.targets.length === 0) {
      if (policy === "archivist" && !archivistApprovesPlay(s, side, play.cardId, undefined)) continue;
      consider({ type: "PLAY_CARD", side, uid: play.uid });
    } else {
      for (const target of play.targets) {
        if (policy === "archivist" && !archivistApprovesPlay(s, side, play.cardId, target)) continue;
        // Collector saves Insight refills; duelist plays cheapest first — handled by scoring
        if (policy === "collector" && def.type === "spell" && def.cost >= 3 && s.players[side].hand.length <= 2 && Math.random() < 0.3) continue;
        consider({ type: "PLAY_CARD", side, uid: play.uid, target });
      }
    }
  }
  for (const atk of legal.attacks) {
    for (const target of atk.targets) {
      consider({ type: "ATTACK", side, attackerUid: atk.attackerUid, target });
    }
  }
  consider({ type: "END_TURN", side });

  return best ? (best as { action: Action; score: number }).action : { type: "END_TURN", side };
}

/** Simulate a full game between two policies (headless QA / acceptance harness). */
export function simulateGame(seed: number, policyA: PolicyKey, policyB: PolicyKey, maxTurns = 200): "A" | "B" | "draw" {
  let s = createGame(seed, botDeckIds(policyA, seed), botDeckIds(policyB, seed + 1), "A");
  for (let i = 0; i < maxTurns; i++) {
    if (s.phase === "MULLIGAN") {
      const side = s.mulliganDone.A ? "B" : "A";
      s = applyAction(s, mulliganAction(s, side, side === "A" ? policyA : policyB));
      continue;
    }
    if (s.phase === "GAME_OVER") return s.winner ?? "draw";
    const policy = s.current === "A" ? policyA : policyB;
    const action = decideAction(s, s.current, policy);
    if (!action) break;
    s = applyAction(s, action);
  }
  return "draw";
}
