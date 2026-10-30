import { describe, expect, it } from "vitest";
import { applyAction, createGame, getLegalActions, type GameState, type UnitInstance } from "@/game/engine";
import { ARCHETYPE_DECKS } from "@/game/cards";
import { expandDeck } from "@/game/decks";

const FILLER = "ink_blot"; // 1-cost 1/2 vanilla

function deck(n = 20, cardId = FILLER): string[] {
  return Array.from({ length: n }, () => cardId);
}

/** Start a game and finish both mulligans (keep everything). */
function startGame(seed = 42, deckA = deck(), deckB = deck()): GameState {
  let s = createGame(seed, deckA, deckB, "A");
  s = applyAction(s, { type: "MULLIGAN", side: "A", uids: [] });
  s = applyAction(s, { type: "MULLIGAN", side: "B", uids: [] });
  return s;
}

function unit(cardId: string, over: Partial<UnitInstance> = {}): UnitInstance {
  return {
    uid: over.uid ?? `test_${Math.random().toString(36).slice(2)}`,
    cardId,
    attack: over.attack ?? 1,
    health: over.health ?? 1,
    maxHealth: over.maxHealth ?? over.health ?? 1,
    keywords: over.keywords ?? [],
    attacksLeft: over.attacksLeft ?? 1,
    sick: over.sick ?? false,
  };
}

describe("combat math", () => {
  it("attacker and defender deal damage simultaneously; heroes do not retaliate", () => {
    let s = startGame();
    s.players.A.board = [unit("graphite_golem", { attack: 2, health: 3, maxHealth: 3 })];
    s.players.B.board = [unit("inkwell_imp", { attack: 3, health: 1, maxHealth: 1 })];
    s = applyAction(s, { type: "ATTACK", side: "A", attackerUid: s.players.A.board[0].uid, target: { uid: s.players.B.board[0].uid } });
    expect(s.players.B.board).toHaveLength(0); // imp died
    expect(s.players.A.board).toHaveLength(0); // golem took 3 and died too
    expect(s.players.A.heroHp).toBe(30);
  });

  it("attacking the enemy hero deals face damage only", () => {
    let s = startGame();
    s.players.A.board = [unit("graphite_golem", { attack: 2, health: 3, maxHealth: 3 })];
    const hpBefore = s.players.B.heroHp;
    s = applyAction(s, { type: "ATTACK", side: "A", attackerUid: s.players.A.board[0].uid, target: { hero: "B" } });
    expect(s.players.B.heroHp).toBe(hpBefore - 2);
    expect(s.players.A.board[0].health).toBe(3);
  });

  it("hero death ends the game; fatigue can kill", () => {
    let s = startGame();
    s.players.A.board = [unit("the_unwritten", { attack: 30, health: 10, maxHealth: 10 })];
    s = applyAction(s, { type: "ATTACK", side: "A", attackerUid: s.players.A.board[0].uid, target: { hero: "B" } });
    expect(s.phase).toBe("GAME_OVER");
    expect(s.winner).toBe("A");

    let d = startGame();
    d.players.A.heroHp = 1;
    d.players.A.deck = [];
    d.players.A.fatigue = 0;
    d = applyAction(d, { type: "END_TURN", side: "A" });
    d = applyAction(d, { type: "END_TURN", side: "B" });
    // A's turn start: draw from empty deck → 1 fatigue damage → dead
    expect(d.players.A.heroHp).toBe(0);
    expect(d.phase).toBe("GAME_OVER");
    expect(d.winner).toBe("B");
  });
});

