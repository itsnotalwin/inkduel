import { CARD_BY_ID } from "./cards";
import { DECK_SIZE, MAX_COPIES, MAX_LEGENDARY_COPIES } from "@/config";

export interface DeckEntry {
  cardId: string;
  count: number;
}

/**
 * Validate a 20-card deck. Returns human-readable errors (empty = valid).
 * `owned` = card ids the player is allowed to use (collection).
 */
export function validateDeck(cards: DeckEntry[], owned?: ReadonlySet<string>): string[] {
  const errors: string[] = [];
  const total = cards.reduce((n, c) => n + c.count, 0);

  if (total !== DECK_SIZE) {
    errors.push(`A deck is exactly ${DECK_SIZE} cards — this one has ${total}.`);
  }
  if (total > DECK_SIZE) {
    // don't also report per-card copy errors; the count is the headline problem
  }

  const seen = new Map<string, number>();
  for (const entry of cards) {
    const def = CARD_BY_ID.get(entry.cardId);
    if (!def) {
      errors.push(`Unknown card "${entry.cardId}".`);
      continue;
    }
    if (entry.count < 1) {
      errors.push(`"${def.name}" has an invalid count (${entry.count}).`);
      continue;
    }
    const limit = def.rarity === "legendary" ? MAX_LEGENDARY_COPIES : MAX_COPIES;
    seen.set(entry.cardId, (seen.get(entry.cardId) ?? 0) + entry.count);
    if (seen.get(entry.cardId)! > limit) {
      errors.push(
        def.rarity === "legendary"
          ? `Only one copy of the legendary "${def.name}" is allowed.`
          : `Only two copies of "${def.name}" are allowed.`,
      );
    }
    if (owned && !owned.has(entry.cardId)) {
      errors.push(`"${def.name}" is not in your collection yet.`);
    }
  }
  return errors;
}

/** Seeded RNG (mulberry32) for the Gambler's random deck. */
export function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Build a random legal 20-card deck (max 2 copies, max 1 legendary) from a pool. */
export function randomDeck(seed: number, pool: string[] = [...CARD_BY_ID.keys()]): DeckEntry[] {
  const rand = mulberry32(seed);
  const entries: DeckEntry[] = [];
  let total = 0;
  const candidates = pool.filter((id) => CARD_BY_ID.has(id));
  let stalls = 0;
  while (total < DECK_SIZE) {
    const id = candidates[Math.floor(rand() * candidates.length)];
    const def = CARD_BY_ID.get(id)!;
    const limit = def.rarity === "legendary" ? 1 : 2;
    const existing = entries.find((e) => e.cardId === id);
    const used = existing?.count ?? 0;
    if (used >= limit) {
      if (++stalls > 500) {
        throw new Error("randomDeck: pool is too small to fill a 20-card deck");
      }
      continue;
    }
    stalls = 0;
    const remaining = DECK_SIZE - total;
    const add = Math.min(limit - used, remaining, 1 + Math.floor(rand() * 2));
    if (existing) existing.count += add;
    else entries.push({ cardId: id, count: add });
    total += add;
  }
  return entries;
}

/** Expand a deck list into an ordered array of card ids (for the engine). */
export function expandDeck(cards: DeckEntry[]): string[] {
  const out: string[] = [];
  for (const e of cards) for (let i = 0; i < e.count; i++) out.push(e.cardId);
  return out;
}
