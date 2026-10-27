# DEVIATIONS

Playable-spec conflicts and judgment calls made during the build. Playability wins per the build brief.

1. **Mana clock is per-side.** §3 says "turn 1 = 3 crystals, +1 per turn, cap 10". Implemented on each player's own turn count (both players' first turn = 3 mana), because §6 requires "fully fair games" — a shared global clock would hand the second player a permanent one-crystal edge every turn. The Tempo Token remains the second player's only compensation, mirroring the Hearthstone coin.

2. **Engine phases.** §11 lists `MULLIGAN → P_TURN → AI_TURN → GAME_OVER`. The engine uses `MULLIGAN | TURN | GAME_OVER` plus a `current: Side` field — semantically identical, but side-agnostic so the engine stays symmetric (the UI maps side A = the human player).

3. **Effect-target extensions.** Two cards need target selectors slightly beyond the §4 list, staying within the primitive set:
   - `SUMMON { count: "perDestroyed" }` for The Grand Palimpsest (summons one Ghost Text per unit destroyed by its own board wipe). The wipe itself is `DESTROY { target: "allOtherUnits" }` — the `allOtherUnits` selector is new; `DESTROY` never targets heroes.
   - `DEAL_DAMAGE { target: "ownHero" }` for Acceptance Stamp ("your hero takes 2").

4. **Board space caps token summons.** If a summon finds the board full (e.g. Palimpsest destroying 9 units), only as many tokens are summoned as there are free slots. Standard card-game behavior; §3 caps boards at 5.

5. **"Turns" in the match record** counts the player's own turns taken (T-number of the player's side). The speedrun achievement ("win in 8 turns or fewer") uses this count.

6. **Match replay of events** uses the stored human-readable action log; the engine's event queue is UI-animation sugar and is not persisted.

7. **Card art window ratios.** §2.4 gives 5:7 cards; the art window inside uses a 100×62 viewBox with `slice` to fill — a hair taller than a strict 5:3 window so illustrations have breathing room.

8. **shadcn/ui.** The spec's tech stack lists shadcn/ui, but every shadcn primitive needed heavy re-theming to fit the strict ink-on-paper monochrome; the design system instead ships equivalent hand-rolled primitives (StampButton, Panel, Stamp, WashiTape) styled with the palette tokens. Interactivity that shadcn would provide (dialogs, dropdowns) is implemented directly with React + Framer Motion.

9. **Deck-builder collection gating in friendly matches** follows §8: legendaries are locked until their achievements unlock. AI opponents' scripted decks (Duelist/Archivist) contain legendaries regardless — they are fixed personalities per §6.
