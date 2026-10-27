# Card Effect Verification Checklist

Acceptance criterion #3 — "All 40 cards playable; every effect verified."
Verified via `npx vitest run` (41 tests), `npx tsx scripts/simulate.ts` (200 headless
games with zero illegal actions), and interactive browser play.

## Keywords

| Keyword | Rule | Verified by |
|---|---|---|
| GUARD | Enemies must attack Guards first; hero locked while a Guard stands | `tests/engine.test.ts` — guard targeting rule (4 tests) |
| SWIFT | Can attack the turn it's played | summoning sickness & swift (3 tests) |
| TWINSTRIKE | Attacks twice per turn | twinstrike test |
| INSIGHT | Draw 1 when played | Insight test (apprentice_scribe) |
| ECHO | Triggers when destroyed, cascades correctly | Grand Palimpsest echo test, Origami Phoenix test |

## Effect primitives

| Primitive | Cards | Verified |
|---|---|---|
| DEAL_DAMAGE unit | red_pen | Red Pen test |
| DEAL_DAMAGE any | paper_cut, pressure_stamp, stencil_archer, blot_out | UI targeting + AI simulations |
| DEAL_DAMAGE allEnemyUnits | crumpled_note, ink_mage, paper_storm | Paper Storm test |
| DEAL_DAMAGE enemyHero / ownHero | acceptance_stamp | sim + browser play |
| DRAW n | blank_page, the_calligrapher, pressure_stamp, the_living_manuscript (echo) | Calligrapher path in sims; Archivist test |
| DRAW_UNTIL | the_archivist | "draws until 8 in hand" test |
| BUFF chosenFriendly | fresh_ink, sharpened_pencil (+Swift), lamination (+Guard) | browser play + sims |
| BUFF adjacentFriendly | quill_sergeant | sims (buffs neighbors, not self) |
| BUFF allFriendly | foreword | sims |
| DESTROY unit/any | editors_verdict | sims (archivist removal policy) |
| DESTROY allOtherUnits + SUMMON perDestroyed | the_grand_palimpsest | dedicated tests (wipe + ghost texts + echoes fire) |
| RETURN_TO_HAND | second_draft | Second Draft test |
| HEAL_HERO | eraser_golem (echo) | Palimpsest echo test (20 → 23) |
| SUMMON token | origami_phoenix (ash_wing), the_final_draft (ink_golem) | Phoenix test |
| GAIN_MANA temporary | tempo_token | Tempo Token test (+1 this turn only, resets) |

## System rules

- Combat math, simultaneous retaliation, heroes never retaliate — combat tests
- Fatigue ramp 1, 2, 3… + lethal — fatigue tests
- Mulligan: shuffle back N, redraw N — mulligan tests
- Tempo Token to the second player — mulligan test
- Mana: per-side clock 3 → 10, full refill — mana curve test
- Win/loss/draw detection — combat tests
- Deck validation (20 cards, 2-copy / 1-legendary limits, ownership) — `tests/decks.test.ts`
- Elo (K=32, standard formula, symmetric) — `tests/elo.test.ts`
- Determinism: same seed → identical hands/deck order/uids — determinism test
- AI legality: 200 simulated games, zero illegal actions, zero Guard violations — `scripts/simulate.ts`
