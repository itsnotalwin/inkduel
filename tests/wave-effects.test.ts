/**
 * Per-effect tests for the wave-2 and wave-3 (Archive Set) cards.
 * One focused assertion per effect, using the same direct-state setup
 * pattern as engine.test.ts.
 */
import { describe, expect, it } from "vitest";
import { applyAction, createGame, getLegalActions, type GameState, type Target } from "@/game/engine";

const FILLER = "ink_blot";

function deck(n = 20, cardId = FILLER): string[] {
  return Array.from({ length: n }, () => cardId);
}

function startGame(seed = 99, hand: string[] = []): GameState {
  let s = createGame(seed, deck(), deck(), "A");
  s = applyAction(s, { type: "MULLIGAN", side: "A", uids: [] });
  s = applyAction(s, { type: "MULLIGAN", side: "B", uids: [] });
  s.players.A.hand = hand.map((cardId, i) => ({ uid: `h${i}`, cardId }));
  s.players.A.mana = 10;
  s.players.A.maxMana = 10;
  return s;
}

function play(state: GameState, handUid: string, target?: Target): GameState {
  return applyAction(state, { type: "PLAY_CARD", side: "A", uid: handUid, target });
}

function boardCards(s: GameState, side: "A" | "B"): string[] {
  return s.players[side].board.map((u) => u.cardId);
}

describe("wave 2 — units", () => {
  it("paper_airplane pings the enemy hero on play", () => {
    const s = startGame(1, ["paper_airplane"]);
    const hp = s.players.B.heroHp;
    const after = play(s, "h0");
    expect(after.players.B.heroHp).toBe(hp - 1);
  });

  it("glue_stick grants a friendly unit +0/+2", () => {
    let s = startGame(2, ["glue_stick"]);
    s.players.A.board = [
      { uid: "u1", cardId: "ink_blot", attack: 1, health: 2, maxHealth: 2, keywords: [], attacksLeft: 0, sick: true },
    ];
    const after = play(s, "h0", { uid: "u1" });
    expect(after.players.A.board[0].health).toBe(4);
    expect(after.players.A.board[0].attack).toBe(1);
  });

  it("typewriter_terror deals 2 to any target (unit)", () => {
    let s = startGame(3, ["typewriter_terror"]);
    s.players.B.board = [
      { uid: "e1", cardId: "ink_blot", attack: 1, health: 4, maxHealth: 4, keywords: [], attacksLeft: 0, sick: true },
    ];
    const after = play(s, "h0", { uid: "e1" });
    expect(after.players.B.board[0].health).toBe(2);
  });

  it("marginalia's Echo draws 1 on death", () => {
    let s = startGame(4, ["marginalia"]);
    s.players.A.board = [
      { uid: "u1", cardId: "marginalia", attack: 1, health: 3, maxHealth: 3, keywords: [], attacksLeft: 0, sick: true },
    ];
    const before = s.players.A.hand.length;
    s.players.B.board = [
      { uid: "e1", cardId: "inkwell_imp", attack: 3, health: 1, maxHealth: 1, keywords: [], attacksLeft: 1, sick: false },
    ];
    s.current = "B";
    s = applyAction(s, { type: "ATTACK", side: "B", attackerUid: "e1", target: { uid: "u1" } });
    expect(s.players.A.hand.length).toBe(before + 1);
  });

  it("sticky_note's Echo restores 2 HP to your hero", () => {
    let s = startGame(5, ["sticky_note"]);
    s.players.A.heroHp = 25;
    s.players.A.board = [
      { uid: "u1", cardId: "sticky_note", attack: 2, health: 6, maxHealth: 6, keywords: ["guard"], attacksLeft: 0, sick: true },
    ];
    s.players.B.board = [
      { uid: "e1", cardId: "inkwell_imp", attack: 8, health: 1, maxHealth: 1, keywords: [], attacksLeft: 1, sick: false },
    ];
    s.current = "B";
    s = applyAction(s, { type: "ATTACK", side: "B", attackerUid: "e1", target: { uid: "u1" } });
    expect(s.players.A.heroHp).toBe(27);
  });

  it("laminated_legend's Echo summons a 3/3 Ink Golem", () => {
    let s = startGame(6, ["laminated_legend"]);
    s.players.A.board = [
      { uid: "u1", cardId: "laminated_legend", attack: 5, health: 8, maxHealth: 8, keywords: ["guard"], attacksLeft: 0, sick: true },
    ];
    s.players.B.board = [
      { uid: "e1", cardId: "inkwell_imp", attack: 8, health: 1, maxHealth: 1, keywords: [], attacksLeft: 1, sick: false },
    ];
    s.current = "B";
    s = applyAction(s, { type: "ATTACK", side: "B", attackerUid: "e1", target: { uid: "u1" } });
    expect(boardCards(s, "A")).toContain("ink_golem");
  });

  it("the_red_thesaurus strikes twice (Swift + Twinstrike)", () => {
    let s = startGame(7, ["the_red_thesaurus"]);
    s.players.A.board = [
      { uid: "u1", cardId: "the_red_thesaurus", attack: 4, health: 4, maxHealth: 4, keywords: ["swift", "twinstrike"], attacksLeft: 2, sick: false },
    ];
    s.players.B.heroHp = 10;
    s = applyAction(s, { type: "ATTACK", side: "A", attackerUid: "u1", target: { hero: "B" } });
    s = applyAction(s, { type: "ATTACK", side: "A", attackerUid: "u1", target: { hero: "B" } });
    expect(s.players.B.heroHp).toBe(2);
    const legal = getLegalActions(s);
    expect(legal.attacks.find((a) => a.attackerUid === "u1")).toBeUndefined();
  });
});

