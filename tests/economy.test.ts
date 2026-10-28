import { describe, expect, it } from "vitest";
import { CAMPAIGN_STAGES } from "@/game/campaign";
import { validateDeck } from "@/game/decks";
import { rollPack, PACK_SIZE, PACK_COST, DUPLICATE_REFUND } from "@/game/packs";
import { COLLECTIBLE_CARDS } from "@/game/cards";

describe("campaign", () => {
  it("has 12 consecutive stages", () => {
    expect(CAMPAIGN_STAGES).toHaveLength(12);
    CAMPAIGN_STAGES.forEach((s, i) => expect(s.index).toBe(i));
  });

  it("every campaign deck is a legal 20-card deck", () => {
    for (const stage of CAMPAIGN_STAGES) {
      const errors = validateDeck(stage.deck.map(([cardId, count]) => ({ cardId, count })));
      expect(errors, `${stage.name}: ${errors.join(" | ")}`).toEqual([]);
    }
  });

  it("rewards escalate", () => {
    for (let i = 1; i < CAMPAIGN_STAGES.length; i++) {
      expect(CAMPAIGN_STAGES[i].rewardCoins).toBeGreaterThan(CAMPAIGN_STAGES[i - 1].rewardCoins);
    }
  });

  it("milestone reward cards exist", () => {
    for (const stage of CAMPAIGN_STAGES) {
      if (stage.rewardCard) expect(COLLECTIBLE_CARDS.some((c) => c.id === stage.rewardCard)).toBe(true);
    }
  });
});

describe("packs", () => {
  it("always yields 5 cards with at least one rare+", () => {
    for (let seed = 0; seed < 200; seed++) {
      let s = seed * 2654435761;
      const rand = () => {
        s = (s + 0x6d2b79f5) | 0;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
      const result = rollPack(new Set(), rand);
      expect(result.cards).toHaveLength(PACK_SIZE);
      const hasRarePlus = result.cards.some((c) => ["rare", "epic", "legendary"].includes(
        COLLECTIBLE_CARDS.find((x) => x.id === c.cardId)?.rarity ?? "common",
      ));
      expect(hasRarePlus).toBe(true);
    }
  });

  it("prefers unowned cards and refunds duplicates", () => {
    const owned = new Set(["ink_blot", "paper_swan"]);
    let s = 12345;
    const rand = () => {
      s = (s + 0x6d2b79f5) | 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const result = rollPack(owned, rand);
    const ownedPulled = result.cards.filter((c) => c.cardId === "ink_blot" || c.cardId === "paper_swan");
    for (const c of ownedPulled) {
      expect(c.isNew).toBe(false);
      expect(c.refund).toBe(DUPLICATE_REFUND);
    }
  });

  it("constants line up with the UI", () => {
    expect(PACK_SIZE).toBe(5);
    expect(PACK_COST).toBe(100);
  });
});
