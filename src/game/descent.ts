/**
 * DESCENT INTO THE SEALED WING — the gameplan's phase 4: a solo roguelite run.
 *
 * Seven floors of escalating duels beneath the archive. Win a floor and the
 * wing offers a Blessing (pick 1 of 3) that rides every later duel of the run;
 * lose once and the wing keeps you. Clearing floor 7 — THE HEAD ARCHIVIST, on
 * a Blot-tainted table — breaks the seal.
 *
 * Everything here is pure and deterministic: a run is a plain serializable
 * object, and every offer and every floor's duel seed is a pure function of
 * the run's seed. The run persists under localStorage("inkduel:descent").
 * Floor duels themselves post to the real ranked flow (the floor bot's key).
 */
import { BOT_BY_KEY, type BotProfile, type PolicyKey } from "./ai";
import { mulberry32 } from "./decks";
import type { FirstBonus } from "./engine";

export const DESCENT_FLOORS = 7;

/** localStorage key the run persists under (JSON). */
export const DESCENT_SAVE_KEY = "inkduel:descent";
/** localStorage badge for clearing floor 7 (timestamp ms). */
export const WINGBREAKER_KEY = "inkduel:wingbreaker";
/** The local trophy claimed on clearing floor 7 — a note on the map, never server ink. */
export const WINGBREAKER_TROPHY_INK = 300;

// ── Blessings ───────────────────────────────────────────────────────────

/** One blessing drafted between floors; its bonus rides the FIRST side. */
export interface DescentBlessing {
  key: string;
  title: string;
  blurb: string;
  bonus: FirstBonus;
}

export const BLESSINGS: DescentBlessing[] = [
  { key: "iron-fold", title: "Iron Fold", blurb: "Your hero arrives folded double — +5 max HP.", bonus: { heroHpBonus: 5 } },
  { key: "the-wells-gift", title: "The Well's Gift", blurb: "+1 mana on every one of your turns.", bonus: { extraStartingMana: 1 } },
  { key: "guild-patron", title: "Guild Patron", blurb: "Units you play arrive with +1 attack.", bonus: { summonBuffAtk: 1 } },
  { key: "clinic-patron", title: "Clinic Patron", blurb: "Units you play arrive with +1 health.", bonus: { summonBuffHp: 1 } },
  { key: "scholars-habit", title: "Scholar's Habit", blurb: "Draw 1 extra card at the start of each of your turns.", bonus: { turnStartDraw: 1 } },
  { key: "crimson-toll", title: "Crimson Toll", blurb: "At the end of each of your turns, the rival hero takes 1 damage.", bonus: { turnEndDamage: 1 } },
  { key: "ink-reserve", title: "Ink Reserve", blurb: "Every floor begins with 2 extra cards in your opening hand.", bonus: { startHandBonus: 2 } },
];

export const BLESSINGS_BY_KEY: Record<string, DescentBlessing> = Object.fromEntries(BLESSINGS.map((b) => [b.key, b]));

/** Aggregate the run's blessings into the engine's firstBonus (effects stack additively). */
export function blessingsToFirstBonus(keys: readonly string[]): FirstBonus {
  const out: FirstBonus = {};
  for (const key of keys) {
    const b = BLESSINGS_BY_KEY[key];
    if (!b) continue;
    out.heroHpBonus = (out.heroHpBonus ?? 0) + (b.bonus.heroHpBonus ?? 0);
    out.extraStartingMana = (out.extraStartingMana ?? 0) + (b.bonus.extraStartingMana ?? 0);
    out.summonBuffAtk = (out.summonBuffAtk ?? 0) + (b.bonus.summonBuffAtk ?? 0);
    out.summonBuffHp = (out.summonBuffHp ?? 0) + (b.bonus.summonBuffHp ?? 0);
    out.turnStartDraw = (out.turnStartDraw ?? 0) + (b.bonus.turnStartDraw ?? 0);
    out.turnEndHeal = (out.turnEndHeal ?? 0) + (b.bonus.turnEndHeal ?? 0);
    out.turnEndDamage = (out.turnEndDamage ?? 0) + (b.bonus.turnEndDamage ?? 0);
    out.startHandBonus = (out.startHandBonus ?? 0) + (b.bonus.startHandBonus ?? 0);
  }
  return out;
}

