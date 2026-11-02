"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  applyAction,
  createGame,
  drainEvents,
  getLegalActions,
  OTHER,
  type Action,
  type GameState,
  type Side,
  type Target,
} from "@/game/engine";
import { ARCHETYPE_DECKS, getCard, type Wash } from "@/game/cards";
import { expandDeck, type DeckEntry } from "@/game/decks";
import { campaignStage } from "@/game/campaign";
import { decideAction, mulliganAction, pickBot, botDeckIds, type BotProfile } from "@/game/ai";
import { eloDelta } from "@/lib/elo";
import { sound } from "@/lib/sound";
import { ambient } from "@/lib/ambient";
import { completeCampaignStage, ensureGuest, getDecks, mpAction, mpResult, mpState, postMatch, readMpDuel, type CampaignResult, type MatchPostResult } from "@/lib/api";
import { LegendaryFlourish, type FlourishState } from "./LegendaryFlourish";
import { bumpDuelCount, dismissTutorialTip, readDuelCount, readTutorialFlags, TutorialTip, type TutorialFlags } from "@/components/onboarding/Tutorial";
import { playVoice } from "@/lib/voice";
import { CardFace, WASH_VAR, washInk } from "@/components/card/CardFace";
import { StampButton, Stamp, HandNote, WashiTape } from "@/components/paper";
import {
  BoardUnit,
  CardBack,
  DeckPile,
  DustBurst,
  Floater,
  HeroPlate,
  InkSlash,
  ManaCrystals,
  TurnBanner,
} from "./units";
import { STARTING_MMR, TURN_SECONDS } from "@/config";

// ── transient animation state ───────────────────────────────────────────

interface FloaterItem {
  id: number;
  key: string; // `u:<uid>` or `h:<side>`
  n: number;
  kind: "damage" | "heal" | "fatigue";
}

interface AnimState {
  floaters: FloaterItem[];
  slash: { id: number; key: string } | null;
  lungingUid: string | null;
  banner: { id: number; text: string; tone: "ink" | "red" } | null;
  shake: number;
  dust: { id: number; key: string }[];
  flourish: { id: number; cardId: string; side: Side } | null;
}

const EMPTY_ANIM: AnimState = { floaters: [], slash: null, lungingUid: null, banner: null, shake: 0, dust: [], flourish: null };

let animId = 1;

/** Which side the screen belongs to: fixed to A solo; follows the turn in
 *  hot-seat; pinned to your online side in multiplayer. */
function viewerSideOf(hotseat: boolean, mpSide: Side | null, s: GameState): Side {
  return mpSide ?? (hotseat ? s.current : "A");
}

function localMmr(): number {
  if (typeof window === "undefined") return STARTING_MMR;
  return Number(window.localStorage.getItem("inkduel:mmr") ?? STARTING_MMR);
}

function localName(): string {
  if (typeof window === "undefined") return "You";
  return window.localStorage.getItem("inkduel:name") ?? "You";
}

function localDeck(): DeckEntry[] {
  if (typeof window !== "undefined") {
    const raw = window.localStorage.getItem("inkduel:activeDeck");
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as DeckEntry[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        // fall through to default
      }
    }
  }
  return ARCHETYPE_DECKS.duelist.cards.map(([cardId, count]) => ({ cardId, count }));
}

/** The per-side area slot: the active area's mini card face, or bare dashed
 *  paper while the table is unwashed. Areas are played from the hand, so the
 *  slot itself is never a button — only hover reveals the rules. */
