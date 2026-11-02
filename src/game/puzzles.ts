/**
 * The Archivist's Tests — authored puzzle duels with server-verified rewards.
 *
 * Every entry is a frozen position (makePuzzle) plus the author's winning
 * tape. tests/puzzles.test.ts replays each solution through the engine and
 * FAILS THE BUILD if any tape does not end with winner "A" — the puzzles are
 * only shipped proven solvable. Board/hand uids follow makePuzzle's scheme:
 * hand `p0..pn`, board A `a0..an`, board B `b0..bn`.
 */
import type { Action, PuzzleSpec, Side, Target } from "./engine";

export interface Puzzle {
  id: string;
  title: string;
  /** The goal, in flavorful words. */
  brief: string;
  /** v1 ships exactly one goal type: reduce the Archivist to 0. */
  goal: "win";
  spec: PuzzleSpec;
  /** The author's winning tape — proven by tests/puzzles.test.ts. */
  solution: Action[];
  /** The solution's action count ("Par: N moves"). */
  par: number;
  rewardInk: number;
}

/** Ink for a first solve of any test. */
export const PUZZLE_REWARD_INK = 40;
/** Extra ink when the first solve of TODAY is the daily test. */
export const DAILY_BONUS_INK = 25;

// tape builders — kept tiny so the solutions read like notation
function play(side: Side, uid: string, target?: Target): Action {
  return target ? { type: "PLAY_CARD", side, uid, target } : { type: "PLAY_CARD", side, uid };
}
function strike(side: Side, attackerUid: string, target: Target): Action {
  return { type: "ATTACK", side, attackerUid, target };
}
function endTurn(side: Side): Action {
  return { type: "END_TURN", side };
}

