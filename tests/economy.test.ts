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

  // ── §3.1 roadmap step one: RNG distribution over a huge sample ─────────

  function seededRand(seed: number): () => number {
    let s = seed | 0;
    return () => {
      s = (s + 0x6d2b79f5) | 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function rarityOf(cardId: string): string {
    return COLLECTIBLE_CARDS.find((x) => x.id === cardId)?.rarity ?? "common";
  }

  it("pack RNG distribution: 50,000 packs land within tolerance of 70/20/8/2", () => {
    const PACKS = 50_000;
    const owned = new Set<string>();
    const rand = seededRand(0xc0ffee);
    const counts = { common: 0, rare: 0, epic: 0, legendary: 0 };
    let pulls = 0;

    for (let i = 0; i < PACKS; i++) {
      const result = rollPack(owned, rand);
      for (const card of result.cards) {
        counts[rarityOf(card.cardId) as keyof typeof counts] += 1;
        pulls += 1;
      }
    }

    expect(pulls).toBe(PACKS * PACK_SIZE);

    // the rare+ floor lifts rares above 20% (last-slot upgrade fires when the
    // first four slots are all common: P = 0.7^4 ≈ 24% of packs), so the
    // bands below are centered on the observed design targets with room.
    const share = (n: number) => (n / pulls) * 100;
    expect(share(counts.common)).toBeGreaterThan(63);
    expect(share(counts.common)).toBeLessThan(71);
    expect(share(counts.rare)).toBeGreaterThan(19);
    expect(share(counts.rare)).toBeLessThan(27);
    expect(share(counts.epic)).toBeGreaterThan(6.5);
    expect(share(counts.epic)).toBeLessThan(9.5);
    expect(share(counts.legendary)).toBeGreaterThan(1.4);
    expect(share(counts.legendary)).toBeLessThan(2.6);
  });

  it("rare+ floor: every one of 50,000 packs contains at least one rare+", () => {
    const PACKS = 50_000;
    const rand = seededRand(0xbeef42);
    let packsFloored = 0;
    for (let i = 0; i < PACKS; i++) {
      const result = rollPack(new Set(), rand);
      const hasRarePlus = result.cards.some((c) => ["rare", "epic", "legendary"].includes(rarityOf(c.cardId)));
      expect(hasRarePlus).toBe(true);
      if (result.cards.filter((c) => ["rare", "epic", "legendary"].includes(rarityOf(c.cardId))).length === 1) {
        packsFloored += 1;
      }
    }
    // the floor should actually fire sometimes (≈ 0.7^4 · 0.7 ≈ 17% of packs)
    // — if it never fires, the guarantee is vacuous
    expect(packsFloored).toBeGreaterThan(PACKS * 0.05);
  });

  it("no tokens ever leak into packs", () => {
    const rand = seededRand(0x7ee7);
    const tokenIds = new Set(["ash_wing", "ghost_text", "ink_golem", "tempo_token", "scribble"]);
    for (let i = 0; i < 2_000; i++) {
      const result = rollPack(new Set(), rand);
      for (const card of result.cards) {
        expect(tokenIds.has(card.cardId)).toBe(false);
      }
    }
  });

  it("collection growth: unowned preference fills a fresh collection across 100 packs", () => {
    const owned = new Set(["ink_blot", "paper_swan"]);
    const rand = seededRand(0x1234abcd);
    for (let i = 0; i < 100; i++) {
      const result = rollPack(owned, rand);
      for (const card of result.cards) {
        if (card.isNew) owned.add(card.cardId);
      }
    }
    // a fresh collector opening 100 packs (500 cards) should have discovered
    // a substantial share of the unowned pool — the unowned-preference rule
    // must visibly outperform naive random pulling
    const discovered = owned.size - 2;
    expect(discovered).toBeGreaterThan(40);
  });

  it("constants line up with the UI", () => {
    expect(PACK_SIZE).toBe(5);
    expect(PACK_COST).toBe(100);
  });
});
