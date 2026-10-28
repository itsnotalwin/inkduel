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
- [ ] **Full-wave engine tests** — one test per wave-2/3 card effect
      (currently only the original 40 have per-effect tests; waves 2–3 are
      covered by the AI harness only).
- [ ] **Campaign AI smoke** — simulate every campaign stage headlessly
      (extend `scripts/simulate.ts` to accept campaign decks) and assert
      stages 1–4 are winnable by a basic policy, stages 10–12 are not.
- [ ] **API contract tests** — hit every route with Zod-invalid payloads and
      assert the `{ok:false}` envelope + status codes (extend
      `scripts/api-smoke.mjs` into a CI-runnable form).
- [ ] **Coins ledger invariant** — after any sequence of match/pack/campaign
      posts, `coins = Σ(rewards) − Σ(costs) + startingCoins`. Add a fuzz test.

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

---

## 4. Phase 1 — Balance & feel (next 2–4 weeks)

- [ ] **Balance patch 1.1** — using playtest + telemetry: adjust 3–5 cards,
      document every change in a `CHANGELOG.md` with before/after stats.
- [ ] **Bot decks embrace the Archive Set** — the Duelist/Collector/Archivist
      scripted decks predate waves 2–3; build one new archetype per bot
      (e.g. Archivist runs Scribble swarm + Accordion File value).
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

- [ ] **Real multiplayer** — two honest options, decide by then:
      *WebRTC peer relay* (no server cost, works on paper edition with a
      signaling quirk) or *full-stack relay* (authoritative, matches the
      existing session model). The engine is already action-based and
      deterministic — a WebRTC data channel replaying actions is the shortest
      path.
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