describe("wave 2 — spells", () => {
  it("doodle summons a 1/1 Ghost Text", () => {
    const s = startGame(8, ["doodle"]);
    const after = play(s, "h0");
    expect(boardCards(after, "A")).toContain("ghost_text");
    const ghost = after.players.A.board.find((u) => u.cardId === "ghost_text");
    expect(ghost?.attack).toBe(1);
    expect(ghost?.health).toBe(1);
  });

  it("second_wind restores 4 HP", () => {
    let s = startGame(9, ["second_wind"]);
    s.players.A.heroHp = 20;
    const after = play(s, "h0");
    expect(after.players.A.heroHp).toBe(24);
  });

  it("margin_call hits all enemies and heals you", () => {
    let s = startGame(10, ["margin_call"]);
    s.players.A.heroHp = 25;
    s.players.B.board = [
      { uid: "e1", cardId: "ink_blot", attack: 1, health: 2, maxHealth: 2, keywords: [], attacksLeft: 0, sick: true },
      { uid: "e2", cardId: "ink_blot", attack: 1, health: 5, maxHealth: 5, keywords: [], attacksLeft: 0, sick: true },
    ];
    const after = play(s, "h0");
    expect(after.players.B.board).toHaveLength(2); // both survive 1 damage
    expect(after.players.B.board[0].health).toBe(1);
    expect(after.players.B.board[1].health).toBe(4);
    expect(after.players.A.heroHp).toBe(27);
  });

  it("plot_twist draws 2 and costs you 1 HP", () => {
    let s = startGame(11, ["plot_twist", "ink_blot", "red_pen"]);
    s.players.A.heroHp = 30;
    const after = play(s, "h0");
    expect(after.players.A.hand.length).toBe(4); // 3 in hand - 1 played + 2 drawn
    expect(after.players.A.heroHp).toBe(29);
  });

  it("fresh_page draws until you have 5 in hand", () => {
    let s = startGame(12, ["fresh_page", "ink_blot"]);
    s.players.A.hand = [{ uid: "h0", cardId: "fresh_page" }];
    const after = play(s, "h0");
    expect(after.players.A.hand.length).toBe(5); // -1 played, then filled to 5
  });

  it("ink_wash deals 4 to all enemy units", () => {
    let s = startGame(13, ["ink_wash"]);
    s.players.B.board = [
      { uid: "e1", cardId: "ink_blot", attack: 1, health: 2, maxHealth: 2, keywords: [], attacksLeft: 0, sick: true },
      { uid: "e2", cardId: "blotting_wall", attack: 0, health: 6, maxHealth: 6, keywords: ["guard"], attacksLeft: 0, sick: true },
    ];
    const after = play(s, "h0");
    expect(after.players.B.board).toHaveLength(1); // e1 died, e2 survives at 2
    expect(after.players.B.board[0].health).toBe(2);
  });

  it("the_second_printing summons two 3/3 Ink Golems", () => {
    const s = startGame(14, ["the_second_printing"]);
    const after = play(s, "h0");
    const golems = after.players.A.board.filter((u) => u.cardId === "ink_golem");
    expect(golems).toHaveLength(2);
    expect(golems[0].attack).toBe(3);
    expect(golems[0].health).toBe(3);
  });
});

