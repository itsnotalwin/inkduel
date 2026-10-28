/**
 * The single source of truth for INKDUEL's cards.
 * The Prisma `Card` table is seeded from this file; the engine and the UI
 * both read it. Effect primitives are exactly the set in the design spec.
 */

export type CardType = "unit" | "spell";
export type Rarity = "common" | "rare" | "epic" | "legendary";
export type Keyword = "guard" | "swift" | "twinstrike" | "insight" | "echo";

/**
 * Effect primitives. `target` selectors:
 *  - unit / any / enemyUnits: a chosen target (UI enters targeting mode)
 *  - allEnemyUnits / enemyHero / ownHero / allOtherUnits: unchosen
 *  - chosenFriendly / adjacentFriendly / allFriendly: friendly-board selectors
 */
export type Effect =
  | { kind: "DEAL_DAMAGE"; n: number; target: "unit" | "any" | "enemyUnits" | "allEnemyUnits" | "enemyHero" | "ownHero" }
  | { kind: "DRAW"; n: number }
  | { kind: "DRAW_UNTIL"; handSize: number }
  | { kind: "BUFF"; atk?: number; hp?: number; target: "chosenFriendly" | "adjacentFriendly" | "allFriendly"; grantKeyword?: Keyword }
  | { kind: "DESTROY"; target: "unit" | "any" | "allOtherUnits" }
  | { kind: "RETURN_TO_HAND"; target: "chosenFriendly" }
  | { kind: "HEAL_HERO"; n: number }
  | { kind: "SUMMON"; token: string; count: number | "perDestroyed" }
  | { kind: "GAIN_MANA"; n: number; temporary: boolean };

export interface CardDef {
  id: string;
  name: string;
  type: CardType;
  cost: number;
  attack?: number;
  health?: number;
  rarity: Rarity;
  keywords?: Keyword[];
  /** Rules text shown in the text box ("" for vanilla). */
  text: string;
  /** One-line flavor text shown in the collection modal (Caveat). */
  lore: string;
  /** Spell effect list, or a unit's "on play" trigger. */
  onPlay?: Effect[];
  /** "Echo" — triggers when the unit is destroyed. */
  echo?: Effect[];
  /** True for tokens (not collectible). */
  token?: boolean;
}

const C = (o: CardDef) => o;

