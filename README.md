# INKDUEL — the paper duel gazette

A complete, browser-based card battler (Hearthstone-lite) with a strict
**monochrome "ink-on-paper" art direction**: every card, board, stamp and sound
is hand-drawn in ink or synthesized procedurally. Duel AI opponents with
distinct personalities, climb an Elo ladder, build 20-card decks from a
40-card collection, unlock legendaries through achievements, and read the
meta on *The Daily Ink*.

**Play now:** https://itsnotalwin.github.io/inkduel/ (the "paper edition" —
the whole game runs client-side, progress lives in your browser). The repo
also contains the full-stack edition: clone, `npm run db:push && npm run
db:seed && npm run dev` for server-side Elo, achievements, replays and
cross-device profiles.

## Quick start

```bash
npm install
npm run db:push     # create the SQLite schema (prisma/dev.db)
npm run db:seed     # seed 44 cards + 12 achievements
npm run dev         # http://localhost:3000
```

Other scripts:

```bash
npm run build       # production build (must pass clean)
npm run test        # vitest — engine, deck validation, Elo (41 tests)
npm run db:seed     # idempotent seed
```

Quality harnesses:

```bash
npx tsx scripts/simulate.ts    # 50 games per AI personality — legality + winnability
node scripts/audit-colors.cjs  # monochrome audit — every hex must be a palette token
node scripts/api-smoke.mjs     # end-to-end API smoke test
```

## How a duel works

- 30 HP heroes, 5 board slots, mana 3 → 10 (per-side clock), 75s turn timer.
- Draw 4 → mulligan → the second player receives the **Tempo Token**.
- Keywords: **GUARD · SWIFT · TWINSTRIKE · INSIGHT · ECHO**.
- Fatigue: drawing from an empty deck deals 1, 2, 3… damage.
- Elo K=32, recomputed **server-side** against the bot's fixed rating.

## Stretch goals — all shipped

- **Replay viewer** — every ranked match stores its full action tape; step
  through it at `/replays?id=…` (linked from the profile's match history) with
  play/pause, scrubbing, and per-step commentary. Tapes replay deterministically
  from the stored seed + decks.
- **Ambient soundscape** — a procedural paper-noise floor and ink-drone
  (Web Audio) whose brightness follows the game phase: hushed during mulligan,
  brighter on your turn, darker on theirs, a swell at game over.
- **Pass & play (hot-seat)** — `?mode=hotseat` on the duel: two humans share one
  device with a "PASS THE DEVICE" interstitial so hands stay secret. Friendly
  duels only — no MMR, no posting.

## Deployment

- **GitHub Pages (paper edition):** push to `main` → `.github/workflows/deploy-pages.yml`
  runs `node scripts/build-pages.mjs` (stashes the API routes, static-exports
  with `NEXT_PUBLIC_CLOUD=0`, restores them) and deploys `out/` with
  `basePath = /<repo name>`. Everything persists to localStorage.
- **Full-stack edition:** run `npm run build && npm start` on any Node host
  (Vercel/Render/a VPS); SQLite lives at `prisma/dev.db`.

## Opponents

| Bot | Elo | Personality |
|---|---|---|
| The Duelist | 900 | Aggro — face is the place |
| The Gambler | 1050 | Chaos — random deck, 35% random decisions |
| The Collector | 1150 | Value — floods the board, plays on curve |
| The Archivist | 1400 | Control — removes threats, wins with legendaries |

## Architecture

- `src/game/engine.ts` — pure TypeScript game engine (no React/DOM). Deterministic
  given a seed (mulberry32 inside the state); exposes `createGame`, `getLegalActions`,
  `applyAction`, and an event queue the UI drains for animation.
- `src/game/ai.ts` — the four policies as greedy heuristic scorers over legal actions.
- `src/game/cards.ts` — the 40 collectible cards + 4 tokens; single source of truth.
- `src/lib/cards/art/` — 44 hand-authored inline SVG illustrations (stroke #17140F, w3).
- `src/app/api/*` — Next.js route handlers, Zod-validated, `{ok, data|error}` envelope.
- `prisma/schema.prisma` — Player, Card, Deck, Match, Achievement, DailyQuest, CardStat.
- Sounds are 100% procedural (Web Audio API); animation via Framer Motion honoring
  `prefers-reduced-motion`.

See `DEVIATIONS.md` for spec judgment calls and `EFFECTS.md` for the
per-effect verification checklist.
