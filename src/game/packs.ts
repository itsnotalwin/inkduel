/**
 * Pack opening (gacha) — pure roll logic, shared by the server route and
 * the paper edition. Odds per card: common 70 / rare 20 / epic 8 / legendary 2,
 * with a floor of one rare+ per pack. Unowned cards are preferred; duplicates
 * refund ink.
 */
import { CARDS, COLLECTIBLE_CARDS } from "./cards";

export const PACK_SIZE = 5;
export const PACK_COST = 100;
export const DUPLICATE_REFUND = 20;

export type Rarity = "common" | "rare" | "epic" | "legendary";

export interface PackCard {
  cardId: string;
  isNew: boolean;
  refund: number;
}

export interface PackResult {
  cards: PackCard[];
  totalRefund: number;
}

function rollRarity(rand: number): Rarity {
  if (rand < 0.02) return "legendary";
  if (rand < 0.1) return "epic";
  if (rand < 0.3) return "rare";
  return "common";
}

function randomOf<T>(arr: T[], rand: number): T {
  return arr[Math.floor(rand * arr.length)];
}

/** Roll a pack. `owned` = every collectible card id the player already has. */
export function rollPack(owned: ReadonlySet<string>, rand: () => number): PackResult {
  const unowned = new Set(COLLECTIBLE_CARDS.filter((c) => !owned.has(c.id)).map((c) => c.id));
  const cards: PackCard[] = [];

  for (let i = 0; i < PACK_SIZE; i++) {
    // the last slot is the "floor" slot — upgrade to rare+ if the pack had no rare+
    let rarity = rollRarity(rand());
    if (i === PACK_SIZE - 1 && !cards.some((c) => c.cardId && rarityAt(c.cardId) !== "common") && rarity === "common") {
      rarity = "rare";
    }
    const pool = CARDS.filter((c) => !c.token && c.rarity === rarity);
    // prefer unowned cards at this rarity
    const unownedInRarity = pool.filter((c) => unowned.has(c.id));
    const chosen = randomOf(unownedInRarity.length > 0 ? unownedInRarity : pool, rand());
    const isNew = unowned.has(chosen.id);
    if (isNew) unowned.delete(chosen.id);
    cards.push({ cardId: chosen.id, isNew, refund: isNew ? 0 : DUPLICATE_REFUND });
  }

  return { cards, totalRefund: cards.reduce((n, c) => n + c.refund, 0) };
}

export function rarityAt(cardId: string): Rarity {
  const c = CARDS.find((x) => x.id === cardId);
  return (c?.rarity as Rarity) ?? "common";
}