describe("wave 3 — The Archive Set", () => {
  it("carbon_copy draws 1 on play", () => {
    let s = startGame(15, ["carbon_copy", "ink_blot"]);
    const after = play(s, "h0");
    expect(after.players.A.hand.length).toBe(2); // 1 other + 1 drawn
  });

  it("paper_dolls summons two 1/1 Scribbles on play", () => {
    const s = startGame(16, ["paper_dolls"]);
    const after = play(s, "h0");
    const scribbles = after.players.A.board.filter((u) => u.cardId === "scribble");
    expect(scribbles).toHaveLength(2);
  });

  it("sticker_swarm's Echo summons three 1/1 Scribbles", () => {
    let s = startGame(17, ["sticker_swarm"]);
    s.players.A.board = [
      { uid: "u1", cardId: "sticker_swarm", attack: 3, health: 3, maxHealth: 3, keywords: [], attacksLeft: 0, sick: true },
    ];
    s.players.B.board = [
      { uid: "e1", cardId: "the_unwritten", attack: 10, health: 10, maxHealth: 10, keywords: [], attacksLeft: 1, sick: false },
    ];
    s.current = "B";
    s = applyAction(s, { type: "ATTACK", side: "B", attackerUid: "e1", target: { uid: "u1" } });
    expect(boardCards(s, "A").filter((c) => c === "scribble")).toHaveLength(3);
  });

  it("fountain_pen_duelist deals 2 to a unit on play", () => {
    let s = startGame(18, ["fountain_pen_duelist"]);
    s.players.B.board = [
      { uid: "e1", cardId: "blotting_wall", attack: 0, health: 6, maxHealth: 6, keywords: ["guard"], attacksLeft: 0, sick: true },
    ];
    const after = play(s, "h0", { uid: "e1" });
    expect(after.players.B.board[0].health).toBe(4);
  });

  it("glue_gun_gunner buffs all friendlies +0/+1 on play (including itself)", () => {
    let s = startGame(19, ["glue_gun_gunner"]);
    s.players.A.board = [
      { uid: "u1", cardId: "ink_blot", attack: 1, health: 2, maxHealth: 2, keywords: [], attacksLeft: 0, sick: true },
    ];
    s.players.A.hand = [{ uid: "h0", cardId: "glue_gun_gunner" }];
    const after = play(s, "h0");
    expect(after.players.A.board[0].health).toBe(3);
    const gunner = after.players.A.board.find((u) => u.cardId === "glue_gun_gunner");
    expect(gunner?.health).toBe(6);
  });

  it("rubber_stamp_rebel deals 3 to the enemy hero on play", () => {
    let s = startGame(20, ["rubber_stamp_rebel"]);
    const hp = s.players.B.heroHp;
    const after = play(s, "h0");
    expect(after.players.B.heroHp).toBe(hp - 3);
  });

  it("accordion_file's Echo draws 2 on death", () => {
    let s = startGame(21, ["accordion_file"]);
    s.players.A.board = [
      { uid: "u1", cardId: "accordion_file", attack: 3, health: 7, maxHealth: 7, keywords: ["guard"], attacksLeft: 0, sick: true },
    ];
    s.players.B.board = [
      { uid: "e1", cardId: "the_unwritten", attack: 10, health: 10, maxHealth: 10, keywords: [], attacksLeft: 1, sick: false },
    ];
    const before = s.players.A.hand.length;
    s.current = "B";
    s = applyAction(s, { type: "ATTACK", side: "B", attackerUid: "e1", target: { uid: "u1" } });
    expect(s.players.A.hand.length).toBe(before + 2);
  });

  it("mimeograph_mage draws 3 on play", () => {
    let s = startGame(22, ["mimeograph_mage", "ink_blot", "red_pen", "paper_cut"]);
    const after = play(s, "h0");
    expect(after.players.A.hand.length).toBe(6); // 4 in hand - 1 played + 3 drawn
  });

  it("the_eraser_of_ends destroys a unit on play", () => {
    let s = startGame(23, ["the_eraser_of_ends"]);
    s.players.B.board = [
      { uid: "e1", cardId: "the_unwritten", attack: 10, health: 10, maxHealth: 10, keywords: [], attacksLeft: 0, sick: true },
    ];
    const after = play(s, "h0", { uid: "e1" });
    expect(after.players.B.board).toHaveLength(0);
  });

  it("the_overflowing_inkwell summons a golem and draws 3 on play", () => {
    let s = startGame(24, ["the_overflowing_inkwell", "ink_blot", "red_pen", "paper_cut"]);
    const after = play(s, "h0");
    expect(boardCards(after, "A")).toContain("ink_golem");
    expect(after.players.A.hand.length).toBe(6); // 4 in hand - 1 played + 3 drawn
  });

  it("the_collected_works' Echo draws 3 on death", () => {
    let s = startGame(25, ["the_collected_works"]);
    s.players.A.board = [
      { uid: "u1", cardId: "the_collected_works", attack: 9, health: 9, maxHealth: 9, keywords: ["guard"], attacksLeft: 0, sick: true },
    ];
    s.players.B.board = [
      { uid: "e1", cardId: "the_unwritten", attack: 10, health: 10, maxHealth: 10, keywords: [], attacksLeft: 1, sick: false },
    ];
    const before = s.players.A.hand.length;
    s.current = "B";
    s = applyAction(s, { type: "ATTACK", side: "B", attackerUid: "e1", target: { uid: "u1" } });
    // 10 atk kills the 9-hp works; Echo draws 3
    expect(s.players.A.hand.length).toBe(before + 3);
  });
});

