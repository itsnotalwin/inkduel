/**
 * INKDUEL game engine — pure TypeScript, zero React/DOM imports.
 *
 * All transitions flow through applyAction(state, action) → new state.
 * Deterministic given the seed (mulberry32 stored inside the state).
 * The UI drains `state.events` for animations via drainEvents().
 */
import { getCard, type CardDef, type Effect, type Keyword } from "./cards";
import { BOARD_SLOTS, HERO_HP, MANA_CAP, START_HAND, STARTING_MANA } from "@/config";

// ── Core types ──────────────────────────────────────────────────────────

export type Side = "A" | "B";
export const OTHER: Record<Side, Side> = { A: "B", B: "A" };

export interface CardInstance {
  uid: string;
  cardId: string;
}

export interface UnitInstance {
  uid: string;
  cardId: string;
  attack: number;
  health: number;
  maxHealth: number;
  keywords: Keyword[];
  attacksLeft: number;
  /** Summoning sickness — played this turn, cannot attack (unless Swift). */
  sick: boolean;
}

export interface PlayerState {
  side: Side;
  name: string;
  heroHp: number;
  mana: number;
  maxMana: number;
  tempMana: number;
  deck: CardInstance[];
  hand: CardInstance[];
  board: UnitInstance[];
  /** Damage taken by the next draw from an empty deck. */
  fatigue: number;
}

export type Target = { uid: string } | { hero: Side };

export type Action =
  | { type: "MULLIGAN"; side: Side; uids: string[] }
  | { type: "PLAY_CARD"; side: Side; uid: string; target?: Target }
  | { type: "ATTACK"; side: Side; attackerUid: string; target?: Target }
  | { type: "END_TURN"; side: Side };

export type Phase = "MULLIGAN" | "TURN" | "GAME_OVER";

export type GameEvent =
  | { type: "GAME_START" }
  | { type: "MULLIGAN_REDRAW"; side: Side; count: number }
  | { type: "DRAW"; side: Side; cardId: string }
  | { type: "FATIGUE"; side: Side; n: number }
  | { type: "PLAY_CARD"; side: Side; cardId: string; uid: string }
  | { type: "SUMMON"; side: Side; cardId: string; uid: string }
  | { type: "SPELL"; side: Side; cardId: string }
  | { type: "EFFECT"; kind: Effect["kind"]; side: Side }
  | { type: "ATTACK"; side: Side; attackerUid: string; attackerCardId: string; target: Target }
  | { type: "DAMAGE"; side: Side; kind: "unit" | "hero"; uid?: string; n: number; hp: number }
  | { type: "HEAL"; side: Side; n: number; hp: number }
  | { type: "DEATH"; side: Side; uid: string; cardId: string }
  | { type: "TURN_START"; side: Side; turnNumber: number }
  | { type: "TURN_END"; side: Side }
  | { type: "GAME_OVER"; result: "A" | "B" | "draw" };

export interface LogLine {
  turn: number;
  side: Side | "sys";
  text: string;
}

export interface GameState {
  seed: number;
  rngState: number;
  /** Total individual turns taken (increments at every turn start). */
  turn: number;
  /** Turns taken by each side (the match log's T-counters). */
  sideTurns: Record<Side, number>;
  phase: Phase;
  current: Side;
  first: Side;
  players: Record<Side, PlayerState>;
  winner: Side | "draw" | null;
  events: GameEvent[];
  log: LogLine[];
  mulliganDone: Record<Side, boolean>;
  /** Total damage dealt by the player (side A) this turn — for achievements. */
  damageThisTurn: { side: Side; n: number; kills: number };
}

// ── RNG (mulberry32, deterministic) ─────────────────────────────────────

