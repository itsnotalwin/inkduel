/**
 * Area system tests (MULTIPLAYER-safe: areas flow through actions, so tapes
 * and replays stay deterministic). Same direct-state setup as wave tests.
 */
import { describe, expect, it } from "vitest";
import { applyAction, createGame, type GameState } from "@/game/engine";
import type { Keyword } from "@/game/cards";

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

function play(state: GameState, handUid: string, target?: { uid: string }): GameState {
  return applyAction(state, { type: "PLAY_CARD", side: "A", uid: handUid, target });
}

function unit(
  cardId: string,
  over: Partial<{ attack: number; health: number; maxHealth: number }> = {},
): GameState["players"]["A"]["board"][number] {
  const health = over.health ?? 2;
  return {
    uid: Math.random().toString(36).slice(2, 8),
    cardId,
    attack: over.attack ?? 1,
    health,
    maxHealth: over.maxHealth ?? health,
    keywords: [] as Keyword[],
    attacksLeft: 0,
    sick: true,
  };
}

describe("areas", () => {
  it("playing an area sets the slot, costs mana, and never touches the board", () => {
    let s = startGame(1, ["drafting_table"]);
    const after = play(s, "h0");
    expect(after.areas.A).toBe("drafting_table");
    expect(after.areas.B).toBeNull();
    expect(after.players.A.board).toHaveLength(0);
    expect(after.players.A.mana).toBe(10 - 4);
    expect(after.players.A.hand).toHaveLength(0);
  });

  it("replaces the old area and reports it", () => {
    let s = startGame(2, ["drafting_table", "the_ink_well"]);
    s = play(s, "h0");
    s = play(s, "h1");
    expect(s.areas.A).toBe("the_ink_well");
    expect(s.events.some((e) => e.type === "AREA_REPLACED" && e.cardId === "drafting_table")).toBe(true);
  });

  it("drafting_table grants +1 temporary mana at your turn start", () => {
    let s = startGame(3, ["drafting_table"]);
    s = play(s, "h0");
    // pass the turn twice so side A starts a fresh turn with the area out
    s = applyAction(s, { type: "END_TURN", side: "A" });
    s = applyAction(s, { type: "END_TURN", side: "B" });
    // side A's second turn: base 4 mana + 1 from the table
    expect(s.players.A.maxMana).toBe(4);
    expect(s.players.A.mana).toBe(5);
  });

  it("the_ink_well pings each enemy unit when your turn ends", () => {
    let s = startGame(4, ["the_ink_well"]);
    s = play(s, "h0");
    s.players.B.board = [
      unit("paper_swan", { attack: 2, health: 1, maxHealth: 1 }),
      unit("graphite_golem", { attack: 2, health: 3, maxHealth: 3 }),
    ];
    const after = applyAction(s, { type: "END_TURN", side: "A" });
    // the swan dies to the end-of-turn ping, the golem survives at 2
    expect(after.players.B.board).toHaveLength(1);
    expect(after.players.B.board[0].health).toBe(2);
  });

  it("guild_desk greets summoned units with +1 attack", () => {
    let s = startGame(5, ["guild_desk", "paper_swan"]);
    s = play(s, "h0");
    s = play(s, "h1");
    const swan = s.players.A.board.find((u) => u.cardId === "paper_swan");
    expect(swan?.attack).toBe(3); // 2 + 1 from the desk
  });

  it("reading_room heals your hero at the end of your turn", () => {
    let s = startGame(6, ["reading_room"]);
    s.players.A.heroHp = 20;
    s = play(s, "h0");
    const after = applyAction(s, { type: "END_TURN", side: "A" });
    expect(after.players.A.heroHp).toBe(22);
  });

  it("sealed_wing pings the enemy hero at the end of your turn", () => {
    let s = startGame(7, ["sealed_wing"]);
    s = play(s, "h0");
    const before = s.players.B.heroHp;
    const after = applyAction(s, { type: "END_TURN", side: "A" });
    expect(after.players.B.heroHp).toBe(before - 1);
  });

  it("is deterministic: two identical games produce identical area states", () => {
    const a = startGame(42, ["drafting_table"]);
    const b = startGame(42, ["drafting_table"]);
    const pa = play(a, "h0");
    const pb = play(b, "h0");
    expect(pb.areas).toEqual(pa.areas);
    expect(JSON.stringify(pb.players.A.mana)).toBe(JSON.stringify(pa.players.A.mana));
  });
});