export const PUZZLES: Puzzle[] = [
  {
    id: "marginal-note",
    title: "Marginal Note",
    brief:
      "The opening test is never cruel. Four health, no guards, one ready swan and a vial of red ink — end this before the ink dries.",
    goal: "win",
    spec: {
      seed: 20260101,
      heroHpA: 30,
      heroHpB: 4,
      manaA: 2,
      manaB: 0,
      boardA: [{ cardId: "paper_swan" }],
      boardB: [],
      handA: ["red_pen"],
    },
    solution: [
      play("A", "p0", { hero: "B" }), // Red Pen — 2 to the Archivist
      strike("A", "a0", { hero: "B" }), // Paper Swan — the last 2
    ],
    par: 2,
    rewardInk: PUZZLE_REWARD_INK,
  },
  {
    id: "the-gatekeeper",
    title: "The Gatekeeper",
    brief:
      "A colossus guards the Archivist's desk and no blade reaches past it. File a Verdict first — then let the fencers sing.",
    goal: "win",
    spec: {
      seed: 20260102,
      heroHpA: 30,
      heroHpB: 4,
      manaA: 4,
      manaB: 0,
      boardA: [{ cardId: "fountain_pen_fencer" }, { cardId: "origami_crane" }],
      boardB: [{ cardId: "papercraft_colossus" }],
      handA: ["editors_verdict"],
    },
    solution: [
      play("A", "p0", { uid: "b0" }), // Editor's Verdict — the Guard is unwritten
      strike("A", "a0", { hero: "B" }), // Fencer — 3
      strike("A", "a1", { hero: "B" }), // Crane — the last 2
    ],
    par: 3,
    rewardInk: PUZZLE_REWARD_INK,
  },
  {
    id: "compound-interest",
    title: "Compound Interest",
    brief:
      "One dragon, two investments. The Archivist owes you nine — sharpen, then freshen, then collect it all in a single swing.",
    goal: "win",
    spec: {
      seed: 20260103,
      heroHpA: 30,
      heroHpB: 9,
      manaA: 4,
      manaB: 0,
      boardA: [{ cardId: "paper_dragon" }],
      boardB: [{ cardId: "ink_blot" }],
      handA: ["sharpened_pencil", "fresh_ink"],
    },
    solution: [
      play("A", "p0", { uid: "a0" }), // Sharpened Pencil — the dragon is 7/6
      play("A", "p1", { uid: "a0" }), // Fresh Ink — the dragon is 9/8
      strike("A", "a0", { hero: "B" }), // one swing, paid in full
    ],
    par: 3,
    rewardInk: PUZZLE_REWARD_INK,
  },
  {
    id: "exact-change",
    title: "Exact Change",
    brief:
      "Eight health, eight pips of damage in your pocket. Mind the eraser on the table — touch it and the Archivist is refunded two.",
    goal: "win",
    spec: {
      seed: 20260104,
      heroHpA: 30,
      heroHpB: 8,
      manaA: 3,
      manaB: 0,
      boardA: [{ cardId: "inkwell_imp" }, { cardId: "paper_swan" }],
      boardB: [{ cardId: "eraser_golem" }],
      handA: ["red_pen", "ink_drop"],
    },
    solution: [
      play("A", "p0", { hero: "B" }), // Red Pen — 2 (leave the eraser alone)
      play("A", "p1", { hero: "B" }), // Ink Drop — 1
      strike("A", "a0", { hero: "B" }), // Imp — 3
      strike("A", "a1", { hero: "B" }), // Swan — the eighth pip
    ],
    par: 4,
    rewardInk: PUZZLE_REWARD_INK,
  },
  {
    id: "the-due-date",
    title: "The Due Date",
    brief:
      "Nine health is out of reach today. Strengthen your dragon, endure the Archivist's counterstroke, and call the debt due tomorrow.",
    goal: "win",
    spec: {
      seed: 20260105,
      heroHpA: 30,
      heroHpB: 9,
      manaA: 2,
      manaB: 0,
      boardA: [{ cardId: "paper_dragon" }],
      boardB: [{ cardId: "wax_seal_warden" }],
      handA: ["sharpened_pencil", "red_pen"],
    },
    solution: [
      play("A", "p0", { uid: "a0" }), // Sharpened Pencil — the dragon is 7/6
      endTurn("A"), // the Archivist takes a turn (and feels the fatigue)
      strike("B", "b0", { uid: "a0" }), // the Warden strikes the dragon, and comes apart on its scales
      endTurn("B"),
      play("A", "p1", { hero: "B" }), // Red Pen — 2
      strike("A", "a0", { hero: "B" }), // the dragon collects, with interest
    ],
    par: 6,
    rewardInk: PUZZLE_REWARD_INK,
  },
  {
    id: "return-to-sender",
    title: "Return to Sender",
    brief:
      "A stamped guard, a stamp of your own, and exactly eight damage folded into four cards. The shredder opens the envelope.",
    goal: "win",
    spec: {
      seed: 20260106,
      heroHpA: 30,
      heroHpB: 8,
      manaA: 8,
      manaB: 0,
      boardA: [{ cardId: "comic_relief" }],
      boardB: [{ cardId: "page_knight" }],
      handA: ["paper_shredder", "paper_airplane", "red_pen", "ink_drop"],
    },
    solution: [
      play("A", "p0", { uid: "b0" }), // Paper Shredder — the Guard is confetti
      play("A", "p1"), // Paper Airplane — always lands, 1 on arrival
      play("A", "p2", { hero: "B" }), // Red Pen — 2
      play("A", "p3", { hero: "B" }), // Ink Drop — 1
      strike("A", "a0", { hero: "B" }), // Comic Relief — the final 4
    ],
    par: 5,
    rewardInk: PUZZLE_REWARD_INK,
  },
];

// ── Daily rotation ──────────────────────────────────────────────────────

/** The daily test rotates from midnight UTC, 2026-01-01 (day 0). */
export const DAILY_EPOCH_MS = Date.UTC(2026, 0, 1);

/** Index into PUZZLES for the day containing `nowMs` (safe before the epoch). */
export function dailyIndex(nowMs: number): number {
  const n = PUZZLES.length;
  const day = Math.floor((nowMs - DAILY_EPOCH_MS) / 86_400_000);
  return ((day % n) + n) % n;
}

/** Today's featured test. */
export function dailyPuzzle(nowMs: number = Date.now()): Puzzle {
  return PUZZLES[dailyIndex(nowMs)];
}

/** Start of the UTC day containing `nowMs` — the daily-bonus window. */
export function dayStartMs(nowMs: number): number {
  return Math.floor(nowMs / 86_400_000) * 86_400_000;
}
