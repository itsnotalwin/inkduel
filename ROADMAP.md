# INKDUEL — Product Roadmap

> Living document. Update it as items ship; check items off, never delete them.
> Last updated: 2026-10-28 · Current version: **v1.0 "First Edition" + Archive Set**

---

## 1. Vision

INKDUEL is a monochrome ink-on-paper card battler that plays fully offline as a
PWA, with an optional full-stack edition for ranked play. The north star:
**a card game that feels hand-made, runs anywhere, and respects the player's
time** — every match is 10 minutes, every feature works on a phone with the
network off, and every system (campaign, packs, quests) feeds the same loop:
*duel → earn ink → open packs → build decks → duel better*.

## 2. Where we are (v1.0 snapshot)

| Area | Status |
|---|---|
| Engine (pure TS, deterministic, seeded) | ✅ `src/game/engine.ts` — 41+ tests |
| Card pool | ✅ 96 collectibles + 5 tokens, 3 waves, 51 hand-drawn illustrations |
| AI opponents | ✅ 4 personalities + seeded harness (`scripts/simulate.ts`) |
| Ranked ladder (Elo, server-side) | ✅ full-stack edition |
| Ink economy (win/login rewards) | ✅ both editions |
| Gacha packs | ✅ `/packs`, server-roll or local roll |
| Campaign (12 stages) | ✅ `/campaign`, `?campaign=N` duels |
| Daily quests | ✅ 3 templates, per-day rotation |
| Achievements (12, incl. legendary unlocks) | ✅ |
| Replays (action tapes, stepper) | ✅ `/replays?id=…` |
| PWA (icons, manifest, offline) | ✅ verified offline play |
| Onboarding (prologue cutscene, duel tips) | ✅ |
| Hot-seat, ambient audio, Daily Ink analytics | ✅ |

---

## 3. Testing roadmap (do this first)

The game is feature-complete for v1.0 — the next win is **confidence**, not
features. Work top-down; each item is small and lands immediately.

### 3.1 Automated coverage (engine + economy)
- [x] **Pack RNG distribution test** — roll 50,000 packs via `rollPack()`,
      assert rarity frequencies within tolerance of 70/20/8/2 and that the
      rare+ floor never breaks (chi-square or ±1.5% band).
      ✅ Shipped in `tests/economy.test.ts` — 50k packs, rarity bands pass,
      rare+ floor verified in every pack (and proven non-vacuous: the floor
      fires in ~17% of packs), no tokens leak, unowned preference measured.