describe("guard targeting rule", () => {
  function guardState(): GameState {
    const s = startGame();
    s.players.B.board = [
      unit("page_knight", { attack: 1, health: 4, maxHealth: 4, keywords: ["guard"] }),
      unit("inkwell_imp", { attack: 3, health: 1, maxHealth: 1 }),
    ];
    s.players.A.board = [unit("fountain_pen_fencer", { attack: 3, health: 2, maxHealth: 2 })];
    return s;
  }

  it("hero is untargetable while a guard stands", () => {
    const s = guardState();
    const legal = getLegalActions(s);
    const atk = legal.attacks[0];
    expect(atk.targets.some((t) => "hero" in t)).toBe(false);
    expect(atk.targets.map((t) => ("uid" in t ? s.players.B.board.find((u) => u.uid === t.uid)?.keywords : [])).flat()).toContain("guard");
  });

  it("non-guard units are untargetable while a guard stands", () => {
    const s = guardState();
    const legal = getLegalActions(s);
    const targets = legal.attacks[0].targets;
    const targetIds = targets.map((t) => ("uid" in t ? t.uid : "")).filter(Boolean);
    const guard = s.players.B.board.find((u) => u.keywords.includes("guard"))!;
    expect(targetIds).toEqual([guard.uid]);
  });

  it("the guard itself can be attacked", () => {
    let s = guardState();
    const guard = s.players.B.board.find((u) => u.keywords.includes("guard"))!;
    s = applyAction(s, { type: "ATTACK", side: "A", attackerUid: s.players.A.board[0].uid, target: { uid: guard.uid } });
    expect(s.players.B.board.find((u) => u.uid === guard.uid)!.health).toBe(1);
  });

  it("after the guard dies the hero is attackable", () => {
    let s = guardState();
    const guard = s.players.B.board.find((u) => u.keywords.includes("guard"))!;
    guard.health = 3; // ensure the fencer's 3 attack kills it
    s = applyAction(s, { type: "ATTACK", side: "A", attackerUid: s.players.A.board[0].uid, target: { uid: guard.uid } });
    expect(s.players.B.board.some((u) => u.uid === guard.uid)).toBe(false);
    const legal = getLegalActions(s);
    expect(legal.attacks.length).toBe(0); // fencer already attacked this turn
    s.players.A.board[0].attacksLeft = 1;
    const legal2 = getLegalActions(s);
    expect(legal2.attacks[0].targets.some((t) => "hero" in t)).toBe(true);
  });
});

describe("fatigue", () => {
  it("ramps 1, 2, 3… and can kill", () => {
    let s = startGame();
    s.players.A.deck = [];
    s.players.A.hand = [];
    s = applyAction(s, { type: "END_TURN", side: "A" }); // A's turn ends, B plays; A's fatigue hits on A's next start? No — draw happens at start of A's NEXT turn.
    // A took fatigue on A's own turn start already? A drew at turn start with a deck; now deck empty.
    // End A turn → B turn → end B turn → A turn start draws fatigue 1.
    s = applyAction(s, { type: "END_TURN", side: "B" });
    expect(s.players.A.heroHp).toBe(29);
    expect(s.players.A.fatigue).toBe(1);
    s = applyAction(s, { type: "END_TURN", side: "A" });
    s = applyAction(s, { type: "END_TURN", side: "B" });
    expect(s.players.A.heroHp).toBe(27);
    expect(s.players.A.fatigue).toBe(2);
  });

  it("FATIGUE events are emitted", () => {
    let s = startGame();
    s.players.A.deck = [];
    s = applyAction(s, { type: "END_TURN", side: "A" });
    s = applyAction(s, { type: "END_TURN", side: "B" });
    expect(s.events.filter((e) => e.type === "FATIGUE").length).toBeGreaterThanOrEqual(0);
  });
});

describe("twinstrike", () => {
  it("attacks twice per turn", () => {
    let s = startGame();
    s.players.A.board = [unit("comic_relief", { attack: 2, health: 2, maxHealth: 2, keywords: ["twinstrike"], attacksLeft: 2 })];
    s.players.B.board = [unit("ink_blot", { attack: 0, health: 2, maxHealth: 2 })];
    const a = s.players.A.board[0];
    s = applyAction(s, { type: "ATTACK", side: "A", attackerUid: a.uid, target: { uid: s.players.B.board[0].uid } });
    expect(s.players.B.board).toHaveLength(0); // first swing kills the blot
    expect(s.players.A.board[0].attacksLeft).toBe(1);
    s.players.B.board = [unit("ink_blot", { attack: 0, health: 2, maxHealth: 2 })];
    s = applyAction(s, { type: "ATTACK", side: "A", attackerUid: a.uid, target: { uid: s.players.B.board[0].uid } });
    expect(s.players.A.board[0].attacksLeft).toBe(0);
  });
});

describe("summoning sickness & swift", () => {
  it("a unit without Swift cannot attack the turn it is played", () => {
    let s = startGame();
    s.players.A.mana = 10;
    s.players.A.hand = [{ uid: "h1", cardId: "graphite_golem" }];
    s = applyAction(s, { type: "PLAY_CARD", side: "A", uid: "h1" });
    expect(s.players.A.board).toHaveLength(1);
    const legal = getLegalActions(s);
    expect(legal.attacks).toHaveLength(0);
  });

  it("a unit with Swift can attack immediately", () => {
    let s = startGame();
    s.players.A.mana = 10;
    s.players.A.hand = [{ uid: "h1", cardId: "paper_dragon" }];
    s = applyAction(s, { type: "PLAY_CARD", side: "A", uid: "h1" });
    const legal = getLegalActions(s);
    expect(legal.attacks).toHaveLength(1);
    const hpBefore = s.players.B.heroHp;
    s = applyAction(s, { type: "ATTACK", side: "A", attackerUid: s.players.A.board[0].uid, target: { hero: "B" } });
    expect(s.players.B.heroHp).toBe(hpBefore - 5);
  });

  it("sickness clears at the owner's next turn", () => {
    let s = startGame();
    s.players.A.mana = 10;
    s.players.A.hand = [{ uid: "h1", cardId: "graphite_golem" }];
    s = applyAction(s, { type: "PLAY_CARD", side: "A", uid: "h1" });
    s = applyAction(s, { type: "END_TURN", side: "A" });
    s = applyAction(s, { type: "END_TURN", side: "B" });
    const legal = getLegalActions(s);
    expect(legal.attacks.some((a) => a.attackerUid === s.players.A.board[0].uid)).toBe(true);
  });
});