// ── Floors ──────────────────────────────────────────────────────────────

/** One floor of the descent: a real bot drives the duel under a wing name. */
export interface DescentFloorSpec {
  floor: number; // 1-based
  /** The bot policy (and ranked key) that drives this floor's duel. */
  policy: PolicyKey;
  name: string;
  blurb: string;
  /** Floor 7 only: the wing is Blot-tainted — the weekly mutation rides the duel. */
  blotTainted: boolean;
}

const FLOOR_POLICIES: PolicyKey[] = ["duelist", "gambler", "collector", "archivist", "archivist", "collector", "archivist"];

const FLOOR_SPECS: DescentFloorSpec[] = FLOOR_POLICIES.map((policy, i) => {
  const bot = BOT_BY_KEY[policy];
  const names = [
    "The Door",
    "The Folded Stair",
    "The Collector's Vault",
    "The Quiet Stacks",
    "The Restricted Stacks",
    "The Vault of Marginalia",
    "THE SEALED WING",
  ];
  const blurbs = [
    "The door seals behind you. The Duelist is waiting on the landing.",
    "Every step folds underfoot. The Gambler deals from a fresh deck.",
    "Shelves of taken things. The Collector counts everything — including you.",
    "The Archivist reads in the dark. It has already read you.",
    "The restricted stacks. The Archivist keeps its sharpest margins here.",
    "Marginalia with demands. The Collector returns, holding a ledger.",
    "THE HEAD ARCHIVIST. The wing is Blot-tainted — this week's mutation rides the table.",
  ];
  return { floor: i + 1, policy, name: names[i], blurb: blurbs[i], blotTainted: i === DESCENT_FLOORS - 1 };
});

/** The spec for floor N (1-based). Throws below 1 or past the last floor. */
export function descentFloorSpec(floor: number): DescentFloorSpec {
  if (!Number.isInteger(floor) || floor < 1 || floor > DESCENT_FLOORS) {
    throw new Error(`No floor ${floor} in the sealed wing.`);
  }
  return FLOOR_SPECS[floor - 1];
}

/** The floor's opponent as a BotProfile: real key + real elo, wing name on top. */
export function descentFloorBot(floor: number): BotProfile {
  const spec = descentFloorSpec(floor);
  return { ...BOT_BY_KEY[spec.policy], name: spec.name };
}

// ── Run state ───────────────────────────────────────────────────────────

export interface DescentRun {
  /** The floor you are on (1-based). */
  floor: number;
  /** Blessing keys inked so far, in pick order. */
  blessings: string[];
  seed: number;
  /** One duel seed per floor, derived from the run seed at creation. */
  floorSeeds: number[];
  /** A single loss ends the run. */
  alive: boolean;
  /** True once the current floor was won and its blessing draft is pending. */
  wonLast: boolean;
  /** Floor 7 cleared — the seal is broken. */
  cleared: boolean;
}

const FLOOR_SEED_SALT = 0x1e57ed;
const OFFER_SALT = 0x9e3779b1;

/** Open a fresh descent: floor 1, no blessings, all seven duel seeds dealt. */
export function startRun(seed: number): DescentRun {
  const rand = mulberry32((seed ^ FLOOR_SEED_SALT) | 0);
  const floorSeeds = Array.from({ length: DESCENT_FLOORS }, () => Math.floor(rand() * 2 ** 31));
  return { floor: 1, blessings: [], seed, floorSeeds, alive: true, wonLast: false, cleared: false };
}