export const CARDS: CardDef[] = [
  // ── Units ────────────────────────────────────────────────────
  C({ id: "ink_blot", name: "Ink Blot", type: "unit", cost: 1, attack: 1, health: 2, rarity: "common", text: "", lore: "It was an accident. Now it has opinions." }),
  C({ id: "paper_swan", name: "Paper Swan", type: "unit", cost: 1, attack: 1, health: 1, rarity: "common", keywords: ["swift"], text: "Swift", lore: "One fold for the wing. One for the grudge." }),
  C({ id: "apprentice_scribe", name: "Apprentice Scribe", type: "unit", cost: 1, attack: 1, health: 2, rarity: "rare", keywords: ["insight"], text: "Insight", lore: "Copies everything, understands nothing. Yet." }),
  C({ id: "origami_crane", name: "Origami Crane", type: "unit", cost: 2, attack: 2, health: 1, rarity: "common", keywords: ["swift"], text: "Swift", lore: "A thousand of these grant a wish. This one grants damage." }),
  C({ id: "graphite_golem", name: "Graphite Golem", type: "unit", cost: 2, attack: 2, health: 3, rarity: "common", text: "", lore: "Drawn too many times. Eventually it stood up." }),
  C({ id: "page_knight", name: "Page Knight", type: "unit", cost: 2, attack: 1, health: 4, rarity: "common", keywords: ["guard"], text: "Guard", lore: "Sworn to hold the line — line 42, specifically." }),
  C({ id: "inkwell_imp", name: "Inkwell Imp", type: "unit", cost: 2, attack: 3, health: 1, rarity: "common", text: "", lore: "Lives at the bottom of the well. Bites the nib." }),
  C({ id: "quill_sergeant", name: "Quill Sergeant", type: "unit", cost: 2, attack: 2, health: 2, rarity: "rare", text: "On play: give adjacent friendly units +1/+0", lore: "Barks orders in perfect cursive.", onPlay: [{ kind: "BUFF", atk: 1, target: "adjacentFriendly" }] }),
  C({ id: "fountain_pen_fencer", name: "Fountain Pen Fencer", type: "unit", cost: 3, attack: 3, health: 2, rarity: "rare", keywords: ["swift"], text: "Swift", lore: "The nib is mightier. Obviously." }),
  C({ id: "papercraft_colossus", name: "Papercraft Colossus", type: "unit", cost: 3, attack: 2, health: 5, rarity: "common", keywords: ["guard"], text: "Guard", lore: "Folded from the recycling. Remembers being important." }),
  C({ id: "eraser_golem", name: "Eraser Golem", type: "unit", cost: 3, attack: 3, health: 3, rarity: "rare", text: "Echo: restore 3 HP to your hero", lore: "It undoes. That is its whole personality.", echo: [{ kind: "HEAL_HERO", n: 3 }] }),
  C({ id: "stencil_archer", name: "Stencil Archer", type: "unit", cost: 3, attack: 2, health: 3, rarity: "rare", text: "On play: deal 1 damage to any target", lore: "Aims by template. Never misses the outline.", onPlay: [{ kind: "DEAL_DAMAGE", n: 1, target: "any" }] }),
  C({ id: "blotting_wall", name: "Blotting Wall", type: "unit", cost: 4, attack: 3, health: 6, rarity: "common", keywords: ["guard"], text: "Guard", lore: "Soaks up everything. Absorbs the complaints, too." }),
  C({ id: "ink_mage", name: "Ink Mage", type: "unit", cost: 4, attack: 3, health: 3, rarity: "epic", text: "On play: deal 2 damage to all enemy units", lore: "Spills on purpose. Calls it weather.", onPlay: [{ kind: "DEAL_DAMAGE", n: 2, target: "allEnemyUnits" }] }),
  C({ id: "the_calligrapher", name: "The Calligrapher", type: "unit", cost: 4, attack: 2, health: 4, rarity: "epic", text: "On play: draw 2 cards", lore: "Every letter a lesson. Every lesson, a card.", onPlay: [{ kind: "DRAW", n: 2 }] }),
  C({ id: "comic_relief", name: "Comic Relief", type: "unit", cost: 4, attack: 4, health: 2, rarity: "epic", keywords: ["twinstrike"], text: "Twinstrike", lore: "Hits twice. Laughs thrice." }),
  C({ id: "sketch_sentinel", name: "Sketch Sentinel", type: "unit", cost: 4, attack: 4, health: 5, rarity: "common", text: "", lore: "Ninety percent eraser, ten percent resolve." }),
  C({ id: "paper_dragon", name: "Paper Dragon", type: "unit", cost: 5, attack: 5, health: 4, rarity: "epic", keywords: ["swift"], text: "Swift", lore: "Breathes a very light fire." }),
  C({ id: "origami_phoenix", name: "Origami Phoenix", type: "unit", cost: 5, attack: 4, health: 3, rarity: "rare", text: "Echo: summon a 2/2 Ash Wing", lore: "Unfolds in fire. Refolds on schedule.", echo: [{ kind: "SUMMON", token: "ash_wing", count: 1 }] }),
  C({ id: "archivists_aide", name: "Archivist's Aide", type: "unit", cost: 5, attack: 4, health: 5, rarity: "common", text: "", lore: "Carries the ladder. And the archive. And the grudge." }),
  C({ id: "stationery_titan", name: "Stationery Titan", type: "unit", cost: 6, attack: 5, health: 7, rarity: "rare", keywords: ["guard"], text: "Guard", lore: "The supply closet finally fought back." }),
  C({ id: "the_living_manuscript", name: "The Living Manuscript", type: "unit", cost: 7, attack: 7, health: 7, rarity: "legendary", text: "Echo: draw 2 cards", lore: "It edits itself while you read it.", echo: [{ kind: "DRAW", n: 2 }] }),
  C({ id: "the_grand_palimpsest", name: "The Grand Palimpsest", type: "unit", cost: 8, attack: 6, health: 8, rarity: "legendary", text: "On play: destroy all other units; summon a 1/1 Ghost Text for each destroyed", lore: "Every page was written over. Nothing was ever lost.", onPlay: [{ kind: "DESTROY", target: "allOtherUnits" }, { kind: "SUMMON", token: "ghost_text", count: "perDestroyed" }] }),
  C({ id: "the_archivist", name: "The Archivist", type: "unit", cost: 9, attack: 7, health: 9, rarity: "legendary", text: "On play: draw cards until you have 8 in hand", lore: "Knows where everything is. Including you.", onPlay: [{ kind: "DRAW_UNTIL", handSize: 8 }] }),
  C({ id: "the_unwritten", name: "The Unwritten", type: "unit", cost: 10, attack: 10, health: 10, rarity: "legendary", keywords: ["swift", "twinstrike"], text: "Swift, Twinstrike", lore: "The blank page at the end of every book." }),

  // ── Units — second wave ─────────────────────────────────────
  C({ id: "marginalia", name: "Marginalia", type: "unit", cost: 1, attack: 1, health: 3, rarity: "common", text: "Echo: draw 1 card", lore: "The reader before you left a map.", echo: [{ kind: "DRAW", n: 1 }] }),
  C({ id: "paper_airplane", name: "Paper Airplane", type: "unit", cost: 2, attack: 3, health: 1, rarity: "common", text: "On play: deal 1 damage to the enemy hero", lore: "Sent during class. Always lands.", onPlay: [{ kind: "DEAL_DAMAGE", n: 1, target: "enemyHero" }] }),
  C({ id: "inkwell_serpent", name: "Inkwell Serpent", type: "unit", cost: 2, attack: 1, health: 4, rarity: "rare", keywords: ["guard"], text: "Guard", lore: "It guards the well. The well guards it." }),
  C({ id: "glue_stick", name: "Glue Stick", type: "unit", cost: 3, attack: 2, health: 3, rarity: "common", text: "On play: give a friendly unit +0/+2", lore: "Everything sticks with it.", onPlay: [{ kind: "BUFF", hp: 2, target: "chosenFriendly" }] }),
  C({ id: "wax_seal_warden", name: "Wax Seal Warden", type: "unit", cost: 3, attack: 2, health: 3, rarity: "rare", keywords: ["twinstrike"], text: "Twinstrike", lore: "Pressed twice for permanence." }),
  C({ id: "typewriter_terror", name: "Typewriter Terror", type: "unit", cost: 4, attack: 3, health: 4, rarity: "epic", text: "On play: deal 2 damage to any target", lore: "It types. It clacks. It targets.", onPlay: [{ kind: "DEAL_DAMAGE", n: 2, target: "any" }] }),
  C({ id: "sticky_note", name: "Sticky Note", type: "unit", cost: 4, attack: 2, health: 6, rarity: "rare", keywords: ["guard"], text: "Guard. Echo: restore 2 HP to your hero", lore: "DON'T FORGET: hold the line.", echo: [{ kind: "HEAL_HERO", n: 2 }] }),
  C({ id: "laminated_legend", name: "Laminated Legend", type: "unit", cost: 6, attack: 5, health: 8, rarity: "epic", keywords: ["guard"], text: "Guard. Echo: summon a 3/3 Ink Golem", lore: "Immortalized. Literally.", echo: [{ kind: "SUMMON", token: "ink_golem", count: 1 }] }),
  C({ id: "the_red_thesaurus", name: "The Red Thesaurus", type: "unit", cost: 5, attack: 4, health: 4, rarity: "legendary", keywords: ["swift", "twinstrike"], text: "Swift, Twinstrike", lore: "Four hundred ways to say \"hit\".", }),

  // ── Spells — second wave ────────────────────────────────────
  C({ id: "doodle", name: "Doodle", type: "spell", cost: 1, rarity: "common", text: "Summon a 1/1 Ghost Text", lore: "A quick sketch during a slow lecture.", onPlay: [{ kind: "SUMMON", token: "ghost_text", count: 1 }] }),
  C({ id: "second_wind", name: "Second Wind", type: "spell", cost: 2, rarity: "common", text: "Restore 4 HP to your hero", lore: "One more page in you yet.", onPlay: [{ kind: "HEAL_HERO", n: 4 }] }),
  C({ id: "margin_call", name: "Margin Call", type: "spell", cost: 2, rarity: "rare", text: "Deal 1 damage to all enemy units; restore 2 HP to your hero", lore: "Tidy the edges. Feel better.", onPlay: [{ kind: "DEAL_DAMAGE", n: 1, target: "allEnemyUnits" }, { kind: "HEAL_HERO", n: 2 }] }),
  C({ id: "plot_twist", name: "Plot Twist", type: "spell", cost: 3, rarity: "epic", text: "Draw 2 cards; your hero takes 1 damage", lore: "Nobody saw it coming. Especially you.", onPlay: [{ kind: "DRAW", n: 2 }, { kind: "DEAL_DAMAGE", n: 1, target: "ownHero" }] }),
  C({ id: "fresh_page", name: "Fresh Page", type: "spell", cost: 3, rarity: "common", text: "Draw cards until you have 5 in hand", lore: "A clean start, by the sheet.", onPlay: [{ kind: "DRAW_UNTIL", handSize: 5 }] }),
  C({ id: "ink_wash", name: "Ink Wash", type: "spell", cost: 5, rarity: "epic", text: "Deal 4 damage to all enemy units", lore: "One broad stroke, and the board is bare.", onPlay: [{ kind: "DEAL_DAMAGE", n: 4, target: "allEnemyUnits" }] }),
  C({ id: "the_second_printing", name: "The Second Printing", type: "spell", cost: 6, rarity: "epic", text: "Summon two 3/3 Ink Golems", lore: "Popular demand, met twice.", onPlay: [{ kind: "SUMMON", token: "ink_golem", count: 2 }] }),

  // ── Spells ───────────────────────────────────────────────────
  C({ id: "red_pen", name: "Red Pen", type: "spell", cost: 1, rarity: "common", text: "Deal 2 damage to a unit", lore: "The margin's sharpest critique.", onPlay: [{ kind: "DEAL_DAMAGE", n: 2, target: "unit" }] }),
  C({ id: "crumpled_note", name: "Crumpled Note", type: "spell", cost: 1, rarity: "common", text: "Deal 1 damage to all enemy units", lore: "\"meet me behind the gym — NO ONE\"", onPlay: [{ kind: "DEAL_DAMAGE", n: 1, target: "allEnemyUnits" }] }),
  C({ id: "fresh_ink", name: "Fresh Ink", type: "spell", cost: 2, rarity: "common", text: "Give a friendly unit +2/+2", lore: "Still wet. Still dangerous.", onPlay: [{ kind: "BUFF", atk: 2, hp: 2, target: "chosenFriendly" }] }),
  C({ id: "blank_page", name: "Blank Page", type: "spell", cost: 2, rarity: "common", text: "Draw 2 cards", lore: "Potential, by the sheet.", onPlay: [{ kind: "DRAW", n: 2 }] }),
  C({ id: "second_draft", name: "Second Draft", type: "spell", cost: 2, rarity: "rare", text: "Return a friendly unit to your hand", lore: "We don't talk about the first draft.", onPlay: [{ kind: "RETURN_TO_HAND", target: "chosenFriendly" }] }),
  C({ id: "paper_cut", name: "Paper Cut", type: "spell", cost: 2, rarity: "common", text: "Deal 3 damage to any target", lore: "Small paper. Personal paper.", onPlay: [{ kind: "DEAL_DAMAGE", n: 3, target: "any" }] }),
  C({ id: "sharpened_pencil", name: "Sharpened Pencil", type: "spell", cost: 2, rarity: "common", text: "Give a friendly unit +2/+0 and Swift", lore: "Point side out. Always point side out.", onPlay: [{ kind: "BUFF", atk: 2, target: "chosenFriendly", grantKeyword: "swift" }] }),
  C({ id: "lamination", name: "Lamination", type: "spell", cost: 3, rarity: "rare", text: "Give a friendly unit +0/+4 and Guard", lore: "Immortal. Also, shiny.", onPlay: [{ kind: "BUFF", hp: 4, target: "chosenFriendly", grantKeyword: "guard" }] }),
  C({ id: "pressure_stamp", name: "Pressure Stamp", type: "spell", cost: 3, rarity: "rare", text: "Deal 2 damage to any target; draw a card", lore: "APPROVED, with prejudice.", onPlay: [{ kind: "DEAL_DAMAGE", n: 2, target: "any" }, { kind: "DRAW", n: 1 }] }),
  C({ id: "paper_storm", name: "Paper Storm", type: "spell", cost: 4, rarity: "epic", text: "Deal 3 damage to all enemy units", lore: "A stiff breeze with a grudge.", onPlay: [{ kind: "DEAL_DAMAGE", n: 3, target: "allEnemyUnits" }] }),
  C({ id: "editors_verdict", name: "Editor's Verdict", type: "spell", cost: 4, rarity: "rare", text: "Destroy any unit", lore: "This sentence deleted a column.", onPlay: [{ kind: "DESTROY", target: "unit" }] }),
  C({ id: "acceptance_stamp", name: "Acceptance Stamp", type: "spell", cost: 5, rarity: "rare", text: "Deal 5 damage to the enemy hero; your hero takes 2", lore: "The letter came. The letter cost.", onPlay: [{ kind: "DEAL_DAMAGE", n: 5, target: "enemyHero" }, { kind: "DEAL_DAMAGE", n: 2, target: "ownHero" }] }),
  C({ id: "the_final_draft", name: "The Final Draft", type: "spell", cost: 5, rarity: "epic", text: "Summon a 3/3 Ink Golem; draw a card", lore: "FINAL_final_v3_ACTUAL_FINAL.doc", onPlay: [{ kind: "SUMMON", token: "ink_golem", count: 1 }, { kind: "DRAW", n: 1 }] }),
  C({ id: "foreword", name: "Foreword", type: "spell", cost: 6, rarity: "epic", text: "Give all friendly units +2/+2", lore: "Written last. Read first.", onPlay: [{ kind: "BUFF", atk: 2, hp: 2, target: "allFriendly" }] }),
  C({ id: "blot_out", name: "Blot Out", type: "spell", cost: 6, rarity: "rare", text: "Deal 6 damage to any target", lore: "The deleting pen. No survivors in its margins.", onPlay: [{ kind: "DEAL_DAMAGE", n: 6, target: "any" }] }),

  // ── Tokens (not collectible) ─────────────────────────────────
  C({ id: "ash_wing", name: "Ash Wing", type: "unit", cost: 2, attack: 2, health: 2, rarity: "common", token: true, text: "", lore: "Rises, briefly, from the phoenix's desk." }),
  C({ id: "ghost_text", name: "Ghost Text", type: "unit", cost: 1, attack: 1, health: 1, rarity: "common", token: true, text: "", lore: "A sentence the page almost kept." }),
  C({ id: "ink_golem", name: "Ink Golem", type: "unit", cost: 3, attack: 3, health: 3, rarity: "common", token: true, text: "", lore: "Poured, not drawn." }),
  C({ id: "tempo_token", name: "Tempo Token", type: "spell", cost: 0, rarity: "common", token: true, text: "Gain 1 mana this turn only.", lore: "A little head start, handed over in person.", onPlay: [{ kind: "GAIN_MANA", n: 1, temporary: true }] }),
];