- [x] **Full-wave engine tests** — one test per wave-2/3 card effect
      ✅ Shipped in `tests/wave-effects.test.ts` — 40 per-effect tests; also
      surfaced and fixed a real engine bug (hero-targeted burn silently
      no-op'ing) and refound the Duelist-vs-Archivist lopsided matchup.
- [x] **Campaign AI smoke** — simulate every campaign stage headlessly and
      assert zero illegal actions, stages 1–4 winnable by a basic policy,
      difficulty escalation, and every stage beatable by ≥1 proxy archetype.
      ✅ Shipped as `scripts/campaign-smoke.ts` (standalone, not folded into
      `simulate.ts`): 30 seeded games per stage with an aggro proxy, plus an
      automatic control-proxy re-run for any stage the aggro proxy can't
      crack (<10%). First run exposed stage 4 (Sticky Situations) and stage
      6 (Inkwell Serpents) as guard-walls the proxy could not beat — both
      decks retuned; final gate: early 69% vs late 50% proxy win rate, 0
      illegal actions across all 360 games.
- [x] **API contract tests** — hit every route with unauthenticated and
      Zod-invalid payloads and assert the `{ok:false}` envelope + status
      codes. ✅ Shipped as `tests/api-contract.test.ts` (25 tests): handlers
      run directly against a throwaway SQLite database (`INKDUEL_DB` env +
      `prisma.test.config.ts`), no server needed — CI-runnable via vitest.
      Covered: 401 gating on every mutating+private route, 400s on invalid
      payloads, 402 unaffordable packs, 409 campaign skip-ahead, 422 illegal
      or unowned decks, 404 foreign decks, catalog seeding, pack cost/refund
      math. Hardened `/api/packs` while at it: malformed or non-conforming
      bodies now reject instead of silently opening a pack.
- [x] **Coins ledger invariant** — after any sequence of match/pack/campaign
      posts, `coins = Σ(rewards) − Σ(costs) + startingCoins`. ✅ Shipped as
      the ink ledger fuzz in `tests/api-contract.test.ts`: 48 seeded-random
      ops (matches, pack bursts incl. 402-when-broke, daily logins, campaign
      first-clears then replay tokens) with the running balance cross-checked
      against every response `coinsAfter` and `/api/me` reads.

### 3.2 Playtest protocol (humans)
- [ ] **Scripted first-session test** — new device, no localStorage: prologue →
      tutorial duel → 3 ranked duels → first pack. Note every point of
      confusion. Target: zero dead-ends.
- [ ] **Balance capture** — after ≥50 recorded matches, review
      `/api/analytics/meta` and flag any card above 60% or below 40% win rate
      with ≥20 plays; log findings as GitHub issues with the `balance` label.
- [ ] **Mobile field test** — one full session on a real phone (not DevTools):
      install PWA, airplane-mode duel, pack opening. Check touch targets and
      text sizes on a 360px-wide screen (smallest common device).

### 3.3 CI & quality gates
- [ ] Move `simulate.ts` + `audit-colors.cjs` into the GitHub Action so every
      push runs: unit tests → AI legality harness → monochrome audit → builds.
- [ ] Lighthouse CI: PWA installability + performance ≥ 90 on the paper edition.
- [ ] Issue templates (bug / balance / feature) so triage has structure.

### 3.4 Known risks to watch
- **Pack economy drift** — if duplicates refund too generously, ink inflates
  and packs lose meaning. Watch `totalRefund` vs `cost` ratio in analytics.
- **Legendary power creep** — 3 new legendaries joined 4 old ones; The Red
  Thesaurus (5-cost Swift+Twinstrike 4/4) may need a stat adjustment after
  telemetry.
- **localStorage ceiling** — replays + matches cap at 100 entries locally;
  long-term players on the paper edition will silently lose old tapes. Decide:
  raise the cap, compress, or accept.
- **RESOLVED (balance patch 1.1): Duelist vs Archivist was 0/50** — the
  fatigue-loss pattern from the hero-target fix. Fixed by eight card changes
  plus two deck rebuilds (see `CHANGELOG.md`): the matchup is now 22–26% and
  the matrix has no 0/N cells. Collector is now the weakest archetype —
  addressed by the "Bot decks embrace the Archive Set" item below.

---

## 4. Phase 1 — Balance & feel (next 2–4 weeks)

- [x] **Balance patch 1.1** — shipped: 8 card changes, 2 archetype deck
      rebuilds, 2 AI weight tweaks; every change documented with before/after
      stats in `CHANGELOG.md`. First target fixed: Duelist vs Archivist
      0/50 → 22–26%, matrix has no 0/N cells, campaign smoke greener than
      before (early 74% / late 62%, hardest stage 30%).
- [x] **Bot decks embrace the Archive Set** — shipped: bots play their own
      `BOT_ARCHETYPE_DECKS` (decoupled from player starters) — "First Edition
      Blitz", "Scribble Swarm" (the example from this item), and "The Folio
      Engine". Matrix flipped from Archivist-dominant (94–100%) to a
      rock-paper-scissors spread; Collector went from punching bag (14%) to
      54–58% vs everyone. Stats in `CHANGELOG.md`.
- [ ] **Deck builder QoL** — card search inside the builder, auto-fill
      remaining slots with the curve, mana-curve hover shows card names.
- [ ] **Campaign act 2** — stages 13–20 introducing wave-3 cards as enemy
      staples; Head Archivist rematch with a remixed deck.
- [ ] **Onboarding follow-up** — after 3 duels, surface one-time deep-dive
      tips (Tempo Token advanced uses, Guard math, fatigue planning).

## 5. Phase 2 — Depth (1–2 months)

- [ ] **Duplicate crafting ("Ink Recycling")** — duplicates beyond refunds
      accumulate toward a chosen card of the same rarity; gives long-term
      players agency.
- [ ] **Deck sharing** — export/import a deck code (base64 of the card list)
      with a share page; works on the paper edition via URL.
- [ ] **Seasonal ladder** — soft MMR reset each "issue" (monthly), season
      badge on the profile, end-of-season ink payout by rank.
- [ ] **More packs** — a second pack type (e.g. "Collected Works pack":
      guaranteed epic+ but 150 ink) to diversify the economy.
- [ ] **Card set pages** — the collection gains set filters and a completion
      percentage per wave; completion rewards ink.
- [ ] **Sound set 2** — per-card play sounds for legendaries, win/lose stings
      variation, ambient intensity tied to board state (units alive).

## 6. Phase 3 — Play with humans (2–4 months, biggest lift)

- [ ] **Real multiplayer** — design locked, see **`MULTIPLAYER.md`**: v0 is
      deterministic lockstep over HTTP polling (no new infrastructure, open
      deck lists), v1 migrates Prisma to Supabase Postgres and swaps the
      poll loop for Realtime push, and ranked play moves to
      server-authoritative redacted views for hand privacy.
- [ ] **Friend challenges** — challenge links with a seeded duel; both players
      play the same seed vs the same AI and compare results (asynchronous
      "shadow duel") — a cheap stepping stone to live play.
- [ ] **Tournaments** — 8-player brackets on the full-stack edition.

## 7. Phase 4 — Live ops (ongoing)

- [ ] **New sets on a cadence** — one 20–30 card "wave" per issue, following
      the established pattern (cards.ts + two art files + tests).
- [ ] **Weekly event modifier** — e.g. "double ink weekend", "rainbow week:
      all rarities equal odds", "fatigue starts at turn 12".
- [ ] **Localization** — the UI copy is centralized enough to extract.
- [ ] **Achievements set 2** — tied to campaign completion, pack milestones,
      and multiplayer (once it exists).

## 8. Metrics that matter

Watch these in `/api/analytics/meta` + the DB; they tell you what to patch:

| Metric | Healthy range | Where |
|---|---|---|
| Match length | 8–14 turns | `averageTurns` |
| Any card win rate (≥20 plays) | 40–60% | `CardStat` / meta page |
| Pack duplicate ratio | < 60% of pulls | packs route response |
| Campaign stage-1 clear rate | > 90% of starters | progress vs signups |
| First-duel completion | > 80% reach GAME_OVER | match count vs guests |

## 9. How to work from this document

1. Pick items from the **earliest unchecked phase** — the phases are ordered.
2. For balance changes: capture data first (§3.2), change stats, add a line to
   `CHANGELOG.md`, re-run `npx tsx scripts/simulate.ts` to confirm the AI
   harness stays green.
3. Every shipped item: check the box here, note the PR/commit, and update the
   "Last updated" line at the top.
