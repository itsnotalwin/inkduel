# INKDUEL changelog

Balance changes are documented here with before/after stats, per ROADMAP §4.
All numbers come from `scripts/balance-matrix.ts` (50 games per ordered pair,
fixed seeds) unless stated otherwise.

## Balance patch 1.1 — "The Archivist can be rushed"

**Problem (confirmed by the harness):** Duelist vs Archivist was 0/50 — the
worst cell in the matrix, and the Archivist archetype was dominant everywhere
(94–100% vs every other bot). Diagnosis (end-of-game dumps): the Duelist deck
had zero card draw and ~10 face reach; `paper_storm` swept 9 of its 13 units;
`the_archivist` refilled its controller's hand to 8 so fatigue never bit; and
the guard wall (`page_knight`, `papercraft_colossus`, `blotting_wall` 3/6,
`stationery_titan` + `lamination`'s +4 HP) absorbed every attack while the
Archivist's own units swung freely at a guard-less opponent.

The estimate in the roadmap was 3–5 card changes; the matrix demanded eight
(six stat/effect changes plus two deck rebuilds). All are listed — nothing
was changed silently.

### Card changes (8)

| Card | Before | After | Why |
| --- | --- | --- | --- |
| Red Pen | 1-cost, 2 dmg to a **unit** | 2 dmg to **anything** | Aggro reach that bypasses guards; burn was ~10 total face damage |
| Crumpled Note | 1 dmg to all enemy units | + "Draw a card" | Cantrip gas so the sweep doesn't end the game |
| Blank Page | Draw 2 (2-cost) | Draw 3 | Fatigue was the loss mode; deck effectively 26 deep now vs Archivist's 26–28 |
| Paper Storm | 3 dmg to all enemy units | 2 dmg | Killed 9/13 Duelist units outright; 3/2 bodies survive now |
| The Archivist | Draw until 8 in hand | Draw until 6 | The named refill engine; still the best draw in the game |
| Blotting Wall | 3/6 Guard (4-cost) | 3/5 | One point off the roadblock tax |
| Paper Swan | 1/1 Swift (1-cost) | 2/1 | Best-1-drop rule; accelerates the race window |
| Eraser Golem | Echo: heal 3 | Echo: heal 2 | Heal was eating exactly the burn margin the Duelist was missing |

### Deck changes

**The Duelist's Rush** — −2 Graphite Golem, −1 Ink Blot, −1 Sharpened Pencil,
+2 Blank Page, +2 Pressure Stamp (2 dmg to anything + draw 1). Curve stays
fast; 10 cards of draw/cantrip and 16 potential face damage from hand.

**The Archivist's Vault** — −1 Page Knight, −1 Lamination, −1 Second Draft,
+2 Graphite Golem, +2 Fresh Ink, +1 Comic Relief. The +4 HP guard glue and
bounce recursion made the wall eternal; replaced with neutral curve.

### AI weight changes (`src/game/ai.ts`)

- Duelist: `face` 3.2 → 4.0, `heroHp` 1.0 → 0.8 (commit to the race)
- Archivist: `heroHp` 1.8 → 1.3 (race slightly instead of turtling)

### Before / after (50 games per cell, `scripts/balance-matrix.ts`)

Win % — rows beat columns:

| row \ col | duelist | gambler | collector | archivist |
| --- | --- | --- | --- | --- |
| **before** duelist | — | 44% | 92% | **0%** |
| **before** gambler | 80% | — | 62% | 14% |
| **before** collector | 64% | 68% | — | 30% |
| **before** archivist | 100% | 94% | 98% | — |
| **after** duelist | — | 60% | 96% | **26%** |
| **after** gambler | 62% | — | 58% | 14% |
| **after** collector | 32% | 74% | — | 30% |
| **after** archivist | 98% | 92% | 98% | — |

- Target cell 0% → 26%, and the harness telemetry line reads 11/39 (22%)
  on its own seed set. The remaining matchups gained no 0/N cells.
- Campaign smoke (`scripts/campaign-smoke.ts`) got *easier in the right
  places*: early stages 74% vs late 62% (was 69/50), hardest stage 30%
  (was 10%), every stage still beatable by ≥1 proxy archetype, zero illegal
  actions across all 360 games.
- Collector remains the weakest archetype (32% vs Duelist now) — that is the
  next item's job ("Bot decks embrace the Archive Set"), not this patch's.

### Test updates

- `engine.test.ts`: Eraser Golem echo expectation 23 → 22 HP; Paper Storm
  survivor 2 → 3 HP; The Archivist refill target 8 → 6.
- `scripts/simulate.ts` telemetry tag updated to post-patch-1.1.