/** Floor N's duel seed — pure per (run seed, floor). */
export function floorSeed(run: DescentRun, floor: number): number {
  const i = Math.min(Math.max(Math.floor(floor), 1), DESCENT_FLOORS) - 1;
  return run.floorSeeds[i] ?? run.seed;
}

/** The three blessings on the table: distinct, unowned, deterministic per (seed, picks). */
export function blessingOffer(run: DescentRun): string[] {
  const owned = new Set(run.blessings);
  const pool = BLESSINGS.filter((b) => !owned.has(b.key)).map((b) => b.key);
  const rand = mulberry32((run.seed ^ Math.imul(run.blessings.length + 1, OFFER_SALT)) | 0);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 3);
}

/** Ink one offered blessing into the run. Throws when it is not on the table. */
export function takeBlessing(run: DescentRun, key: string): DescentRun {
  if (!run.alive || run.cleared) throw new Error("This descent is over — no blessings remain.");
  if (!blessingOffer(run).includes(key)) throw new Error(`"${key}" is not on the table.`);
  return { ...run, blessings: [...run.blessings, key] };
}

/** Win the current floor: floors 1-6 open the blessing draft; floor 7 breaks the seal. */
export function winFloor(run: DescentRun): DescentRun {
  if (run.floor >= DESCENT_FLOORS) return { ...run, wonLast: false, cleared: true };
  return { ...run, wonLast: true };
}

/** Step down to the next floor after the blessing draft. */
export function advanceFloor(run: DescentRun): DescentRun {
  if (!run.wonLast || run.floor >= DESCENT_FLOORS) return run;
  return { ...run, floor: run.floor + 1, wonLast: false };
}

/** A single loss ends the run. Draws leave the floor standing — fight it again. */
export function loseRun(run: DescentRun): DescentRun {
  return { ...run, alive: false, wonLast: false };
}

/** Floors actually cleared (won) by a run. */
export function floorsCleared(run: DescentRun): number {
  if (!run.alive) return run.floor - 1;
  return Math.min(run.floor - (run.wonLast ? 0 : 1) + (run.cleared ? 1 : 0), DESCENT_FLOORS);
}

// ── Persistence ─────────────────────────────────────────────────────────

/** Persist the run (best effort — a blocked localStorage keeps the run in memory only). */
export function saveRun(run: DescentRun): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DESCENT_SAVE_KEY, JSON.stringify(run));
  } catch {
    // storage full / blocked — the run plays on, a reload just forgets it
  }
}

/** The saved run, or null when absent or malformed. */
export function loadRun(): DescentRun | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DESCENT_SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DescentRun;
    const sane =
      typeof parsed.seed === "number" &&
      typeof parsed.floor === "number" &&
      Number.isInteger(parsed.floor) &&
      parsed.floor >= 1 &&
      parsed.floor <= DESCENT_FLOORS &&
      Array.isArray(parsed.blessings) &&
      parsed.blessings.every((k) => typeof k === "string" && k in BLESSINGS_BY_KEY) &&
      Array.isArray(parsed.floorSeeds) &&
      parsed.floorSeeds.length === DESCENT_FLOORS &&
      parsed.floorSeeds.every((n) => typeof n === "number") &&
      typeof parsed.alive === "boolean" &&
      typeof parsed.wonLast === "boolean" &&
      typeof parsed.cleared === "boolean";
    return sane ? parsed : null;
  } catch {
    return null;
  }
}

/** Forget the current run (a new one overwrites it anyway). */
export function clearRun(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(DESCENT_SAVE_KEY);
}

/** Claim the wingbreaker badge once; true the first time only. */
export function claimWingbreaker(): boolean {
  if (typeof window === "undefined") return false;
  if (window.localStorage.getItem(WINGBREAKER_KEY)) return false;
  try {
    window.localStorage.setItem(WINGBREAKER_KEY, String(Date.now()));
    return true;
  } catch {
    return false;
  }
}

/** Whether the wingbreaker badge is held on this device. */
export function hasWingbreaker(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(WINGBREAKER_KEY) !== null;
}