describe("Archive Set — spells", () => {
  it("ink_drop deals 1 to any target", () => {
    let s = startGame(26, ["ink_drop"]);
    s.players.B.heroHp = 30;
    const after = play(s, "h0", { hero: "B" });
    expect(after.players.B.heroHp).toBe(29);
  });

  it("sticky_situation gives a friendly unit +0/+3", () => {
    let s = startGame(27, ["sticky_situation"]);
    s.players.A.board = [
      { uid: "u1", cardId: "ink_blot", attack: 1, health: 2, maxHealth: 2, keywords: [], attacksLeft: 0, sick: true },
    ];
    const after = play(s, "h0", { uid: "u1" });
    expect(after.players.A.board[0].health).toBe(5);
  });

  it("brainstorm draws 1 and gains 1 temporary mana", () => {
    let s = startGame(28, ["brainstorm", "ink_blot"]);
    s.players.A.mana = 5;
    s.players.A.maxMana = 5;
    const after = play(s, "h0");
    expect(after.players.A.hand.length).toBe(2); // 1 other + 1 drawn
    expect(after.players.A.mana).toBe(4); // 5 - 2 cost + 1 temp
    expect(after.players.A.tempMana).toBe(1);
  });

  it("erase_and_redraw destroys a friendly unit and draws 3", () => {
    let s = startGame(29, ["erase_and_redraw", "ink_blot", "red_pen", "paper_cut", "blank_page"]);
    s.players.A.board = [
      { uid: "u1", cardId: "graphite_golem", attack: 2, health: 3, maxHealth: 3, keywords: [], attacksLeft: 0, sick: true },
    ];
    const after = play(s, "h0", { uid: "u1" });
    expect(after.players.A.board).toHaveLength(0);
    expect(after.players.A.hand.length).toBe(7); // 5 in hand - 1 played + 3 drawn
  });

  it("wax_seal grants +2/+1 and Twinstrike", () => {
    let s = startGame(30, ["wax_seal"]);
    s.players.A.board = [
      { uid: "u1", cardId: "ink_blot", attack: 1, health: 2, maxHealth: 2, keywords: [], attacksLeft: 0, sick: true },
    ];
    const after = play(s, "h0", { uid: "u1" });
    const u = after.players.A.board[0];
    expect(u.attack).toBe(3);
    expect(u.health).toBe(3);
    expect(u.keywords).toContain("twinstrike");
  });

  it("paper_shredder deals 5 to a unit", () => {
    let s = startGame(31, ["paper_shredder"]);
    s.players.B.board = [
      { uid: "e1", cardId: "the_unwritten", attack: 10, health: 10, maxHealth: 10, keywords: [], attacksLeft: 0, sick: true },
    ];
    const after = play(s, "h0", { uid: "e1" });
    expect(after.players.B.board[0].health).toBe(5);
  });

  it("red_letter_day deals 3 to the enemy hero and draws 1", () => {
    let s = startGame(32, ["red_letter_day", "ink_blot"]);
    const after = play(s, "h0");
    expect(after.players.B.heroHp).toBe(27);
    expect(after.players.A.hand.length).toBe(2); // 2 in hand - 1 played + 1 drawn
  });

  it("fools_cap gains 2 temporary mana and draws 1", () => {
    let s = startGame(33, ["fools_cap", "ink_blot"]);
    s.players.A.mana = 6;
    s.players.A.maxMana = 6;
    const after = play(s, "h0");
    expect(after.players.A.mana).toBe(4); // 6 - 4 cost + 2 temp
    expect(after.players.A.tempMana).toBe(2);
    expect(after.players.A.hand.length).toBe(2); // 1 other + 1 drawn
  });

  it("wide_margin_victory hits all enemies and the hero", () => {
    let s = startGame(34, ["wide_margin_victory"]);
    s.players.B.board = [
      { uid: "e1", cardId: "ink_blot", attack: 1, health: 2, maxHealth: 2, keywords: [], attacksLeft: 0, sick: true },
      { uid: "e2", cardId: "blotting_wall", attack: 0, health: 6, maxHealth: 6, keywords: ["guard"], attacksLeft: 0, sick: true },
    ];
    const after = play(s, "h0");
    expect(after.players.B.board).toHaveLength(1); // e1 died, e2 survives at 3
    expect(after.players.B.board[0].health).toBe(3);
    expect(after.players.B.heroHp).toBe(28);
  });

  it("reinforced_margins gives all friendlies +0/+3", () => {
    let s = startGame(35, ["reinforced_margins"]);
    s.players.A.board = [
      { uid: "u1", cardId: "ink_blot", attack: 1, health: 2, maxHealth: 2, keywords: [], attacksLeft: 0, sick: true },
      { uid: "u2", cardId: "page_knight", attack: 1, health: 4, maxHealth: 4, keywords: ["guard"], attacksLeft: 0, sick: true },
    ];
    const after = play(s, "h0");
    expect(after.players.A.board[0].health).toBe(5);
    expect(after.players.A.board[1].health).toBe(7);
  });

  it("signing_bonus heals 6 and grants 2 temporary mana", () => {
    let s = startGame(36, ["signing_bonus"]);
    s.players.A.heroHp = 20;
    s.players.A.mana = 5;
    s.players.A.maxMana = 5;
    const after = play(s, "h0");
    expect(after.players.A.heroHp).toBe(26);
    expect(after.players.A.mana).toBe(2); // 5 - 5 cost + 2 temp
    expect(after.players.A.tempMana).toBe(2);
  });

  it("the_long_letter draws 4 and costs 2 HP", () => {
    let s = startGame(37, ["the_long_letter", "ink_blot", "red_pen", "paper_cut", "blank_page"]);
    s.players.A.heroHp = 30;
    const after = play(s, "h0");
    expect(after.players.A.hand.length).toBe(8); // 5 in hand - 1 played + 4 drawn
    expect(after.players.A.heroHp).toBe(28);
  });

  it("red_ink_flood deals 5 to all enemy units", () => {
    let s = startGame(38, ["red_ink_flood"]);
    s.players.B.board = [
      { uid: "e1", cardId: "the_unwritten", attack: 10, health: 10, maxHealth: 10, keywords: [], attacksLeft: 0, sick: true },
      { uid: "e2", cardId: "ink_blot", attack: 1, health: 2, maxHealth: 2, keywords: [], attacksLeft: 0, sick: true },
    ];
    const after = play(s, "h0");
    expect(after.players.B.board).toHaveLength(1);
    expect(after.players.B.board[0].health).toBe(5);
  });

  it("final_notice deals 8 to the enemy hero", () => {
    let s = startGame(39, ["final_notice"]);
    s.players.B.heroHp = 20;
    const after = play(s, "h0");
    expect(after.players.B.heroHp).toBe(12);
  });

  it("the_second_edition: AoE 5, draw 3, summon an Ink Golem", () => {
    let s = startGame(40, ["the_second_edition", "ink_blot", "red_pen", "paper_cut", "blank_page"]);
    s.players.B.board = [
      { uid: "e1", cardId: "ink_blot", attack: 1, health: 2, maxHealth: 2, keywords: [], attacksLeft: 0, sick: true },
      { uid: "e2", cardId: "blotting_wall", attack: 0, health: 6, maxHealth: 6, keywords: ["guard"], attacksLeft: 0, sick: true },
    ];
    const after = play(s, "h0");
    expect(after.players.B.board).toHaveLength(1); // e1 died, e2 survives at 1
    expect(after.players.B.board[0].health).toBe(1);
    expect(boardCards(after, "A")).toContain("ink_golem");
    expect(after.players.A.hand.length).toBe(7); // 5 in hand - 1 played + 3 drawn
  });
});