export const CARD_BY_ID: ReadonlyMap<string, CardDef> = new Map(
  CARDS.map((c) => [c.id, c]),
);

export function getCard(id: string): CardDef {
  const c = CARD_BY_ID.get(id);
  if (!c) throw new Error(`Unknown card: ${id}`);
  return c;
}

export const COLLECTIBLE_CARDS = CARDS.filter((c) => !c.token);
export const LEGENDARY_IDS = COLLECTIBLE_CARDS.filter((c) => c.rarity === "legendary").map((c) => c.id);

/** Keywords that grant the ability purely by being on the card. */
export const KEYWORD_LABEL: Record<Keyword, string> = {
  guard: "Guard",
  swift: "Swift",
  twinstrike: "Twinstrike",
  insight: "Insight",
  echo: "Echo",
};

// ── Scripted archetype decks (exactly 20 cards each) ───────────
export const ARCHETYPE_DECKS: Record<string, { name: string; cards: [string, number][] }> = {
  duelist: {
    name: "The Duelist's Rush",
    cards: [
      ["paper_swan", 2], ["origami_crane", 2], ["inkwell_imp", 2], ["ink_blot", 2],
      ["graphite_golem", 2], ["fountain_pen_fencer", 2], ["paper_dragon", 1],
      ["red_pen", 2], ["paper_cut", 2], ["sharpened_pencil", 1], ["crumpled_note", 2],
    ],
  },
  archivist: {
    name: "The Archivist's Vault",
    cards: [
      ["page_knight", 2], ["papercraft_colossus", 2], ["blotting_wall", 2], ["eraser_golem", 2],
      ["stencil_archer", 1], ["stationery_titan", 2], ["the_living_manuscript", 1],
      ["the_grand_palimpsest", 1], ["the_archivist", 1], ["editors_verdict", 2],
      ["paper_storm", 1], ["acceptance_stamp", 1], ["lamination", 1], ["second_draft", 1],
    ],
  },
  collector: {
    name: "The Collector's Folio",
    cards: [
      ["apprentice_scribe", 2], ["quill_sergeant", 2], ["sketch_sentinel", 2], ["archivists_aide", 2],
      ["the_calligrapher", 1], ["comic_relief", 2], ["graphite_golem", 1], ["blank_page", 2],
      ["fresh_ink", 2], ["pressure_stamp", 2], ["foreword", 1], ["the_final_draft", 1],
    ],
  },
};

/** Effects that require the player (or AI) to choose a target when played. */
export function needsTarget(card: CardDef): boolean {
  const effects = [...(card.onPlay ?? []), ...(card.echo ?? [])];
  return effects.some(
    (e) =>
      (e.kind === "DEAL_DAMAGE" && (e.target === "unit" || e.target === "any" || e.target === "enemyUnits")) ||
      (e.kind === "DESTROY" && (e.target === "unit" || e.target === "any")) ||
      e.kind === "BUFF" && e.target === "chosenFriendly" ||
      e.kind === "RETURN_TO_HAND",
  );
}

/** Which side(s) a card's chosen target must belong to. */
export function targetScope(card: CardDef): "friendly" | "any" {
  const effects = card.onPlay ?? [];
  const friendlyOnly = effects.every(
    (e) =>
      (e.kind === "BUFF" && e.target === "chosenFriendly") ||
      e.kind === "RETURN_TO_HAND",
  );
  return friendlyOnly ? "friendly" : "any";
}
