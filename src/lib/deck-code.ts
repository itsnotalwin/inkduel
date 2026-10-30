/**
 * Deck share codes — the portable format behind /decks/share.
 *
 * Format: `cardId.count;cardId.count;…`, sorted by card id so the same deck
 * always produces the same code. Readable beats opaque here: the ids are all
 * lowercase letters and underscores, so the code is URL-safe without base64
 * and debuggable at a glance.
 */
import { CARD_BY_ID, COLLECTIBLE_CARDS } from "@/game/cards";
import type { DeckEntry } from "@/game/decks";

export function encodeDeckCode(cards: DeckEntry[]): string {
  return [...cards]
    .sort((a, b) => a.cardId.localeCompare(b.cardId))
    .map((e) => `${e.cardId}.${e.count}`)
    .join(";");
}

export function decodeDeckCode(code: string): DeckEntry[] | null {
  const entries: DeckEntry[] = [];
  for (const part of code.trim().split(";")) {
    if (!part) continue;
    const dot = part.lastIndexOf(".");
    if (dot <= 0) return null;
    const cardId = part.slice(0, dot);
    const count = Number(part.slice(dot + 1));
    const def = CARD_BY_ID.get(cardId);
    if (!def || !COLLECTIBLE_CARDS.some((c) => c.id === cardId)) return null; // no tokens
    if (!Number.isInteger(count) || count < 1 || count > 2) return null;
    if (def.rarity === "legendary" && count > 1) return null;
    if (entries.some((e) => e.cardId === cardId)) return null;
    entries.push({ cardId, count });
  }
  return entries.length > 0 ? entries : null;
}