function rng(s: GameState): number {
  s.rngState = (s.rngState + 0x6d2b79f5) | 0;
  let t = s.rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function shuffle<T>(s: GameState, arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng(s) * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Deterministic per-game uid: derived only from the seeded RNG stream. */
function uid(s: GameState, prefix = "u"): string {
  return `${prefix}${Math.floor(rng(s) * 1e12).toString(36)}`;
}

// ── Setup ───────────────────────────────────────────────────────────────

function makePlayer(side: Side, name: string, deck: string[]): PlayerState {
  return {
    side,
    name,
    heroHp: HERO_HP,
    mana: 0,
    maxMana: 0,
    tempMana: 0,
    deck: deck.map((cardId, i) => ({ uid: `d${side}${i}`, cardId })),
    hand: [],
    board: [],
    fatigue: 0,
  };
}

export function createGame(seed: number, deckA: string[], deckB: string[], first: Side, nameA = "You", nameB = "Opponent"): GameState {
  const state: GameState = {
    seed,
    rngState: seed | 0,
    turn: 0,
    sideTurns: { A: 0, B: 0 },
    phase: "MULLIGAN",
    current: first,
    first,
    players: {
      A: makePlayer("A", nameA, [...deckA]),
      B: makePlayer("B", nameB, [...deckB]),
    },
    winner: null,
    events: [{ type: "GAME_START" }],
    log: [{ turn: 0, side: "sys", text: "The duel begins. Ink meets paper." }],
    mulliganDone: { A: false, B: false },
    damageThisTurn: { side: first, n: 0, kills: 0 },
  };
  for (const side of ["A", "B"] as Side[]) {
    shuffle(state, state.players[side].deck);
    for (let i = 0; i < START_HAND; i++) drawCard(state, side, false);
  }
  return state;
}

// ── Small helpers ───────────────────────────────────────────────────────

function player(s: GameState, side: Side): PlayerState {
  return s.players[side];
}
function foe(s: GameState, side: Side): PlayerState {
  return s.players[OTHER[side]];
}

function drawCard(s: GameState, side: Side, emit = true): void {
  const p = player(s, side);
  const top = p.deck.pop();
  if (!top) {
    p.fatigue += 1;
    p.heroHp -= p.fatigue;
    s.events.push({ type: "FATIGUE", side, n: p.fatigue });
    s.log.push({ turn: s.sideTurns[side], side, text: `Fatigue! ${p.name} takes ${p.fatigue} damage.` });
    return;
  }
  if (p.hand.length >= 10) {
    s.log.push({ turn: s.sideTurns[side], side, text: `${p.name}'s hand is full — the card is lost to the void.` });
    return;
  }
  p.hand.push(top);
  if (emit) s.events.push({ type: "DRAW", side, cardId: top.cardId });
}

function dealToUnit(s: GameState, u: UnitInstance, side: Side, n: number): void {
  u.health -= n;
  s.events.push({ type: "DAMAGE", side, kind: "unit", uid: u.uid, n, hp: u.health });
}

function dealToHero(s: GameState, side: Side, n: number): void {
  const p = player(s, side);
  p.heroHp -= n;
  s.events.push({ type: "DAMAGE", side, kind: "hero", n, hp: p.heroHp });
}

/** Attribute damage to the acting side (feeds the "Red Ink"/"Clean Margins" achievements). */
function creditDamage(s: GameState, side: Side, n: number): void {
  if (s.damageThisTurn.side === side) s.damageThisTurn.n += n;
}

/** Reap every unit at ≤0 HP (echoes may cascade). */
function processDeaths(s: GameState): void {
  for (let guard = 0; guard < 20; guard++) {
    const dead: { side: Side; u: UnitInstance }[] = [];
    for (const side of ["A", "B"] as Side[]) {
      const p = player(s, side);
      for (const u of p.board) if (u.health <= 0) dead.push({ side, u });
      p.board = p.board.filter((u) => u.health > 0);
    }
    if (dead.length === 0) return;
    for (const { side, u } of dead) {
      s.events.push({ type: "DEATH", side, uid: u.uid, cardId: u.cardId });
      s.log.push({ turn: s.sideTurns[side], side, text: `${getCard(u.cardId).name} is torn up.` });
      if (s.damageThisTurn.side === "A" && side === "B") s.damageThisTurn.kills += 1;
      const def = getCard(u.cardId);
      if (def.echo) {
        s.log.push({ turn: s.sideTurns[side], side, text: `Echo — ${def.name} leaves a final mark.` });
        runEffects(s, side, def.echo, undefined, 0);
      }
    }
  }
}

function checkGameOver(s: GameState): void {
  if (s.phase === "GAME_OVER") return;
  const a = player(s, "A").heroHp <= 0;
  const b = player(s, "B").heroHp <= 0;
  if (a || b) {
    s.winner = a && b ? "draw" : a ? "B" : "A";
    s.phase = "GAME_OVER";
    s.events.push({ type: "GAME_OVER", result: s.winner });
    s.log.push({
      turn: s.sideTurns[s.current],
      side: "sys",
      text: s.winner === "draw" ? "Both heroes fall. It is a DRAW." : `${player(s, s.winner).name} wins the duel.`,
    });
  }
}

// ── Effect execution ────────────────────────────────────────────────────

function findUnit(s: GameState, uid: string): { side: Side; u: UnitInstance } | null {
  for (const side of ["A", "B"] as Side[]) {
    const u = player(s, side).board.find((x) => x.uid === uid);
    if (u) return { side, u };
  }
  return null;
}

function summonToken(s: GameState, side: Side, cardId: string): void {
  const p = player(s, side);
  if (p.board.length >= BOARD_SLOTS) return;
  const def = getCard(cardId);
  const u: UnitInstance = {
    uid: uid(s, "t"),
    cardId,
    attack: def.attack ?? 0,
    health: def.health ?? 1,
    maxHealth: def.health ?? 1,
    keywords: [...(def.keywords ?? [])],
    attacksLeft: def.keywords?.includes("swift") ? 1 : 0,
    sick: !def.keywords?.includes("swift"),
  };
  p.board.push(u);
  s.events.push({ type: "SUMMON", side, cardId, uid: u.uid });
  s.log.push({ turn: s.sideTurns[side], side, text: `${def.name} is summoned for ${p.name}.` });
}

/** Execute an ordered effect list. `destroyedCount` feeds SUMMON "perDestroyed". */
function runEffects(s: GameState, side: Side, effects: Effect[], target: Target | undefined, destroyedCount: number): void {
  const targetUid = target && "uid" in target ? target.uid : undefined;
  const heroTarget: Side | undefined = target && "hero" in target ? target.hero : undefined;
  for (const e of effects) {
    switch (e.kind) {
      case "DEAL_DAMAGE": {
        s.events.push({ type: "EFFECT", kind: "DEAL_DAMAGE", side });
        switch (e.target) {
          case "unit":
          case "enemyUnits": {
            if (targetUid) {
              const found = findUnit(s, targetUid);
              if (found) {
                dealToUnit(s, found.u, found.side, e.n);
                creditDamage(s, side, e.n);
              }
            }
            break;
          }
          case "any": {
            // "any" reaches units AND heroes — a hero target resolves here
            if (targetUid) {
              const found = findUnit(s, targetUid);
              if (found) {
                dealToUnit(s, found.u, found.side, e.n);
                creditDamage(s, side, e.n);
              }
            } else if (heroTarget) {
              dealToHero(s, heroTarget, e.n);
              creditDamage(s, side, e.n);
            }
            break;
          }
          case "allEnemyUnits": {
            for (const u of [...foe(s, side).board]) {
              dealToUnit(s, u, OTHER[side], e.n);
              creditDamage(s, side, e.n);
            }
            break;
          }
          case "enemyHero":
            dealToHero(s, OTHER[side], e.n);
            creditDamage(s, side, e.n);
            break;
          case "ownHero":
            dealToHero(s, side, e.n);
            break;
        }
        break;
      }
      case "DRAW": {
        s.events.push({ type: "EFFECT", kind: "DRAW", side });
        for (let i = 0; i < e.n; i++) drawCard(s, side);
        s.log.push({ turn: s.sideTurns[side], side, text: `${player(s, side).name} draws ${e.n} card${e.n === 1 ? "" : "s"}.` });
        break;
      }
      case "DRAW_UNTIL": {
        s.events.push({ type: "EFFECT", kind: "DRAW_UNTIL", side });
        let guard = 0;
        while (player(s, side).hand.length < e.handSize && guard++ < 15) drawCard(s, side);
        break;
      }
      case "BUFF": {
        s.events.push({ type: "EFFECT", kind: "BUFF", side });
        const buffUnit = (u: UnitInstance) => {
          u.attack += e.atk ?? 0;
          if (e.hp) {
            u.health += e.hp;
            u.maxHealth += e.hp;
          }
          if (e.grantKeyword && !u.keywords.includes(e.grantKeyword)) u.keywords.push(e.grantKeyword);
        };
        if (e.target === "chosenFriendly") {
          if (targetUid) {
            const found = findUnit(s, targetUid);
            if (found && found.side === side) buffUnit(found.u);
          }
        } else if (e.target === "adjacentFriendly") {
          const me = targetUid ? findUnit(s, targetUid) : null;
          const board = player(s, side).board;
          const idx = me ? board.findIndex((x) => x.uid === me.u.uid) : board.length - 1;
          if (board[idx - 1]) buffUnit(board[idx - 1]);
          if (board[idx + 1]) buffUnit(board[idx + 1]);
        } else if (e.target === "allFriendly") {
          for (const u of player(s, side).board) buffUnit(u);
        }
        break;
      }
      case "DESTROY": {
        s.events.push({ type: "EFFECT", kind: "DESTROY", side });
        if (e.target === "allOtherUnits") {
          // handled via destroyedCount context by the caller (palimpsest)
          break;
        }
        if (targetUid) {
          const found = findUnit(s, targetUid);
          if (found) {
            found.u.health = -999;
          }
        }
        break;
      }
      case "RETURN_TO_HAND": {
        s.events.push({ type: "EFFECT", kind: "RETURN_TO_HAND", side });
        if (targetUid) {
          const p = player(s, side);
          const u = p.board.find((x) => x.uid === targetUid);
          if (u) {
            p.board = p.board.filter((x) => x.uid !== targetUid);
            p.hand.push({ uid: u.uid, cardId: u.cardId });
            s.log.push({ turn: s.sideTurns[side], side, text: `${getCard(u.cardId).name} returns to the hand.` });
          }
        }
        break;
      }
      case "HEAL_HERO": {
        s.events.push({ type: "EFFECT", kind: "HEAL_HERO", side });
        const p = player(s, side);
        p.heroHp = Math.min(HERO_HP, p.heroHp + e.n);
        s.events.push({ type: "HEAL", side, n: e.n, hp: p.heroHp });
        break;
      }
      case "SUMMON": {
        s.events.push({ type: "EFFECT", kind: "SUMMON", side });
        const count = e.count === "perDestroyed" ? destroyedCount : e.count;
        for (let i = 0; i < count; i++) summonToken(s, side, e.token);
        break;
      }
      case "GAIN_MANA": {
        s.events.push({ type: "EFFECT", kind: "GAIN_MANA", side });
        const p = player(s, side);
        p.tempMana += e.n;
        p.mana = Math.min(MANA_CAP, p.mana + e.n);
        break;
      }
    }
  }
  processDeaths(s);
  checkGameOver(s);
}

/** Count how many units a "destroy all other units" effect will destroy. */
function countOtherUnits(s: GameState, exceptUid?: string): number {
  let n = 0;
  for (const side of ["A", "B"] as Side[]) {
    for (const u of player(s, side).board) if (u.uid !== exceptUid) n++;
  }
  return n;
}

// ── Turn flow ───────────────────────────────────────────────────────────

function startTurn(s: GameState, side: Side): void {
  s.turn += 1;
  s.sideTurns[side] += 1;
  s.current = side;
  s.damageThisTurn = { side, n: 0, kills: 0 };
  const p = player(s, side);
  p.tempMana = 0;
  // Per-side mana clock — "turn 1 = 3 crystals, +1 per turn, cap 10" counts each
  // player's own turns, keeping games fully fair (§6); the Tempo Token is the
  // second player's only edge.
  p.maxMana = Math.min(MANA_CAP, STARTING_MANA + (s.sideTurns[side] - 1));  p.mana = Math.min(MANA_CAP, p.maxMana + p.tempMana);
  for (const u of p.board) {
    u.sick = false;
    u.attacksLeft = u.keywords.includes("twinstrike") ? 2 : 1;
  }
  s.events.push({ type: "TURN_START", side, turnNumber: s.sideTurns[side] });
  s.log.push({ turn: s.sideTurns[side], side, text: `T${s.sideTurns[side]} — ${p.name === "You" ? "your" : `${p.name}'s`} turn. Mana: ${p.maxMana}.` });
  drawCard(s, side);
  checkGameOver(s);
}

function endTurn(s: GameState, side: Side): void {
  if (s.phase !== "TURN" || s.current !== side) return;
  const p = player(s, side);
  p.tempMana = 0;
  p.mana = Math.min(p.mana, p.maxMana);
  s.events.push({ type: "TURN_END", side });
  startTurn(s, OTHER[side]);
}

// ── Mulligan ────────────────────────────────────────────────────────────

function applyMulligan(s: GameState, side: Side, uids: string[]): void {
  const p = player(s, side);
  const set = new Set(uids);
  const kept = p.hand.filter((c) => !set.has(c.uid));
  const back = p.hand.filter((c) => set.has(c.uid));
  p.hand = kept;
  p.deck.push(...back);
  shuffle(s, p.deck);
  for (let i = 0; i < back.length; i++) drawCard(s, side, false);
  s.mulliganDone[side] = true;
  s.events.push({ type: "MULLIGAN_REDRAW", side, count: back.length });
  s.log.push({ turn: 0, side, text: `${p.name} mulligans ${back.length} card${back.length === 1 ? "" : "s"}.` });

  if (s.mulliganDone.A && s.mulliganDone.B) {
    const second = OTHER[s.first];
    // Tempo Token to the second player
    const token = { uid: uid(s, "tt"), cardId: "tempo_token" };
    player(s, second).hand.push(token);
    s.log.push({ turn: 0, side: "sys", text: `${player(s, second).name} receives the Tempo Token (played second).` });
    s.phase = "TURN";
    startTurn(s, s.first);
  }
}

// ── Playing cards ───────────────────────────────────────────────────────

export function cardCost(cardId: string): number {
  return getCard(cardId).cost;
}

function boardFull(s: GameState, side: Side): boolean {
  return player(s, side).board.length >= BOARD_SLOTS;
}

function playCard(s: GameState, side: Side, handUid: string, target: Target | undefined): void {
  const p = player(s, side);
  const idx = p.hand.findIndex((c) => c.uid === handUid);
  if (idx < 0) return;
  const inst = p.hand[idx];
  const def = getCard(inst.cardId);
  if (def.cost > p.mana) return;
  const targetUid = target && "uid" in target ? target.uid : undefined;

  if (def.type === "unit") {
    if (boardFull(s, side)) return;
    p.hand.splice(idx, 1);
    const u: UnitInstance = {
      uid: inst.uid,
      cardId: inst.cardId,
      attack: def.attack ?? 0,
      health: def.health ?? 1,
      maxHealth: def.health ?? 1,
      keywords: [...(def.keywords ?? [])],
      attacksLeft: def.keywords?.includes("swift") ? 1 : 0,
      sick: !def.keywords?.includes("swift"),
    };
    p.board.push(u);
    s.events.push({ type: "PLAY_CARD", side, cardId: def.id, uid: u.uid });
    s.log.push({ turn: s.sideTurns[side], side, text: `${p.name} plays ${def.name}.` });
    p.mana -= def.cost;
    // Insight keyword: draw 1 when played
    if (def.keywords?.includes("insight")) {
      drawCard(s, side);
      s.log.push({ turn: s.sideTurns[side], side, text: `Insight — ${p.name} draws a card.` });
    }
    if (def.onPlay) {
      const wipe = def.onPlay.find((e) => e.kind === "DESTROY" && e.target === "allOtherUnits");
      if (wipe) {
        // "The Grand Palimpsest": destroy all other units first, then summon per destroyed.
        const destroyedCount = countOtherUnits(s, u.uid);
        for (const other of ["A", "B"] as Side[]) {
          for (const x of player(s, other).board) {
            if (x.uid === u.uid) continue;
            x.health = -999;
          }
        }
        processDeaths(s);
        const rest = def.onPlay.filter((e) => e !== wipe);
        runEffects(s, side, rest, undefined, destroyedCount);
      } else {
        runEffects(s, side, def.onPlay, target, 0);
      }
    }
  } else {
    // spell
    p.hand.splice(idx, 1);
    p.mana -= def.cost;
    s.events.push({ type: "SPELL", side, cardId: def.id });
    s.log.push({ turn: s.sideTurns[side], side, text: `${p.name} casts ${def.name}.` });
    if (def.onPlay) {
      runEffects(s, side, def.onPlay, target, 0);
    }
  }
  processDeaths(s);
  checkGameOver(s);
}

// ── Combat ──────────────────────────────────────────────────────────────

function enemyHasGuard(s: GameState, side: Side): boolean {
  return foe(s, side).board.some((u) => u.keywords.includes("guard"));
}

function attack(s: GameState, side: Side, attackerUid: string, target: Target | undefined): void {
  const p = player(s, side);
  const a = p.board.find((u) => u.uid === attackerUid);
  if (!a || a.attacksLeft <= 0 || a.sick) return;
  if (!target) return;
  if (s.phase !== "TURN" || s.current !== side) return;

  if ("hero" in target) {
    if (target.hero !== OTHER[side]) return;
    if (enemyHasGuard(s, side)) return;
    s.events.push({ type: "ATTACK", side, attackerUid, attackerCardId: a.cardId, target });
    s.log.push({ turn: s.sideTurns[side], side, text: `${getCard(a.cardId).name} strikes the enemy hero for ${a.attack}.` });
    dealToHero(s, OTHER[side], a.attack);
    creditDamage(s, side, a.attack);
  } else {
    const found = findUnit(s, target.uid);
    if (!found || found.side === side) return;
    if (enemyHasGuard(s, side) && !found.u.keywords.includes("guard")) return;
    s.events.push({ type: "ATTACK", side, attackerUid, attackerCardId: a.cardId, target });
    s.log.push({
      turn: s.sideTurns[side],
      side,
      text: `${getCard(a.cardId).name} (${a.attack}/${a.health}) attacks ${getCard(found.u.cardId).name} (${found.u.attack}/${found.u.health}).`,
    });
    dealToUnit(s, found.u, found.side, a.attack);
    if (found.u.attack > 0) dealToUnit(s, a, side, found.u.attack);
    creditDamage(s, side, a.attack);
  }
  a.attacksLeft -= 1;
  processDeaths(s);
  checkGameOver(s);
}

// ── Public API ──────────────────────────────────────────────────────────

export function applyAction(state: GameState, action: Action): GameState {
  const s: GameState = structuredClone(state);
  s.events = [];
  switch (action.type) {
    case "MULLIGAN":
      if (s.phase === "MULLIGAN" && !s.mulliganDone[action.side]) applyMulligan(s, action.side, action.uids);
      break;
    case "PLAY_CARD":
      if (s.phase === "TURN" && s.current === action.side) playCard(s, action.side, action.uid, action.target);
      break;
    case "ATTACK":
      if (s.phase === "TURN" && s.current === action.side) attack(s, action.side, action.attackerUid, action.target);
      break;
    case "END_TURN":
      if (s.phase === "TURN" && s.current === action.side) endTurn(s, action.side);
      break;
  }
  return s;
}

/** Remove and return the queued events (the UI drains these for animation). */
export function drainEvents(state: GameState): GameEvent[] {
  const out = state.events;
  state.events = [];
  return out;
}

export interface LegalPlay {
  uid: string;
  cardId: string;
  targets: Target[];
}

export interface LegalAttack {
  attackerUid: string;
  targets: Target[];
}

export interface LegalActions {
  mulligan: boolean;
  plays: LegalPlay[];
  attacks: LegalAttack[];
  endTurn: boolean;
}

function legalTargetsForCard(s: GameState, side: Side, def: CardDef): { targets: Target[]; required: boolean } {
  const effects = def.onPlay ?? [];
  const needs = effects.some(
    (e) =>
      (e.kind === "DEAL_DAMAGE" && (e.target === "unit" || e.target === "any" || e.target === "enemyUnits")) ||
      (e.kind === "DESTROY" && (e.target === "unit" || e.target === "any")) ||
      (e.kind === "BUFF" && e.target === "chosenFriendly") ||
      e.kind === "RETURN_TO_HAND",
  );
  if (!needs) return { targets: [], required: false };
  const friendlyOnly = effects.every(
    (e) => (e.kind === "BUFF" && e.target === "chosenFriendly") || e.kind === "RETURN_TO_HAND",
  );
  const targets: Target[] = [];
  const own = player(s, side).board;
  const enemy = foe(s, side).board;
  if (friendlyOnly) {
    for (const u of own) targets.push({ uid: u.uid });
    return { targets, required: true };
  }
  // "unit" / "any" / "enemyUnits" — unit and (for "any") hero targets
  const anyHero = effects.some((e) => e.kind === "DEAL_DAMAGE" && e.target === "any");
  for (const u of own) targets.push({ uid: u.uid });
  for (const u of enemy) targets.push({ uid: u.uid });
  if (anyHero) {
    targets.push({ hero: OTHER[side] });
    targets.push({ hero: side });
  }
  return { targets, required: true };
}

export function getLegalActions(s: GameState): LegalActions {
  const out: LegalActions = { mulligan: false, plays: [], attacks: [], endTurn: false };
  if (s.phase === "MULLIGAN") {
    out.mulligan = !s.mulliganDone[s.current];
    return out;
  }
  if (s.phase !== "TURN") return out;
  const side = s.current;
  const p = player(s, side);
  for (const inst of p.hand) {
    const def = getCard(inst.cardId);
    if (def.cost > p.mana) continue;
    if (def.type === "unit" && boardFull(s, side)) continue;
    const { targets, required } = legalTargetsForCard(s, side, def);
    // a card that requires a target but has none is unplayable
    if (required && targets.length === 0) continue;
    out.plays.push({ uid: inst.uid, cardId: inst.cardId, targets });
  }
  for (const u of p.board) {
    if (u.attacksLeft <= 0 || u.sick) continue;
    const targets: Target[] = [];
    const guardUp = enemyHasGuard(s, side);
    if (!guardUp) targets.push({ hero: OTHER[side] });
    for (const e of foe(s, side).board) {
      if (guardUp && !e.keywords.includes("guard")) continue;
      targets.push({ uid: e.uid });
    }
    out.attacks.push({ attackerUid: u.uid, targets });
  }
  out.endTurn = true;
  return out;
}

/** The number of the current side's turn (for the log / timer). */
export function sideTurnNumber(s: GameState, side: Side): number {
  return s.sideTurns[side];
}

