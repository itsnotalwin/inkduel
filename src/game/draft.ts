/**
 * INK DRAFT — the gameplan's phase 1: a solo draft mode.
 *
 * Twenty pick-rounds. Each round offers three collectible cards; the player
 * inks one into their deck. Deck legality (max two copies, one legendary) is
 * honored by the offer itself, so whatever a player drafts is playable. A
 * rival drafts its own twenty cards alongside — seeded, hidden until the
 * final pick — and then the two decks meet at /duel?draft=1.
 *
 * Everything here is pure and deterministic: a run is a plain serializable
 * object, and every offer is a pure function of (seed, picks made so far),
 * so a run can be replayed byte-for-byte from its seed.
 */
import { CARD_BY_ID, COLLECTIBLE_CARDS, getCard } from "@/game/cards";
import { DECK_SIZE } from "@/config";
import { mulberry32, type DeckEntry } from "@/game/decks";

/** Picks that make a complete draft deck (mirrors DECK_SIZE; named for the mode). */
export const DECK_PICKS = DECK_SIZE;

/** sessionStorage key the /draft page stashes both decks under for /duel?draft=1. */
export const DRAFT_STASH_KEY = "inkduel:draftDecks";

export interface DraftRun {
  seed: number;
  /** Card ids chosen so far, in pick order. */
  picks: string[];
  /** The three cards on the table this round (empty once complete). */
  offer: string[];
  complete: boolean;
}

/** Both drafted decks, stashed for the duel. */
export interface DraftStash {
  player: DeckEntry[];
  rival: DeckEntry[];
  seed: number;
}

/** The offer pool: every collectible card, tokens excluded — areas included. */
const DRAFT_POOL: string[] = COLLECTIBLE_CARDS.map((c) => c.id);

/** Odd salts → (n+1)*SALT is injective mod 2^32, so each offer round and the
 *  rival's deck read from distinct, deterministic mulberry32 streams. */
const OFFER_SALT = 0x9e3779b1;
const RIVAL_SALT = 0x1a2b3c4d;

function offerRng(seed: number, offerIndex: number): () => number {
  return mulberry32((seed ^ Math.imul(offerIndex + 1, OFFER_SALT)) | 0);
}

/** Copies of `cardId` the draft may still add given the picks so far. */
function copiesLeft(cardId: string, picks: readonly string[]): number {
  const def = CARD_BY_ID.get(cardId);
  if (!def) return 0;
  const used = picks.reduce((n, id) => (id === cardId ? n + 1 : n), 0);
  return (def.rarity === "legendary" ? 1 : 2) - used;
}

/** Cards that could legally join the deck right now. */
function eligiblePool(picks: readonly string[]): string[] {
  return DRAFT_POOL.filter((id) => copiesLeft(id, picks) > 0);
}

/**
 * Build the next offer of three DISTINCT cards from the eligible pool,
 * honoring deck legality and weighted toward a playable curve:
 *  - every offer carries at least one card costing 3 or less;
 *  - four offers in five carry at least one unit;
 *  - the two constraints land on random slots so offers don't read as a template.
 */
function draftOffer(seed: number, picks: readonly string[]): string[] {
  const rand = offerRng(seed, picks.length);
  const eligible = eligiblePool(picks);

  // shuffle the slot order, then deal the constraints to the first two slots
  const slots = [0, 1, 2];
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [slots[i], slots[j]] = [slots[j], slots[i]];
  }
  const cheapSlot = slots[0];
  const unitSlot = slots[1];
  const wantUnit = rand() < 0.8; // "at least 1 unit in 4 of every 5 offers"

  const offer: string[] = [];
  const taken = new Set<string>();
  for (let slot = 0; slot < 3; slot++) {
    let pool = eligible.filter((id) => !taken.has(id));
    if (slot === cheapSlot) {
      const cheap = pool.filter((id) => getCard(id).cost <= 3);
      if (cheap.length > 0) pool = cheap;
    } else if (slot === unitSlot && wantUnit) {
      const units = pool.filter((id) => getCard(id).type === "unit");
      if (units.length > 0) pool = units;
    }
    const id = pool[Math.floor(rand() * pool.length)];
    taken.add(id);
    offer.push(id);
  }
  return offer;
}

/** Open a fresh draft run: no picks yet, first offer on the table. */
export function startDraftRun(seed: number): DraftRun {
  return { seed, picks: [], offer: draftOffer(seed, []), complete: false };
}

/** Ink one offer card into the deck and deal the next offer.
 *  Throws when the run is complete or the card is not on the table. */
export function pickFromOffer(run: DraftRun, cardId: string): DraftRun {
  if (run.complete || run.picks.length >= DECK_PICKS) {
    throw new Error("This draft run is already complete.");
  }
  if (!run.offer.includes(cardId)) {
    throw new Error(`"${cardId}" is not in the current offer.`);
  }
  const picks = [...run.picks, cardId];
  if (picks.length >= DECK_PICKS) {
    return { ...run, picks, offer: [], complete: true };
  }
  return { seed: run.seed, picks, offer: draftOffer(run.seed, picks), complete: false };
}

/**
 * The rival's own seeded draft, dealt up front: a full 20-card legal deck,
 * curve-weighted — early picks prefer cost <= 4 (a 0.75 score penalty on
 * anything pricier for the first fourteen picks), later picks fill out the
 * top of the curve. Deterministic per seed.
 */
export function rivalDraft(seed: number): string[] {
  const rand = mulberry32((seed ^ RIVAL_SALT) | 0);
  const picks: string[] = [];
  const counts = new Map<string, number>();
  while (picks.length < DECK_PICKS) {
    const early = picks.length < 14;
    const scored = eligiblePool(picks).map((id) => ({
      id,
      score: rand() - (early && getCard(id).cost > 4 ? 0.75 : 0),
    }));
    scored.sort((a, b) => b.score - a.score);
    const best = scored[0].id;
    picks.push(best);
    counts.set(best, (counts.get(best) ?? 0) + 1);
  }
  return picks;
}

/** Group a picked id list into deck entries (duplicate picks merge their count). */
export function picksToDeck(ids: readonly string[]): DeckEntry[] {
  const entries: DeckEntry[] = [];
  for (const id of ids) {
    const held = entries.find((e) => e.cardId === id);
    if (held) held.count += 1;
    else entries.push({ cardId: id, count: 1 });
  }
  return entries;
}

/** Both decks from a finished run, ready to stash for /duel?draft=1 — each
 *  pick as a count-1 entry, so expandDeck() rebuilds the exact dealt order. */
export function buildDraftStash(run: DraftRun, rivalPicks: readonly string[]): DraftStash {
  if (!run.complete) throw new Error("The draft run is not complete yet.");
  const oneEach = (ids: readonly string[]): DeckEntry[] => ids.map((id) => ({ cardId: id, count: 1 }));
  return {
    player: oneEach(run.picks),
    rival: oneEach(rivalPicks),
    seed: run.seed,
  };
}