function AreaSlot({ cardId, tipBelow = false }: { cardId: string | null; tipBelow?: boolean }) {
  const def = cardId ? getCard(cardId) : null;
  return (
    <div className="group relative shrink-0" style={{ width: "clamp(48px, 9vw, 64px)" }}>
      {def ? (
        <CardFace card={def} size="token" className="!w-full" />
      ) : (
        <div
          aria-label="Area slot — empty"
          title="Areas are set out from your hand"
          className="flex items-center justify-center"
          style={{
            aspectRatio: "5 / 7",
            border: "2px dashed color-mix(in srgb, var(--color-pencil) 75%, transparent)",
            borderRadius: "8px 13px 9px 12px / 13px 8px 12px 9px",
          }}
        >
          <span
            className="label-type text-center"
            style={{ fontSize: "clamp(6px, 1.1vw, 8px)", lineHeight: 1.5, color: "var(--color-pencil)" }}
          >
            SET AN
            <br />
            AREA
          </span>
        </div>
      )}
      {/* rules tooltip — below the opponent's slot, above your own */}
      <div
        className={`pointer-events-none absolute left-1/2 z-40 hidden w-44 -translate-x-1/2 group-hover:block ${
          tipBelow ? "top-full mt-2" : "bottom-full mb-2"
        }`}
        role="tooltip"
      >
        <div
          className="ink-frame px-2.5 py-2 text-center"
          style={{ background: "var(--color-cardstock)", boxShadow: "2px 3px 6px rgba(23,20,15,0.25)" }}
        >
          {def ? (
            <>
              <div className="label-type text-[9px]" style={{ color: def.wash ? washInk(def.wash) : "var(--color-ink)" }}>
                AREA · {def.name}
              </div>
              <p className="mt-1 text-[11px] leading-snug" style={{ fontFamily: "var(--font-type)" }}>
                {def.text}
              </p>
            </>
          ) : (
            <p className="text-[11px] leading-snug" style={{ fontFamily: "var(--font-type)" }}>
              play an area card from your hand — it tints your side of the table
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/** The soft wash an active area lays over its side of the board — a slow
 *  600ms tint bloom in from AREA_PLAYED, a fade out on replacement. */
function BoardWash({ wash, reduce }: { wash: Wash | undefined; reduce: boolean }) {
  return (
    <AnimatePresence>
      {wash && (
        <motion.div
          key={wash}
          aria-hidden
          className="pointer-events-none absolute inset-0"
          initial={reduce ? { opacity: 0.45 } : { opacity: 0 }}
          animate={{ opacity: 0.45 }}
          exit={reduce ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, transition: { duration: 0.5, ease: "easeInOut" } }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          style={{ background: WASH_VAR[wash] }}
        />
      )}
    </AnimatePresence>
  );
}

/** The wash hue of the area a side currently has set out (undefined = bare paper). */
function areaWashOf(cardId: string | null): Wash | undefined {
  return cardId ? getCard(cardId).wash : undefined;
}

export default function DuelClient() {
  const reduce = useReducedMotion();
  const searchParams = useSearchParams();
  const hotseat = searchParams.get("mode") === "hotseat";
  // online duel: ?mp=<duelId>&side=A|B — lockstep over the action tape
  const mpInfo = useMemo(() => {
    const duelId = searchParams.get("mp");
    if (!duelId) return null;
    return { duelId, side: (searchParams.get("side") === "B" ? "B" : "A") as Side };
  }, [searchParams]);
  const mp = mpInfo !== null;
  const [state, setState] = useState<GameState | null>(null);
  const [bot, setBot] = useState<BotProfile | null>(null);
  const [mpError, setMpError] = useState<string | null>(null);
  const [anim, setAnim] = useState<AnimState>(EMPTY_ANIM);
  const [targeting, setTargeting] = useState<{ kind: "play" | "attack"; uid: string; targets: Target[] } | null>(null);
  const [mulliganPicks, setMulliganPicks] = useState<Set<string>>(new Set());
  const [logOpen, setLogOpen] = useState(false);
  const [timer, setTimer] = useState(TURN_SECONDS);
  const [muted, setMuted] = useState(false);
  const [awaitingPass, setAwaitingPass] = useState(false);
  const [tutorial, setTutorial] = useState<TutorialFlags>(() => ({
    tipWelcome: false, tipMana: false, tipPlay: false, tipAttack: false, tipWin: false, tipTempo: false,
    tipGuardMath: false, tipFatigue: false, tipTempoAdvanced: false,
  }));
  const [result, setResult] = useState<
    { result: "WIN" | "LOSS" | "DRAW"; mmrBefore: number; mmrAfter: number; server?: MatchPostResult; campaign?: CampaignResult } | null
  >(null);
  const stateRef = useRef<GameState | null>(null);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  const actionsRef = useRef<Action[]>([]);
  // online mode bookkeeping: the duel identity, the authoritative action tape
  // (both sides, seq = index), and a re-entrancy guard for the poll loop
  const mpRef = useRef<{ duelId: string; side: Side } | null>(null);
  const mpTapeRef = useRef<Action[]>([]);
  const mpPollBusyRef = useRef(false);
  const hotseatRef = useRef(hotseat);
  useEffect(() => {
    hotseatRef.current = hotseat;
  }, [hotseat]);
  const statsRef = useRef({
    maxTurnDamage: 0,
    maxTurnKills: 0,
    tookFatigue: false,
    startedAt: 0,
    turnDamage: 0,
    turnKills: 0,
    deckEntries: [] as { cardId: string; count: number }[],
  });

  // ── match setup ───────────────────────────────────────────────────────
  /** Online setup: wait for both decks, then rebuild the game from seed +
   *  stored deck lists + the full server tape (silent replay). This is also
   *  the reconnect path — a reload replays 0..latest and is back in the duel. */
  const setupMp = useCallback(async (info: { duelId: string; side: Side }) => {
    for (let attempt = 0; attempt < 150; attempt++) {
      // `since` is the last seq already held (exclusive response) — -1 = everything
      const st = await mpState(info.duelId, -1);
      if (st && st.status === "active" && st.deckA && st.deckB) {
        const stash = readMpDuel(info.duelId);
        if (!stash) {
          setMpError("this device lost the duel's seed — rejoin from the lobby");
          return;
        }
        let gs = createGame(
          stash.seed,
          expandDeck(st.deckA as DeckEntry[]),
          expandDeck(st.deckB as DeckEntry[]),
          "A",
          st.playerAName ?? "Player A",
          st.playerBName ?? "Rival",
        );
        const tape: Action[] = [];
        for (const row of st.actions) {
          const action = row.action as Action;
          tape.push(action);
          gs = applyAction(gs, action);
          drainEvents(gs); // silent replay: reconnect shows the position, not the fireworks
        }
        mpTapeRef.current = tape;
        statsRef.current.startedAt = Date.now();
        setState(gs);
        return;
      }
      if (st && st.status === "abandoned") {
        setMpError("the rival left before the duel began");
        return;
      }
      await new Promise((r) => window.setTimeout(r, 1200));
    }
    setMpError("could not reach the duel — head back to the lobby");
  }, []);

  const startMatch = useCallback(async () => {
    actionsRef.current = [];
    setAwaitingPass(false);
    if (mpInfo) {
      mpRef.current = { duelId: mpInfo.duelId, side: mpInfo.side };
      mpTapeRef.current = [];
      setBot(null);
      setAnim(EMPTY_ANIM);
      setTargeting(null);
      setMulliganPicks(new Set());
      setResult(null);
      setMpError(null);
      setTimer(TURN_SECONDS);
      setState(null);
      await setupMp(mpInfo);
      return;
    }
    mpRef.current = null;
    if (hotseat) {
      // pass & play: both humans share the active deck (mirror duel)
      const deckEntries = localDeck();
      const matchSeed = Math.floor(Math.random() * 2 ** 31);
      setBot(null);
      setAnim(EMPTY_ANIM);
      setTargeting(null);
      setMulliganPicks(new Set());
      setResult(null);
      setTimer(TURN_SECONDS);
      setState(
        createGame(matchSeed, expandDeck(deckEntries as DeckEntry[]), expandDeck(deckEntries as DeckEntry[]), "A", "Player 1", "Player 2"),
      );
      return;
    }
    // make sure a guest session exists, then use the active deck from the server
    await ensureGuest();
    const stageParam = searchParams.get("campaign");
    const stage = stageParam !== null ? campaignStage(Number(stageParam)) : undefined;
    let deckEntries: { cardId: string; count: number }[] = localDeck();
    if (!stage) {
      const decks = await getDecks();
      if (decks && decks.length > 0) {
        const active = decks.find((d) => d.isActive) ?? decks[0];
        deckEntries = active.cards;
      }
    }
    const playerMmr = localMmr();
    const chosenBot = stage
      ? { key: stage.policy as BotProfile["key"], name: stage.name, elo: 900 + stage.index * 50, blurb: stage.blurb }
      : pickBot(playerMmr);
    const matchSeed = Math.floor(Math.random() * 2 ** 31);
    // bot decks are already expanded id lists; campaign stages carry
    // {cardId,count} entries — normalize both to id lists for createGame
    const botDeck: string[] = stage
      ? expandDeck(stage.deck.map(([cardId, count]) => ({ cardId, count })))
      : botDeckIds(chosenBot.key, matchSeed);
    statsRef.current = {
      maxTurnDamage: 0,
      maxTurnKills: 0,
      tookFatigue: false,
      startedAt: Date.now(),
      turnDamage: 0,
      turnKills: 0,
      deckEntries,
    };
    setBot(chosenBot);
    setAnim(EMPTY_ANIM);
    setTargeting(null);
    setMulliganPicks(new Set());
    setResult(null);
    setTimer(TURN_SECONDS);
    setState(
      createGame(matchSeed, expandDeck(deckEntries as DeckEntry[]), botDeck, "A", localName(), chosenBot.name),
    );
  }, [hotseat, searchParams, mpInfo, setupMp]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration of persisted preferences (mute + tutorial)
    setMuted(sound.muted);
    setTutorial(readTutorialFlags());
    void startMatch();
  }, [startMatch]);

  // ── event processing (animations + sound) ─────────────────────────────
  const processEvents = useCallback((gs: GameState) => {
    const events = drainEvents(gs);
    if (events.length === 0) return;
    setAnim((prev) => {
      const next: AnimState = { ...prev, floaters: [...prev.floaters], dust: [...prev.dust] };
      for (const e of events) {
        switch (e.type) {
          case "DRAW":
            sound.paperSlide();
            break;
          case "MULLIGAN_REDRAW":
            sound.paperSlide();
            break;
          case "PLAY_CARD": {
            sound.penScratch();
            next.dust = [...next.dust, { id: animId++, key: `u:${e.uid}` }];
            const pulled = getCard(e.cardId);
            if (pulled.rarity === "legendary") {
              next.flourish = { id: animId++, cardId: e.cardId, side: e.side };
              // signature motif, hashed from the card id — each legendary sounds like itself
              sound.legendaryMotif(e.cardId);
              // voiced lore for the legendaries that have one; the rest stay silent
              playVoice(`legendary-${e.cardId.replace(/_/g, "-")}`);
              window.setTimeout(() => setAnim((cur) => ({ ...cur, flourish: null })), 2000);
            }
            break;
          }
          case "SPELL":
            sound.penScratch();
            break;
          case "SUMMON":
            sound.pop();
            break;
          case "AREA_PLAYED":
            // a fresh sheet is laid on the table — the 600ms wash bloom on the
            // board row animates off state, the slide carries the sound here
            sound.paperSlide();
            break;
          case "AREA_REPLACED":
            // the old wash fades out via AnimatePresence on the board overlay;
            // the AREA_PLAYED slide in the same drain keeps the sound subtle
            break;
          case "ATTACK": {
            next.slash = {
              id: animId++,
              key: "uid" in e.target ? `u:${e.target.uid}` : `h:${e.target.hero}`,
            };
            next.lungingUid = e.attackerUid;
            break;
          }
          case "DAMAGE": {
            const key = e.kind === "hero" ? `h:${e.side}` : `u:${e.uid}`;
            next.floaters = [...next.floaters, { id: animId++, key, n: e.n, kind: "damage" }];
            if (e.n >= 3) next.shake = prev.shake + 1;
            if (e.kind === "hero") sound.stampThunk();
            // achievements: damage dealt by side A, attributed per-turn
            if (e.side === "B") statsRef.current.turnDamage += e.n;
            break;
          }
          case "DEATH":
            sound.pageTear();
            if (e.side === "B") statsRef.current.turnKills += 1;
            break;
          case "HEAL":
            next.floaters = [...next.floaters, { id: animId++, key: `h:${e.side}`, n: e.n, kind: "heal" }];
            break;
          case "FATIGUE":
            next.floaters = [...next.floaters, { id: animId++, key: `h:${e.side}`, n: e.n, kind: "fatigue" }];
            sound.stampThunk();
            next.shake = prev.shake + 1;
            if (e.side === "A") statsRef.current.tookFatigue = true;
            break;
          case "TURN_START": {
            // online: the screen belongs to your side; solo: to A; hot-seat: follows the turn
            const vs = mpRef.current?.side ?? "A";
            next.banner = {
              id: animId++,
              text: hotseatRef.current
                ? `PLAYER ${e.side === "A" ? "1" : "2"}'S TURN`
                : e.side === vs
                  ? "YOUR TURN"
                  : "THEIR TURN",
              tone: "ink",
            };
            sound.stampThunk();
            const st = statsRef.current;
            st.maxTurnDamage = Math.max(st.maxTurnDamage, st.turnDamage);
            st.maxTurnKills = Math.max(st.maxTurnKills, st.turnKills);
            st.turnDamage = 0;
            st.turnKills = 0;
            break;
          }
          case "GAME_OVER":
            ambient.swell();
            break;
        }
      }
      // expire floaters & dust after their animation window
      const ids = next.floaters.map((f) => f.id);
      const dustIds = next.dust.map((d) => d.id);
      window.setTimeout(() => {
        setAnim((cur) => ({
          ...cur,
          floaters: cur.floaters.filter((f) => !ids.includes(f.id)),
          dust: cur.dust.filter((d) => !dustIds.includes(d.id)),
        }));
      }, 950);
      window.setTimeout(() => setAnim((cur) => (cur.lungingUid ? { ...cur, lungingUid: null } : cur)), 340);
      window.setTimeout(() => setAnim((cur) => (cur.slash ? { ...cur, slash: null } : cur)), 280);
      window.setTimeout(() => setAnim((cur) => (cur.banner ? { ...cur, banner: null } : cur)), 1150);
      return next;
    });
  }, []);

  // ── action plumbing ───────────────────────────────────────────────────
  // Local actions: apply optimistically (same path hotseat uses, so drained
  // events animate instantly) then POST to the tape at seq = tape length.
  // Remote actions arrive through the poll and flow through the same path.
  const doAction = useCallback(
    (action: Action) => {
      actionsRef.current.push(action);
      const mp = mpRef.current;
      let seq: number | null = null;
      if (mp) {
        seq = mpTapeRef.current.length;
        mpTapeRef.current.push(action);
      }
      setState((prev) => {
        if (!prev) return prev;
        const next = applyAction(prev, action);
        processEvents(next);
        return next;
      });
      setTargeting(null);
      if (mp && seq !== null) {
        void mpAction(mp.duelId, mp.side, seq, action).then(() => {
          // 403/409/network failures are ignored on purpose: the action never
          // joined the server tape, and the poll's seq check reconciles.
        });
      }
    },
    [processEvents],
  );

  // ── ambient soundscape follows the game phase ─────────────────────────
  useEffect(() => {
    if (!state) return;
    if (state.phase === "MULLIGAN") ambient.setPhase("mulligan");
    else if (state.phase === "GAME_OVER") ambient.setPhase("over");
    else if (hotseat || state.current === viewerSideOf(hotseat, mpInfo?.side ?? null, state)) ambient.setPhase("player");
    else ambient.setPhase("opponent");
    // board density feeds the bed — ten slots total; empty boards settle it back to rest
    const alive = state.players.A.board.length + state.players.B.board.length;
    ambient.setIntensity(state.phase === "TURN" ? alive / 10 : 0);
  }, [state, hotseat, mpInfo]);

  useEffect(() => {
    return () => ambient.stop();
  }, []);

  // record match result once — server recomputes Elo; local fallback offline.
  // Hot-seat duels are friendly: no posting, no MMR. Campaign duels report to
  // the campaign ledger instead of the ranked ladder.
  useEffect(() => {
    if (!state || state.phase !== "GAME_OVER" || result) return;
    if (hotseat) {
      const r = state.winner === "A" ? "WIN" : state.winner === "B" ? "LOSS" : "DRAW";
      // eslint-disable-next-line react-hooks/set-state-in-effect -- friendly duels resolve without a server round-trip
      setResult({ result: r, mmrBefore: 0, mmrAfter: 0 });
      if (r !== "DRAW") sound.victoryDing(state.seed);
      else sound.defeatNote(state.seed);
      return;
    }
    if (mpInfo) {
      // state.winner is already side-keyed — map it to your perspective for the
      // overlay and report it verbatim; the server verifies by replaying the tape
      const w = state.winner;
      const r: "WIN" | "LOSS" | "DRAW" = w === mpInfo.side ? "WIN" : w === "draw" || w === null ? "DRAW" : "LOSS";
      const mpWinner: "A" | "B" | "DRAW" = w === "A" || w === "B" ? w : "DRAW";
      void (async () => {
        await mpResult({
          duelId: mpInfo.duelId,
          winner: mpWinner,
          turns: state.sideTurns.A,
          playerHpLeft: state.players.A.heroHp,
          botHpLeft: state.players.B.heroHp,
          seed: state.seed,
          durationMs: Date.now() - statsRef.current.startedAt,
        });
        setResult({ result: r, mmrBefore: 0, mmrAfter: 0 });
        if (r === "WIN") sound.victoryDing(state.seed);
        else if (r === "LOSS") sound.defeatNote(state.seed);
      })();
      return;
    }
    const stageParam = searchParams.get("campaign");
    const campaignIdx = stageParam !== null ? Number(stageParam) : null;
    if (campaignIdx !== null) {
      const r = state.winner === "A" ? "WIN" : state.winner === "B" ? "LOSS" : "DRAW";
      void (async () => {
        const res = await completeCampaignStage(campaignIdx, r);
        if (res) setResult({ result: r, mmrBefore: 0, mmrAfter: 0, campaign: res });
        if (r === "WIN") sound.victoryDing(state.seed);
        else sound.defeatNote(state.seed);
      })();
      return;
    }
    if (!bot) return;
    const r = state.winner === "A" ? "WIN" : state.winner === "B" ? "LOSS" : "DRAW";
    bumpDuelCount(); // gates the deep-dive tips after three ranked duels
    const st = statsRef.current;
    st.maxTurnDamage = Math.max(st.maxTurnDamage, st.turnDamage);
    st.maxTurnKills = Math.max(st.maxTurnKills, st.turnKills);
    void (async () => {
      const server = await postMatch({
        opponentKey: bot.key,
        result: r,
        turns: state.sideTurns.A,
        playerHpLeft: state.players.A.heroHp,
        botHpLeft: state.players.B.heroHp,
        seed: state.seed,
        durationMs: Date.now() - st.startedAt,
        deckUsed: st.deckEntries,
        actionLog: state.log.slice(0, 400),
        actions: actionsRef.current,
        maxTurnDamage: st.maxTurnDamage,
        maxTurnKills: st.maxTurnKills,
        tookFatigue: st.tookFatigue,
      });
      if (server) {
        if (typeof window !== "undefined") window.localStorage.setItem("inkduel:mmr", String(server.mmrAfter));
        setResult({ result: r, mmrBefore: server.mmrBefore, mmrAfter: server.mmrAfter, server });
      } else {
        const mmrBefore = localMmr();
        const { newMmr } = eloDelta(mmrBefore, bot.elo, r);
        if (typeof window !== "undefined") window.localStorage.setItem("inkduel:mmr", String(newMmr));
        setResult({ result: r, mmrBefore, mmrAfter: newMmr });
      }
      if (r === "WIN") sound.victoryDing(state.seed);
      else if (r === "LOSS") sound.defeatNote(state.seed);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-arms only on a finished game; searchParams changes restart the match instead
  }, [state, bot, result, hotseat]);

  // ── AI loop (solo only) ───────────────────────────────────────────────
  useEffect(() => {
    if (hotseat || mpInfo) return;
    const gs = stateRef.current;
    if (!gs || !bot) return;
    if (gs.phase === "MULLIGAN" && gs.mulliganDone.A && !gs.mulliganDone.B) {
      const t = window.setTimeout(() => {
        const cur = stateRef.current;
        if (!cur || cur.phase !== "MULLIGAN" || cur.mulliganDone.B) return;
        doAction(mulliganAction(cur, "B", bot.key));
      }, 900);
      return () => window.clearTimeout(t);
    }
    if (gs.phase === "TURN" && gs.current === "B") {
      const t = window.setTimeout(() => {
        const cur = stateRef.current;
        if (!cur || cur.phase !== "TURN" || cur.current !== "B") return;
        const action = decideAction(cur, "B", bot.key);
        if (action) doAction(action);
      }, 700);
      return () => window.clearTimeout(t);
    }
  }, [state, bot, doAction, hotseat, mpInfo]);

  // ── online: pull the rival's actions off the tape ─────────────────────
  /** Full resync from the tape: seed + decks + every recorded action, replayed
   *  silently. Used when the server tape disagrees with the local replay —
   *  e.g. our optimistic action was rejected (403/409) and the rival moved. */
  const resyncMp = useCallback(async () => {
    const mp = mpRef.current;
    if (!mp) return;
    const st = await mpState(mp.duelId, -1);
    if (!st || !st.deckA || !st.deckB) return;
    const stash = readMpDuel(mp.duelId);
    if (!stash) return;
    let gs = createGame(
      stash.seed,
      expandDeck(st.deckA as DeckEntry[]),
      expandDeck(st.deckB as DeckEntry[]),
      "A",
      st.playerAName ?? "Player A",
      st.playerBName ?? "Rival",
    );
    const tape: Action[] = [];
    for (const row of st.actions) {
      const action = row.action as Action;
      tape.push(action);
      gs = applyAction(gs, action);
      drainEvents(gs);
    }
    mpTapeRef.current = tape;
    setState(gs);
  }, []);

  /** One poll pass: fetch unseen actions and apply them in seq order through
   *  the same apply+animate path local (and hot-seat) actions use. */
  const pollMp = useCallback(async () => {
    const mp = mpRef.current;
    if (!mp) return;
    const tape = mpTapeRef.current;
    // `since` is the last seq already held (exclusive response) — the first
    // unseen action lands exactly at tape.length
    const st = await mpState(mp.duelId, tape.length - 1);
    if (!st || st.actions.length === 0) return;
    // tape discipline: the first unseen action must land exactly at the local
    // tape's end — anything else means the server won a race we lost
    if (st.actions[0].seq !== tape.length) {
      await resyncMp();
      return;
    }
    for (const row of st.actions) {
      const action = row.action as Action;
      mpTapeRef.current.push(action);
      setState((prev) => {
        if (!prev) return prev;
        const next = applyAction(prev, action);
        processEvents(next); // remote actions animate exactly like local ones
        return next;
      });
    }
  }, [processEvents, resyncMp]);

  useEffect(() => {
    if (!mp) return;
    const iv = window.setInterval(() => {
      void (async () => {
        if (mpPollBusyRef.current) return;
        const cur = stateRef.current;
        if (!cur || cur.phase === "GAME_OVER") return;
        mpPollBusyRef.current = true;
        try {
          await pollMp();
        } finally {
          mpPollBusyRef.current = false;
        }
      })();
    }, 1200);
    return () => window.clearInterval(iv);
  }, [mp, pollMp]);

  // ── turn timer ────────────────────────────────────────────────────────
  // Input gate: solo locks to A, hot-seat follows the turn, online locks to
  // your side — every mutating handler checks isPlayerTurn.
  const viewerSide: Side = mpInfo?.side ?? "A";
  const isPlayerTurn = !!state && state.phase === "TURN" && (hotseat || state.current === viewerSide);
  const autoEndSide: Side = hotseat ? state?.current ?? "A" : viewerSide;
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the countdown intentionally resets at each turn change
    setTimer(TURN_SECONDS);
    if (!isPlayerTurn) return;
    const iv = window.setInterval(() => {
      setTimer((t) => {
        if (t <= 1) {
          window.clearInterval(iv);
          const cur = stateRef.current;
          if (cur && cur.phase === "TURN" && (hotseat || cur.current === autoEndSide)) {
            doAction({ type: "END_TURN", side: autoEndSide });
            if (hotseat) setAwaitingPass(true);
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => window.clearInterval(iv);
  }, [isPlayerTurn, doAction, state?.turn, hotseat, autoEndSide]);

  // ── legal action lookup ───────────────────────────────────────────────
  const legal = useMemo(() => (state ? getLegalActions(state) : null), [state]);
  const playsByUid = useMemo(() => new Map((legal?.plays ?? []).map((p) => [p.uid, p])), [legal]);
  const attacksByUid = useMemo(() => new Map((legal?.attacks ?? []).map((a) => [a.attackerUid, a])), [legal]);

  const highlightedTargets = useMemo(() => {
    if (!targeting || !legal) return new Set<string>();
    const set = new Set<string>();
    for (const t of targeting.targets) {
      if ("uid" in t) set.add(t.uid);
      else set.add(`h:${t.hero}`);
    }
    return set;
  }, [targeting, legal]);

  // ── onboarding tutorial: one contextual tip at a time ─────────────────
  // Derived from the action log (render-safe) rather than refs.
  const hasPlayed = useMemo(
    () => !!state && state.log.some((l) => l.side === "A" && / plays | casts /.test(l.text)),
    [state],
  );
  const hasAttacked = useMemo(
    () => !!state && state.log.some((l) => l.side === "A" && / strikes | attacks /.test(l.text)),
    [state],
  );
  const currentTip = useMemo<keyof TutorialFlags | null>(() => {
    if (!state || hotseat || mpInfo) return null; // tips are for solo duels only
    if (tutorial.tipWelcome && state.phase === "MULLIGAN") return "tipWelcome";
    if (!isPlayerTurn) return null;
    if (tutorial.tipMana) return "tipMana";
    if (tutorial.tipPlay && !hasPlayed) return "tipPlay";
    if (tutorial.tipAttack && hasPlayed && !hasAttacked) return "tipAttack";
    if (tutorial.tipWin && hasAttacked) return "tipWin";
    if (tutorial.tipTempo && state.turn >= 3) return "tipTempo";
    // deep dives: only once the player has three ranked duels behind them
    const veteran = readDuelCount() >= 3;
    if (!veteran) return null;
    if (tutorial.tipGuardMath && state.players.B.board.some((u) => u.keywords.includes("guard")) && state.turn >= 2) {
      return "tipGuardMath";
    }
    if (tutorial.tipFatigue && state.players.A.deck.length <= 8) return "tipFatigue";
    if (tutorial.tipTempoAdvanced && state.turn >= 5) return "tipTempoAdvanced";
    return null;
  }, [state, hotseat, mpInfo, tutorial, isPlayerTurn, hasPlayed, hasAttacked]);

  const dismissTip = useCallback((tip: keyof TutorialFlags) => {
    setTutorial((prev) => ({ ...prev, [tip]: false }));
    dismissTutorialTip(tip);
  }, []);

  // ── interactions ──────────────────────────────────────────────────────
  const actSide: Side = state?.current ?? "A";
  const onHandCardClick = (uid: string) => {
    if (!state || !isPlayerTurn) return;
    if (targeting?.uid === uid) {
      setTargeting(null);
      return;
    }
    const play = playsByUid.get(uid);
    if (!play) return;
    sound.pop();
    if (play.targets.length > 0) {
      setTargeting({ kind: "play", uid, targets: play.targets });
    } else {
      doAction({ type: "PLAY_CARD", side: actSide, uid });
    }
  };

  const onBoardUnitClick = (uid: string, side: "A" | "B") => {
    if (!state || !isPlayerTurn) return;
    if (targeting && highlightedTargets.has(uid)) {
      if (targeting.kind === "play") doAction({ type: "PLAY_CARD", side: actSide, uid: targeting.uid, target: { uid } });
      else doAction({ type: "ATTACK", side: actSide, attackerUid: targeting.uid, target: { uid } });
      return;
    }
    if (side === actSide) {
      const atk = attacksByUid.get(uid);
      if (!atk) return;
      sound.pop();
      if (targeting?.uid === uid) setTargeting(null);
      else setTargeting({ kind: "attack", uid, targets: atk.targets });
    }
  };

  const onHeroClick = (hero: "A" | "B") => {
    if (!state || !isPlayerTurn || !targeting) return;
    if (highlightedTargets.has(`h:${hero}`)) {
      if (targeting.kind === "play") doAction({ type: "PLAY_CARD", side: actSide, uid: targeting.uid, target: { hero } });
      else doAction({ type: "ATTACK", side: actSide, attackerUid: targeting.uid, target: { hero } });
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setTargeting(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // whose mulligan is on screen: A first; then B in hot-seat (the AI covers B solo)
  const mulliganSide: Side | null =
    state && state.phase === "MULLIGAN"
      ? !state.mulliganDone.A
        ? "A"
        : !state.mulliganDone.B
          ? "B"
          : null
      : null;
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fresh picks per mulligan side
    setMulliganPicks(new Set());
  }, [mulliganSide]);

  if (!state || (!bot && !hotseat && !mp)) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-6 text-center">
        {mpError ? (
          <div className="flex flex-col items-center gap-5">
            <HandNote className="max-w-md text-2xl leading-snug">{mpError}</HandNote>
            <Link href="/multiplayer" className="stamp-btn focus-ink label-type px-4 py-2 text-xs">
              Back to the lobby
            </Link>
          </div>
        ) : (
          <p className="label-type animate-pulse text-sm text-graphite">
            {mp ? "Opening the duel — waiting for both decks…" : "Preparing the duel…"}
          </p>
        )}
      </main>
    );
  }

  const viewer: Side = mpInfo ? mpInfo.side : hotseat ? state.current : "A";
  const me = state.players[viewer];
  const foe = state.players[OTHER[viewer]];
  const targetingActive = !!targeting;

  const floatersFor = (key: string) =>
    anim.floaters
      .filter((f) => f.key === key)
      .map((f) => <Floater key={f.id} id={f.id} n={f.n} kind={f.kind} />);
  const slashFor = (key: string) =>
    anim.slash?.key === key ? <InkSlash key={anim.slash.id} id={anim.slash.id} /> : null;
  const dustFor = (key: string) =>
    anim.dust.filter((d) => d.key === key).map((d) => <DustBurst key={d.id} id={d.id} />);

  const slotCells = (side: "A" | "B") => {
    const board = state.players[side].board;
    return Array.from({ length: 5 }, (_, i) => {
      const u = board[i];
      if (!u) {
        return (
          <div
            key={`slot-${side}-${i}`}
            aria-hidden
            className="rounded-full border-2 border-dashed"
            style={{ width: "var(--unit-w, 108px)", aspectRatio: "5 / 6.4", borderColor: "color-mix(in srgb, var(--color-pencil) 60%, transparent)" }}
          />
        );
      }
      const highlight = targetingActive && highlightedTargets.has(u.uid);
      const dimmed = targetingActive && !highlight;
      return (
        <AnimatePresence key={u.uid} mode="popLayout" initial={false}>
          <BoardUnit
            unit={u}
            side={side}
            highlight={highlight}
            dimmed={dimmed}
            lunging={anim.lungingUid === u.uid}
            floaters={
              <>
                {floatersFor(`u:${u.uid}`)}
                {dustFor(`u:${u.uid}`)}
                {slashFor(`u:${u.uid}`)}
              </>
            }
            onClick={
              isPlayerTurn && ((side === viewer && attacksByUid.has(u.uid)) || highlight)
                ? () => onBoardUnitClick(u.uid, side)
                : undefined
            }
          />
        </AnimatePresence>
      );
    });
  };

  return (
    <main
      className="relative flex min-h-dvh flex-col overflow-hidden"
      onContextMenu={(e) => {
        if (targeting) {
          e.preventDefault();
          setTargeting(null);
        }
      }}
    >
      {anim.banner && <TurnBanner key={anim.banner.id} text={anim.banner.text} tone={anim.banner.tone} />}
      <LegendaryFlourish flourish={anim.flourish ? { ...anim.flourish } : null} />
      <TutorialTip tip={currentTip} onDismiss={dismissTip} />

      {/* shake wrapper */}
      <motion.div
        key={anim.shake || 0}
        className="flex flex-1 flex-col"
        animate={reduce || anim.shake === 0 ? {} : { x: [0, -5, 5, -3, 0], y: [0, 2, -2, 1, 0] }}
        transition={{ duration: 0.22 }}
      >
        {/* ── opponent row ── */}
        <section className="flex items-start justify-between gap-4 px-4 pt-4 md:px-8">
          <HeroPlate
            name={foe.name}
            hp={foe.heroHp}
            side={OTHER[viewer]}
            label="OPPONENT"
            active={state.current === OTHER[viewer] && state.phase === "TURN"}
            highlight={targetingActive && highlightedTargets.has(`h:${OTHER[viewer]}`)}
            dimmed={targetingActive && !highlightedTargets.has(`h:${OTHER[viewer]}`)}
            onClick={targetingActive && highlightedTargets.has(`h:${OTHER[viewer]}`) ? () => onHeroClick(OTHER[viewer]) : undefined}
            floaters={
              <>
                {floatersFor(`h:${OTHER[viewer]}`)}
                {slashFor(`h:${OTHER[viewer]}`)}
              </>
            }
            sub={mpInfo ? "online rival" : bot ? `${bot.name} · ${bot.elo} MMR` : "challenger"}
          />
          {/* the rival's area slot — its wash covers their half of the table */}
          <AreaSlot cardId={state.areas[OTHER[viewer]]} tipBelow />
          <div className="flex flex-col items-end gap-1">
            <div className="flex -space-x-6">
              {foe.hand.map((c) => (
                <CardBack key={c.uid} w={44} />
              ))}
            </div>
            <ManaCrystals available={foe.mana} cap={foe.maxMana} temp={foe.tempMana} />
          </div>
          <DeckPile count={foe.deck.length} label="Opponent deck" />
        </section>

        {/* ── enemy board ── */}
        <section className="ruled relative mx-2 mt-3 flex min-h-[24vh] flex-1 items-center justify-center gap-1.5 px-2 py-3 md:mx-8 md:gap-3 md:px-4" style={{ background: "var(--color-paper-deep)" }}>
          <BoardWash wash={areaWashOf(state.areas[OTHER[viewer]])} reduce={!!reduce} />
          <div className="flex items-center gap-1.5 md:gap-3">{slotCells(OTHER[viewer])}</div>
        </section>

        {/* ── divider ── */}
        <div className="relative mx-4 my-1 flex items-center justify-center md:mx-8">
          <svg viewBox="0 0 400 20" className="h-5 w-full" preserveAspectRatio="none" aria-hidden>
            <path d="M0 10 C80 6 160 14 240 10 C300 7 360 12 400 10" fill="none" stroke="var(--color-pencil)" strokeWidth="2" strokeDasharray="7 5" />
          </svg>
          <span className="font-hand absolute -top-1 text-xl text-graphite">vs</span>
        </div>

        {/* ── player board ── */}
        <section className="ruled relative mx-2 flex min-h-[24vh] flex-1 items-center justify-center gap-1.5 px-2 py-3 md:mx-8 md:gap-3 md:px-4" style={{ background: "var(--color-paper-deep)" }}>
          <BoardWash wash={areaWashOf(state.areas[viewer])} reduce={!!reduce} />
          <div className="flex items-center gap-1.5 md:gap-3">{slotCells(viewer)}</div>
        </section>

        {/* ── player row: info + end turn ── */}
        <section className="flex items-end justify-between gap-4 px-4 pt-3 md:px-8">
          <HeroPlate
            name={me.name}
            hp={me.heroHp}
            side={viewer}
            label={hotseat ? (viewer === "A" ? "PLAYER 1" : "PLAYER 2") : "YOU"}
            active={isPlayerTurn}
            highlight={targetingActive && highlightedTargets.has(`h:${viewer}`)}
            dimmed={targetingActive && !highlightedTargets.has(`h:${viewer}`)}
            onClick={targetingActive && highlightedTargets.has(`h:${viewer}`) ? () => onHeroClick(viewer) : undefined}
            floaters={
              <>
                {floatersFor(`h:${viewer}`)}
                {slashFor(`h:${viewer}`)}
              </>
            }
            sub={`Mana ${me.mana}/${me.maxMana}`}
          />
          {/* your area slot — set one out from the hand to claim the table */}
          <AreaSlot cardId={state.areas[viewer]} />
          <div className="flex flex-col items-center gap-1 pb-2">
            <ManaCrystals available={me.mana} cap={me.maxMana} temp={me.tempMana} />
            <StampButton
              onClick={() => {
                if (!isPlayerTurn) return;
                doAction({ type: "END_TURN", side: viewer });
                if (hotseat) setAwaitingPass(true);
              }}
              disabled={!isPlayerTurn}
              className="min-w-28 md:min-w-36"
            >
              {isPlayerTurn ? (hotseat ? `Pass Device · ${timer}s` : `End Turn · ${timer}s`) : "Their Turn"}
            </StampButton>
          </div>
          <DeckPile count={me.deck.length} label="Your deck" />
        </section>

        {/* ── hand ── */}
        <section className="mt-2 min-h-[150px] px-2 pb-2 md:min-h-[180px] md:px-6">
          <div className="flex items-end justify-start gap-0 overflow-x-auto px-6 md:justify-center" style={{ minHeight: 140 }}>
            {me.hand.map((card, i) => {
              const play = playsByUid.get(card.uid);
              const playable = !!play && isPlayerTurn;
              const n = me.hand.length;
              const mid = (n - 1) / 2;
              const spread = Math.min(4.2, 22 / n);
              const rot = (i - mid) * spread;
              const droop = Math.pow(i - mid, 2) * Math.min(1.7, 28 / n);
              const overlap = n <= 5 ? 12 : n <= 7 ? 26 : 44;
              const selected = targeting?.uid === card.uid;
              const def = getCard(card.cardId);
              const isArea = def.type === "area" && !!def.wash;
              return (
                <motion.div
                  key={card.uid}
                  className="relative"
                  style={{ zIndex: i, marginLeft: i === 0 ? 0 : -overlap, transformOrigin: "50% 130%" }}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, y: 120 }}
                  animate={{ opacity: 1, y: selected ? -48 : droop, rotate: selected ? 0 : rot }}
                  transition={{ type: "spring", stiffness: 260, damping: 24 }}
                  whileHover={playable ? { y: -28, rotate: 0, scale: 1.07, zIndex: 50 } : undefined}
                >
                  <button
                    type="button"
                    className={`focus-ink block ${playable ? "cursor-pointer" : "cursor-default"}`}
                    onClick={() => onHandCardClick(card.uid)}
                    aria-label={`${def.type === "area" ? "Set out" : "Play"} ${def.name}`}
                  >
                    <div
                      style={
                        isArea
                          ? {
                              borderRadius: "var(--cut-b)",
                              boxShadow: `0 0 0 2.5px ${washInk(def.wash as Wash)}`,
                            }
                          : undefined
                      }
                    >
                      <CardFace
                        card={def}
                        size="hand"
                        rotation={0}
                        highlight={selected}
                        dimmed={targetingActive && !selected}
                      />
                    </div>
                  </button>
                  {playable && (
                    <span aria-hidden className="absolute -top-1 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full border border-ink bg-paper-deep" />
                  )}
                </motion.div>
              );
            })}
          </div>
        </section>
      </motion.div>

      {/* targeting hint */}
      {targetingActive && (
        <div className="pointer-events-none fixed inset-x-0 top-2 z-40 flex justify-center">
          <span className="ink-frame label-type px-4 py-1.5 text-xs">
            Choose a target — ESC, right-click, or tap the card again to cancel
          </span>
        </div>
      )}

      {/* top-left controls */}
      <div className="fixed left-3 top-3 z-30 flex gap-2">
        <StampButton size="sm" onClick={() => setLogOpen((v) => !v)}>
          Log
        </StampButton>
        <StampButton
          size="sm"
          onClick={() => {
            const m = !muted;
            setMuted(m);
            sound.setMuted(m);
          }}
        >
          {muted ? "Unmute" : "Mute"}
        </StampButton>
        <Link href="/" className="stamp-btn focus-ink label-type px-3 py-1.5 text-xs">
          Home
        </Link>
      </div>

      {/* turn log — bottom sheet on phones, side drawer on desktop */}
      <AnimatePresence>
        {logOpen && (
          <motion.aside
            key="log"
            className="ink-frame fixed inset-x-2 bottom-2 z-30 max-h-[55vh] overflow-hidden p-3 md:inset-x-auto md:bottom-auto md:right-3 md:top-14 md:max-h-[60vh] md:w-72"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 60 }}
            style={{ background: "var(--color-cardstock)" }}
          >
            <div className="label-type mb-2 flex items-center justify-between text-xs text-graphite">
              Turn log
              <button
                type="button"
                className="stamp-btn px-2 py-0.5 text-[10px] md:hidden"
                onClick={() => setLogOpen(false)}
              >
                Close
              </button>
            </div>
            <div className="max-h-[44vh] space-y-1 overflow-y-auto pr-1 md:max-h-[50vh]" style={{ fontFamily: "var(--font-type)", fontSize: 11 }}>
              {[...state.log].slice(-40).reverse().map((l, i) => (
                <p key={i} className={l.side === "A" ? "text-ink" : l.side === "B" ? "text-graphite" : "text-pencil"}>
                  {l.text}
                </p>
              ))}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── pass-the-device interstitial (hot-seat) ── */}
      <AnimatePresence>
        {hotseat && awaitingPass && state.phase !== "GAME_OVER" && (
          <motion.div
            key="pass"
            className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-6 p-6 text-center"
            style={{ background: "var(--color-paper)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={reduce ? { opacity: 0 } : { scale: 2.4, opacity: 0, rotate: 10 }}
              animate={{ scale: 1, opacity: 1, rotate: -4 }}
              transition={{ type: "spring", stiffness: 300, damping: 17 }}
            >
              <Stamp className="text-3xl md:text-5xl">PASS THE DEVICE</Stamp>
            </motion.div>
            <HandNote className="max-w-md text-2xl leading-snug">
              {state.phase === "MULLIGAN"
                ? `${state.mulliganDone.A ? "Player 2" : "Player 1"}, take the device and make your mulligan — no peeking at the other hand.`
                : `${state.current === "A" ? "Player 1" : "Player 2"}, your turn begins when you are ready.`}
            </HandNote>
            <StampButton
              size="lg"
              onClick={() => {
                ambient.start();
                sound.pop();
                setAwaitingPass(false);
              }}
            >
              I&apos;M READY
            </StampButton>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── mulligan overlay ── */}
      <AnimatePresence>
        {mulliganSide !== null && (mulliganSide === "A" || hotseat || (mp && mulliganSide === viewer)) && !(hotseat && awaitingPass) && (
          <motion.div
            key="mulligan"
            className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-4 overflow-y-auto p-4 py-8 md:gap-6 md:p-6"
            style={{ background: "rgba(244,241,234,0.94)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="relative text-center">
              <WashiTape angle={-3} className="left-1/2 top-0 -translate-x-1/2" />
              <h2 className="small-caps text-4xl font-bold">Mulligan</h2>
              <HandNote className="text-xl">
                {hotseat ? `${mulliganSide === "A" ? "Player 1" : "Player 2"} — ` : ""}tap the cards to shuffle back — you redraw the same count
              </HandNote>
            </div>
            <div className="flex flex-wrap justify-center gap-2 md:gap-4">
              {state.players[mulliganSide].hand.map((c) => {
                const picked = mulliganPicks.has(c.uid);
                const def = getCard(c.cardId);
                return (
                  <motion.button
                    key={c.uid}
                    type="button"
                    whileHover={{ y: -8, scale: 1.05 }}
                    onClick={() => {
                      sound.pop();
                      setMulliganPicks((prev) => {
                        const next = new Set(prev);
                        if (next.has(c.uid)) next.delete(c.uid);
                        else next.add(c.uid);
                        return next;
                      });
                    }}
                    className="origin-center"
                    style={{
                      transform: "scale(var(--mulligan-scale, 1))",
                      opacity: picked ? 0.45 : 1,
                      filter: picked ? "grayscale(1)" : undefined,
                    }}
                    aria-pressed={picked}
                    aria-label={`${picked ? "Mulligan" : "Keep"} ${def.name}`}
                  >
                    <CardFace card={def} size="collection" className="!w-[104px] md:!w-[168px]" />
                    <span className={`label-type mt-1 block text-center text-[10px] ${picked ? "text-red-stamp" : "text-graphite"}`}>
                      {picked ? "SHUFFLE BACK" : "KEEP"}
                    </span>
                  </motion.button>
                );
              })}
            </div>
            <StampButton
              size="lg"
              onClick={() => {
                ambient.start();
                doAction({ type: "MULLIGAN", side: mulliganSide, uids: [...mulliganPicks] });
                if (hotseat && mulliganSide === "A") setAwaitingPass(true);
              }}
            >
              Confirm Mulligan
            </StampButton>
          </motion.div>
        )}
        {/* online: the rival mulligans first (or second) — show their slot is pending */}
        {mp && state.phase === "MULLIGAN" && mulliganSide !== null && mulliganSide !== viewer && !mpError && (
          <motion.div
            key="mulligan-wait"
            className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-4 p-6 text-center"
            style={{ background: "rgba(244,241,234,0.94)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Stamp className="text-3xl md:text-4xl">MULLIGAN</Stamp>
            <HandNote className="text-xl leading-snug">your rival is shaping their opening hand — yours is next…</HandNote>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── end screen ── */}
      <AnimatePresence>
        {state.phase === "GAME_OVER" && result && (
          <motion.div
            key="end"
            className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8"
            style={{ background: "rgba(244,241,234,0.94)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={reduce ? { opacity: 0 } : { scale: 3, opacity: 0, rotate: -14 }}
              animate={{ scale: 1, opacity: 1, rotate: -8 }}
              transition={{ type: "spring", stiffness: 320, damping: 18 }}
            >
              <Stamp tone={hotseat ? "ink" : result.result === "WIN" ? "ink" : "red"} className="text-6xl md:text-8xl">
                {hotseat
                  ? state.winner === "draw"
                    ? "DRAW"
                    : "VICTORY"
                  : result.result === "WIN"
                    ? "VICTORY"
                    : result.result === "LOSS"
                      ? "DEFEAT"
                      : "DRAW"}
              </Stamp>
            </motion.div>
            {hotseat ? (
              <div className="text-center">
                <div className="small-caps text-3xl font-semibold">
                  {state.winner === "draw" ? "Both heroes fall together" : `${state.players[state.winner === "A" ? "A" : "B"].name} takes the duel`}
                </div>
                <HandNote className="mt-1 text-2xl">a friendly duel — the record book stays blank</HandNote>
              </div>
            ) : mpInfo ? (
              <div className="flex flex-col items-center gap-2 text-center">
                <div className="small-caps text-3xl font-semibold">
                  {state.winner === "draw"
                    ? "Both heroes fall together"
                    : `${state.players[state.winner === "A" ? "A" : "B"].name} takes the duel`}
                </div>
                <HandNote className="mt-1 text-2xl">the tape was replayed and verified — the result stands</HandNote>
              </div>
            ) : result.campaign ? (
              <div className="flex flex-col items-center gap-2 text-center">
                <div className="label-type text-lg" style={{ color: "var(--color-red-stamp)" }}>
                  +{result.campaign.coinsAwarded} INK
                </div>
                {result.campaign.rewardCard && (
                  <div className="flex flex-col items-center gap-1">
                    <HandNote className="text-2xl">stage loot!</HandNote>
                    <Stamp tone="ink" className="text-sm">
                      UNLOCKS: {getCard(result.campaign.rewardCard).name}
                    </Stamp>
                  </div>
                )}
                {result.campaign.replay && <HandNote className="text-xl">a replayed stage — a modest purse</HandNote>}
                <div className="mt-3">
                  <Link href="/campaign" className="label-type text-xs underline">
                    back to the campaign map →
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <MmrCountUp
                  before={result.mmrBefore}
                  after={result.mmrAfter}
                  rankBefore={result.server?.rankBefore}
                  rankAfter={result.server?.rankAfter}
                />
                {result.server && result.server.newAchievements.length > 0 && (
                  <div className="flex flex-col items-center gap-2">
                    <HandNote className="text-2xl">stamp received!</HandNote>
                    <div className="flex flex-wrap justify-center gap-3">
                      {result.server.newAchievements.map((a) => (
                        <motion.div
                          key={a.key}
                          initial={reduce ? { opacity: 0 } : { scale: 2, opacity: 0, rotate: 10 }}
                          animate={{ scale: 1, opacity: 1, rotate: -3 }}
                          transition={{ delay: 0.6, type: "spring", stiffness: 300, damping: 16 }}
                          className="flex flex-col items-center gap-1"
                        >
                          <Stamp className="text-sm">{a.name}</Stamp>
                          <span className="label-type text-[10px] text-graphite">{a.description}</span>
                          {a.unlocksCard && (
                            <span className="label-type text-[10px]" style={{ color: "var(--color-red-stamp)" }}>
                              UNLOCKS: {getCard(a.unlocksCard).name}
                            </span>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
                <p className="font-hand text-2xl text-graphite">vs {bot?.name} · {bot?.blurb}</p>
              </>
            )}
            <div className="flex gap-4">
              {mpInfo ? (
                <Link href="/multiplayer" className="stamp-btn focus-ink label-type px-8 py-4 text-lg">
                  New Duel
                </Link>
              ) : (
                <StampButton size="lg" onClick={startMatch}>
                  Play Again
                </StampButton>
              )}
              <Link href="/" className="stamp-btn focus-ink label-type px-8 py-4 text-lg">
                Home
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

/** Typewriter MMR count-up for the end screen. */
function MmrCountUp({
  before,
  after,
  rankBefore,
  rankAfter,
}: {
  before: number;
  after: number;
  rankBefore?: string;
  rankAfter?: string;
}) {
  const [value, setValue] = useState(before);
  useEffect(() => {
    if (before === after) return;
    const dir = after > before ? 1 : -1;
    const steps = Math.abs(after - before);
    let i = 0;
    const iv = window.setInterval(() => {
      i++;
      setValue(before + dir * Math.min(i, steps));
      if (i >= steps) window.clearInterval(iv);
    }, 40);
    return () => window.clearInterval(iv);
  }, [before, after]);
  return (
    <div className="text-center">
      <div className="label-type text-sm text-graphite">MMR</div>
      <div className="text-5xl font-bold" style={{ fontFamily: "var(--font-type)" }}>
        {value}
      </div>
      <div className="label-type mt-1 text-xs">
        {rankBefore ?? ""} {rankAfter && rankAfter !== rankBefore ? `→ ${rankAfter}` : ""}
      </div>
    </div>
  );
}

