/**
 * Per-effect tests for wave-4 cards ("The Uncatalogued") — same direct-state
 * setup pattern as wave-effects.test.ts.
 */
import { describe, expect, it } from "vitest";
import { applyAction, createGame, type GameState, type Target } from "@/game/engine";

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

function unit(cardId: string, over: Partial<{ attack: number; health: number; maxHealth: number }> = {}) {
  const health = over.health ?? 2;
  return {
    uid: Math.random().toString(36).slice(2, 8),
    cardId,
    attack: over.attack ?? 1,
    health,
    maxHealth: over.maxHealth ?? health,
    keywords: [],
    attacksLeft: 0,
    sick: true,
  };
}

function boardCards(s: GameState, side: "A" | "B"): string[] {
  return s.players[side].board.map((u) => u.cardId);
}

describe("wave 4 — the uncatalogued", () => {
  it("margin_note draws a card", () => {
    const s = startGame(2, ["margin_note", "red_pen"]);
    const after = play(s, "h0");
    expect(after.players.A.hand).toHaveLength(2); // -note +draw leaves the red pen
  });

  it("the_great_blot sweeps the enemy board and summons two Blots", () => {
    let s = startGame(3, ["the_great_blot"]);
    s.players.B.board = [
      unit("paper_swan", { attack: 2, health: 1, maxHealth: 1 }),
      unit("blotting_wall", { attack: 3, health: 5, maxHealth: 5 }),
    ];
    const after = play(s, "h0");
    expect(after.players.B.board).toHaveLength(1); // the swan (1 hp) dies
    expect(after.players.B.board[0].health).toBe(2); // the wall takes 3 of 5
    expect(boardCards(after, "A").filter((c) => c === "blot")).toHaveLength(2);
  });

  it("recalled_edition bounces a friendly unit and draws", () => {
    let s = startGame(4, ["recalled_edition"]);
    s.players.A.board = [unit("fountain_pen_fencer", { attack: 3, health: 2, maxHealth: 2 })];
    const after = play(s, "h0", { uid: s.players.A.board[0].uid });
    expect(after.players.A.board).toHaveLength(0);
    expect(after.players.A.hand.some((c) => c.cardId === "fountain_pen_fencer")).toBe(true);
    expect(after.players.A.hand).toHaveLength(2); // the fencer + the drawn card
  });

  it("erasure_wave hits only the enemy board", () => {
    let s = startGame(5, ["erasure_wave"]);
    s.players.A.board = [unit("ink_blot", { health: 3, maxHealth: 3 })];
    s.players.B.board = [
      unit("paper_swan", { health: 1, maxHealth: 1 }),
      unit("ink_blot", { health: 3, maxHealth: 3 }),
    ];
    const after = play(s, "h0");
    expect(after.players.A.board).toHaveLength(1);
    expect(after.players.A.board[0].health).toBe(3);
    expect(after.players.B.board).toHaveLength(0); // 3 damage kills everything on 3 or less
  });

  it("ink_drinker wounds its own hero on echo", () => {
    let s = startGame(6, ["ink_drinker"]);
    s = play(s, "h0");
    const drinker = s.players.A.board.find((u) => u.cardId === "ink_drinker");
    expect(drinker).toBeTruthy();
    // pass the turn, then the enemy destroys it — the echo fires on the owner's hero
    s = applyAction(s, { type: "END_TURN", side: "A" });
    s.players.B.hand = [{ uid: "bx", cardId: "editors_verdict" }];
    s.players.B.mana = 10;
    s.players.B.maxMana = 10;
    const after = applyAction(s, { type: "PLAY_CARD", side: "B", uid: "bx", target: { uid: drinker!.uid } });
    expect(after.players.A.board.some((u) => u.cardId === "ink_drinker")).toBe(false);
    expect(after.players.A.heroHp).toBe(27);
  });

  it("the_second_blot sweeps and heals", () => {
    let s = startGame(7, ["the_second_blot"]);
    s.players.A.heroHp = 20;
    s.players.B.board = [unit("paper_swan", { health: 2, maxHealth: 2 }), unit("blotting_wall", { health: 6, maxHealth: 6 })];
    const after = play(s, "h0");
    expect(after.players.A.heroHp).toBe(23);
    expect(after.players.B.board).toHaveLength(1); // the swan dies to 4, the wall survives at 2
  });

  it("ink_stain summons two Scribbles when it dies", () => {
    let s = startGame(8, ["ink_stain"]);
    s = play(s, "h0");
    expect(boardCards(s, "A")).toContain("ink_stain");
    // pass the turn, then the enemy destroys it — the echo floods the board
    s = applyAction(s, { type: "END_TURN", side: "A" });
    s.players.B.hand = [{ uid: "bx", cardId: "editors_verdict" }];
    s.players.B.mana = 10;
    s.players.B.maxMana = 10;
    const stain = s.players.A.board.find((u) => u.cardId === "ink_stain");
    const after = applyAction(s, { type: "PLAY_CARD", side: "B", uid: "bx", target: { uid: stain!.uid } });
    const scribbles = boardCards(after, "A").filter((c) => c === "scribble");
    expect(scribbles).toHaveLength(2);
    expect(after.players.A.board.some((u) => u.cardId === "ink_stain")).toBe(false);
  });
});