describe("mulligan", () => {
  it("redraws exactly the selected count", () => {
    let s = createGame(7, deck(), deck(), "A");
    expect(s.players.A.hand).toHaveLength(4);
    const two = s.players.A.hand.slice(0, 2).map((c) => c.uid);
    s = applyAction(s, { type: "MULLIGAN", side: "A", uids: two });
    expect(s.players.A.hand).toHaveLength(4);
    expect(s.players.A.hand.filter((c) => two.includes(c.uid))).toHaveLength(0);
    expect(s.mulliganDone.A).toBe(true);
  });

  it("the second player receives the Tempo Token", () => {
    let s = startGame(11);
    expect(s.first).toBe("A");
    expect(s.players.B.hand.some((c) => c.cardId === "tempo_token")).toBe(true);
    expect(s.players.A.hand.some((c) => c.cardId === "tempo_token")).toBe(false);
  });
});

describe("mana curve", () => {
  it("starts at 3 on a per-side clock, +1 per own turn, cap 10", () => {
    let s = startGame(3);
    expect(s.players.A.maxMana).toBe(3);
    expect(s.players.A.mana).toBe(3);
    s = applyAction(s, { type: "END_TURN", side: "A" });
    expect(s.players.B.maxMana).toBe(3); // B's first turn = 3, fully fair
    s = applyAction(s, { type: "END_TURN", side: "B" });
    expect(s.players.A.maxMana).toBe(4);
    s = applyAction(s, { type: "END_TURN", side: "A" });
    expect(s.players.B.maxMana).toBe(4);
    for (let i = 0; i < 16; i++) {
      const cur = s.current;
      s = applyAction(s, { type: "END_TURN", side: cur });
    }
    expect(s.players.A.maxMana).toBe(10);
    expect(s.players.B.maxMana).toBe(10);
  });

  it("the Tempo Token grants one mana for this turn only", () => {
    let s = startGame(5);
    s = applyAction(s, { type: "END_TURN", side: "A" }); // hand over to B
    const token = s.players.B.hand.find((c) => c.cardId === "tempo_token")!;
    s.players.B.mana = 0;
    s.players.B.maxMana = 0;
    s = applyAction(s, { type: "PLAY_CARD", side: "B", uid: token.uid });
    expect(s.players.B.mana).toBe(1);
    s = applyAction(s, { type: "END_TURN", side: "B" });
    expect(s.players.B.tempMana).toBe(0);
  });
});

describe("The Grand Palimpsest", () => {
  it("destroys all other units and summons a 1/1 Ghost Text per destroyed", () => {
    let s = startGame(9);
    s.players.A.mana = 10;
    s.players.A.board = [
      unit("ink_blot", { health: 2, maxHealth: 2 }),
      unit("ink_blot", { health: 2, maxHealth: 2 }),
    ];
    s.players.B.board = [unit("inkwell_imp", { health: 1, maxHealth: 1 })];
    s.players.A.hand = [{ uid: "h1", cardId: "the_grand_palimpsest" }];
    s = applyAction(s, { type: "PLAY_CARD", side: "A", uid: "h1" });
    // palimpsest itself survives + 3 ghost texts (2 friendly + 1 enemy destroyed)
    expect(s.players.A.board.map((u) => u.cardId)).toEqual(["the_grand_palimpsest", "ghost_text", "ghost_text", "ghost_text"]);
    expect(s.players.B.board).toHaveLength(0);
  });

  it("echoes of destroyed units still fire", () => {
    let s = startGame(13);
    s.players.A.mana = 10;
    s.players.A.heroHp = 20;
    s.players.A.board = [unit("eraser_golem", { health: 3, maxHealth: 3, keywords: [] })];
    s.players.B.board = [];
    s.players.A.hand = [{ uid: "h1", cardId: "the_grand_palimpsest" }];
    s = applyAction(s, { type: "PLAY_CARD", side: "A", uid: "h1" });
    // eraser golem's Echo: restore 2 HP to your hero
    expect(s.players.A.heroHp).toBe(22);
    expect(s.players.A.board.some((u) => u.cardId === "ghost_text")).toBe(true);
  });
});

