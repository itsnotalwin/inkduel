# MULTIPLAYER.md — Adding Real Opponents

> Design doc for multiplayer. Update as phases ship.
> Last updated: 2026-10-28 · Companion to `ROADMAP.md` §6 (Phase 3).

---

## 1. The good news: the engine was built for this

The duel engine is **pure TypeScript, deterministic, and action-based**:

- `createGame(seed, deckA, deckB, first)` produces identical state everywhere
- every change flows through `applyAction(state, action) → new state`
- the replay system already proves the contract: *seed + deck lists + ordered
  actions = the exact match* (`/replays?id=…` reconstructs any stored match)

**Consequence:** multiplayer only needs to synchronize *actions*, never game
state. Player A plays a card → posts the action → Player B's client applies
the same action locally and animates it from the drained events. Bandwidth
per move: a few hundred bytes. This is the classic lockstep model, and the
hard part (a deterministic, isomorphic engine) is already done and tested.

## 2. The hard part: hand privacy

Lockstep has one honest catch. Both clients hold the **full** game state —
including the opponent's hand. If deck lists are exchanged at handshake, a
technically-minded opponent can reconstruct your opening hand from the seed.

Two tiers, deliberately:

| Tier | Model | Hand privacy | Effort | Use |
|---|---|---|---|---|
| **v0 Casual** | Lockstep, open deck lists | ❌ open lists (a feature, like paper TCG "open lists" night) | Small | Friends, hot-seat-style online duels |
| **v1 Ranked** | Server-authoritative | ✅ server runs the engine, clients receive redacted views | Large | Ladder integrity |

For v1 the server applies every action itself (the engine is isomorphic — it
already runs in `scripts/simulate.ts` and route handlers) and emits a
per-player **view**: your hand in full, the opponent's hand as count + backs
only. This doc focuses on v0; v1 reuses its protocol with a stricter relay.

## 3. Transport options — and the recommendation

| Option | Latency | Infra | Works on Pages? | Verdict |
|---|---|---|---|---|
| **HTTP polling** via existing Next API + a `DuelAction` table | 0.5–1s | none (current stack) | ✅ (needs full-stack host) | **v0 — build now** |
| **Supabase Realtime** (Postgres + websocket channels) | ~100ms | Supabase project (free tier) | ✅ client talks to Supabase directly | **v1 — recommended upgrade** |
| **WebRTC data channel** | ~50ms | signaling server + STUN/TURN for NAT | ⚠️ needs signaling | later, if we want speed |
| **Self-hosted websocket relay** | ~100ms | VPS / edge | ❌ not from Pages | skip |

**Why Supabase fits this codebase specifically:** Prisma can point its
`DATABASE_URL` at Supabase's Postgres — the existing schema (Player, Deck,
Match, …) migrates as-is, SQLite stays for offline dev, and the economy /
ladder / collections all live in one real database. Supabase Realtime then
delivers opponent actions as push events instead of polling, and its auth can
replace the guest-cookie flow later.

**Turn-based tolerance:** this is a card game, not a shooter. A 1-second
action delay is invisible in practice — which is why v0 can ship on plain
polling and still feel fine.

## 4. Protocol (v0, open lists)

### Handshake
```
POST /api/mp/create  {name, deck}          → {duelId, code, seed, yourSide:"A"}
POST /api/mp/join    {code, name, deck}    → {seed, deckA, deckB, yourSide:"B"}
```
- Server generates the seed, stores both decks, marks the duel `waiting` → `active`
- Both clients construct the game: `createGame(seed, deckA, deckB, "A")`
- `status` gate: no actions accepted until both decks are in

### During the duel
```
POST /api/mp/action  {duelId, seq, action}   // active player only
GET  /api/mp/state?duelId&since=<lastSeq>    // opponent polls (or subscribes)
     → {actions: [...], status, winner}
```
- `seq` is monotonic; the server rejects out-of-turn sides and gaps
- Client applies remote actions with `applyAction()` and animates from the
  drained events — identical to how local actions already animate
- Input lock: the client only accepts input when `state.current === mySide`

### End of duel
```
POST /api/mp/result {duelId, result, turns, hp…}
```
- Server **replays the full action tape against both stored decks** to verify
  the reported result — deterministic engine means cheat-proof results for free
- Then the normal ranked/coins/achievement flow applies

### Reconnect
The tape is the source of truth: on reload, a client replays actions
`0..latest` locally and is exactly back in the game (the replay viewer already
does this — same code path).

## 5. Data model (v0, Prisma additions)

```prisma
model Duel {
  id         String   @id @default(uuid())
  code       String   @unique          // 6-char invite code
  seed       Int
  status     String   @default("waiting") // waiting | active | finished | abandoned
  playerAId  String
  playerBId  String?
  deckA      Json
  deckB      Json?
  winner     String?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  actions    DuelAction[]
}

model DuelAction {
  id       String @id @default(uuid())
  duelId   String
  seq      Int
  side     String
  action   Json
  duel     Duel   @relation(fields: [duelId], references: [id], onDelete: Cascade)

  @@unique([duelId, seq])
  @@index([duelId])
}
```

## 6. Client changes

- `DuelClient` grows a `mode=online` path alongside hotseat/campaign:
  - **input gate**: handlers check `state.current === mySide`
  - **optimistic local apply** for your own actions (instant feedback)
  - **remote apply** for opponent actions (same event drain → animations)
  - **poll loop** (`GET /api/mp/state?since=`) replaced by a Supabase channel
    subscription in v1 — one transport swap in one file
- New `/multiplayer` lobby page: create duel (shows invite code), join by
  code, list of waiting duels
- Decks: each player's active deck from the deck workshop

## 7. Supabase specifics (when we take the v1 step)

What's needed from you (the account side):
1. Create a project at supabase.com → copy the **project URL**, **anon key**
   (client) and **database connection string** (server/Prisma)
2. Set them as env vars: `SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `DATABASE_URL` (Supabase pooler URI)

What the code gets:
- `prisma db push` against Supabase Postgres migrates the existing schema
- Realtime: subscribe to `postgres_changes` on `DuelAction` filtered by
  `duelId` — opponent actions arrive as push, polling loop retired
- RLS policies: participants read/write only their duels
- Note: free tier pauses after 1 week of inactivity and caps realtime
  volume — fine at this scale, worth knowing

## 8. Build order

- [ ] **v0.1** Prisma models `Duel`/`DuelAction` + `db push`
- [ ] **v0.2** routes: create / join / action / state (polling)
- [ ] **v0.3** `DuelClient` online mode: input gate + remote action apply
- [ ] **v0.4** `/multiplayer` lobby with invite codes
- [ ] **v0.5** server tape replay verification + result posting into ranked
- [ ] **v1.0** Supabase Postgres migration + Realtime transport swap
- [ ] **v1.1** server-authoritative redacted views (hand privacy) for ranked
- [ ] **v1.2** matchmaking queue by MMR (reuses the bot-pick logic)
