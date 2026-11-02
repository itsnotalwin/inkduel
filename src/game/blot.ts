/**
 * THE BLOT SPREADS — the weekly world mutation (gameplan phase 3).
 *
 * The Great Blot from the prologue does not stay on the prologue page: it
 * spreads into ordinary duels. Every calendar week carries one table-wide
 * mutation, chosen by pure date arithmetic — no server state, so any two
 * clients (and a replay of the same week) compute the same mutation.
 */

/** One week-long table-wide rule change. Absent fields mean "no change". */
export interface TableMutation {
  key: string;
  /** Display name, stamped in caps: "THE BLOT HUNGERS". */
  name: string;
  /** One flavorful sentence (shown as the banner's title attribute). */
  blurb: string;
  /** Both heroes start at this many HP instead of 30. */
  heroHp?: number;
  /** Every turn's mana clock starts +N higher (still capped at MANA_CAP). */
  extraStartingMana?: number;
  /** Spells cost +N ink (units and areas are untaxed). */
  spellTax?: number;
}

/** The four mutations, in rotation order. Week N plays BLOT_MUTATIONS[N % 4]. */
export const BLOT_MUTATIONS: TableMutation[] = [
  { key: "the-blot-hungers", name: "THE BLOT HUNGERS", blurb: "It starts with your blood ink.", heroHp: 25 },
  { key: "smudged-signs", name: "SMUDGED SIGNS", blurb: "Every spell's lettering runs. Read it again: one more.", spellTax: 1 },
  { key: "the-well-runs-deep", name: "THE WELL RUNS DEEP", blurb: "The ink rises. Everything comes faster now.", extraStartingMana: 1 },
  { key: "the-shadow-mirror", name: "THE SHADOW MIRROR", blurb: "The rival dips a pen in your ink — they play your exact deck." },
];

/** Monday, January 5, 2026, 00:00:00 UTC — the week the blot began to spread. */
const BLOT_EPOCH_MS = Date.UTC(2026, 0, 5);
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Whole weeks since the blot began to spread (negative before the epoch). */
export function blotWeekIndex(nowMs: number): number {
  return Math.floor((nowMs - BLOT_EPOCH_MS) / WEEK_MS);
}

/** This week's mutation — the rotation wraps every 4 weeks. */
export function blotMutationFor(nowMs: number): TableMutation {
  const i = blotWeekIndex(nowMs);
  const n = BLOT_MUTATIONS.length;
  return BLOT_MUTATIONS[((i % n) + n) % n];
}

/** This week's mutation, or null before the blot began to spread. */
export function blotActiveMutationFor(nowMs: number): TableMutation | null {
  return blotWeekIndex(nowMs) >= 0 ? blotMutationFor(nowMs) : null;
}
