/**
 * Collection ownership rules.
 *  - Wave 1 ("First Edition"): every common/rare/epic is owned by default;
 *    legendaries unlock via achievements.
 *  - Wave 2 ("The Archive Set") cards are NOT default-owned — they come from
 *    packs, campaign milestones, or achievement unlocks.
 *  - extraCards: card ids pulled from packs / campaign rewards.
 */
import { ARCHIVE_SET_IDS, COLLECTIBLE_CARDS } from "@/game/cards";
import { legendaryUnlocks } from "./achievements";

export function ownedCardIds(unlockedAchievementKeys: string[], extraCards: string[] | null | undefined): Set<string> {
  const owned = new Set<string>();
  const legendaries = new Set(legendaryUnlocks(unlockedAchievementKeys));
  const extras = new Set(extraCards ?? []);
  for (const c of COLLECTIBLE_CARDS) {
    if (ARCHIVE_SET_IDS.has(c.id) || extras.has(c.id)) {
      if (extras.has(c.id)) owned.add(c.id);
    } else if (c.rarity !== "legendary" || legendaries.has(c.id)) {
      owned.add(c.id);
    }
  }
  for (const id of extras) owned.add(id);
  return owned;
}