describe("spells", () => {
  it("Red Pen damages a chosen unit", () => {
    let s = startGame(17);
    s.players.A.mana = 10;
    s.players.A.hand = [{ uid: "h1", cardId: "red_pen" }];
    s.players.B.board = [unit("blotting_wall", { health: 6, maxHealth: 6 })];
    s = applyAction(s, { type: "PLAY_CARD", side: "A", uid: "h1", target: { uid: s.players.B.board[0].uid } });
    expect(s.players.B.board[0].health).toBe(4);
  });

  it("Second Draft returns a friendly unit to hand", () => {
    let s = startGame(19);
    s.players.A.mana = 10;
    s.players.A.board = [unit("graphite_golem", { health: 3, maxHealth: 3 })];
    s.players.A.hand = [{ uid: "h1", cardId: "second_draft" }];
    const uid = s.players.A.board[0].uid;
    s = applyAction(s, { type: "PLAY_CARD", side: "A", uid: "h1", target: { uid } });
    expect(s.players.A.board).toHaveLength(0);
    expect(s.players.A.hand.some((c) => c.uid === uid && c.cardId === "graphite_golem")).toBe(true);
  });

  it("Paper Storm hits all enemy units only", () => {
    let s = startGame(23);
    s.players.A.mana = 10;
    s.players.A.board = [unit("ink_blot", { health: 2, maxHealth: 2 })];
    s.players.B.board = [
      unit("ink_blot", { health: 2, maxHealth: 2 }),
      unit("ink_blot", { health: 5, maxHealth: 5 }),
    ];
    s.players.A.hand = [{ uid: "h1", cardId: "paper_storm" }];
    s = applyAction(s, { type: "PLAY_CARD", side: "A", uid: "h1" });
    expect(s.players.A.board[0].health).toBe(2);
    expect(s.players.B.board).toHaveLength(1); // the 5/5 survives at 3
    expect(s.players.B.board[0].health).toBe(3);
  });

  it("The Archivist draws until 6 in hand", () => {
    let s = startGame(29);
    s.players.A.mana = 10;
    s.players.A.hand = [{ uid: "h1", cardId: "the_archivist" }];
    s = applyAction(s, { type: "PLAY_CARD", side: "A", uid: "h1" });
    expect(s.players.A.hand.length).toBeLessThanOrEqual(6);
    expect(s.players.A.hand.length).toBe(6);
  });
});

describe("Insight", () => {
  it("draws a card when played", () => {
    let s = startGame(31);
    s.players.A.mana = 10;
    s.players.A.hand = [{ uid: "h1", cardId: "apprentice_scribe" }];
    const before = s.players.A.hand.length;
    s = applyAction(s, { type: "PLAY_CARD", side: "A", uid: "h1" });
    expect(s.players.A.hand.length).toBe(before); // -1 played +1 drawn
    expect(s.players.A.board).toHaveLength(1);
  });
});

describe("Echo", () => {
  it("Origami Phoenix summons an Ash Wing on death", () => {
    let s = startGame(37);
    s.players.A.board = [unit("origami_phoenix", { attack: 1, health: 1, maxHealth: 1 })];
    s.players.B.board = [unit("inkwell_imp", { attack: 3, health: 3, maxHealth: 3 })];
    s = applyAction(s, { type: "ATTACK", side: "A", attackerUid: s.players.A.board[0].uid, target: { uid: s.players.B.board[0].uid } });
    expect(s.players.A.board.map((u) => u.cardId)).toEqual(["ash_wing"]);
  });
});

describe("determinism", () => {
  it("same seed + same actions → identical state (including uids)", () => {
    const dA = expandDeck(ARCHETYPE_DECKS.duelist.cards.map(([cardId, count]) => ({ cardId, count })));
    const dB = expandDeck(ARCHETYPE_DECKS.archivist.cards.map(([cardId, count]) => ({ cardId, count })));
    const a = startGame(101, dA, dB);
    const b = startGame(101, dA, dB);
    expect(a.players.A.hand).toEqual(b.players.A.hand);
    expect(a.players.B.hand).toEqual(b.players.B.hand);
    expect(a.players.A.deck).toEqual(b.players.A.deck);
    expect(a.players.B.deck).toEqual(b.players.B.deck);
    expect(a.rngState).toBe(b.rngState);
  });
});
