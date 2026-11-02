"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { applyAction, createGame, drainEvents, type Action, type GameState, type Side, type UnitInstance } from "@/game/engine";
import { getCard } from "@/game/cards";
import { expandDeck, type DeckEntry } from "@/game/decks";
import { mpSpectate } from "@/lib/api";
import { HandNote, Panel, Stamp, WashiTape } from "@/components/paper";

/**
 * /spectate — a lean, read-only seat in the gallery. Polls /api/mp/state
 * (by invite code or duelId) every 2s, replays the action tape through the
 * deterministic engine, and renders only what the table shows anyway:
 * hero names + HP, board units, deck counts, mana, whose turn, MOVE count.
 * No interactivity, no hands — the tape keeps everyone honest.
 */

const POLL_MS = 2000;

type Phase = "loading" | "waiting" | "live" | "finished" | "abandoned" | "missing";

interface SpectateView {
  phase: Phase;
  /** Duel-level winner ("A" | "B" | "DRAW") once the duel is finished. */
  winner: "A" | "B" | "DRAW" | null;
  moves: number;
  game: GameState | null;
  note: string | null;
}

export default function SpectateClient() {
  const reduce = useReducedMotion();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const duelId = searchParams.get("duelId");
  const target = useMemo(
    () => (code ? { code: code.toUpperCase() } : duelId ? { duelId } : null),
    [code, duelId],
  );
  const [view, setView] = useState<SpectateView>(() =>
    target ? { phase: "loading", winner: null, moves: 0, game: null, note: null } : { phase: "missing", winner: null, moves: 0, game: null, note: null },
  );
  // refs the poll loop mutates without re-rendering: the replayed game, the
  // tape so far, and a re-entrancy guard
  const gameRef = useRef<GameState | null>(null);
  const tapeRef = useRef<Action[]>([]);
  const busyRef = useRef(false);

  /** One poll pass: fetch unseen actions and replay them silently. Returns
   *  "stop" when the duel reached a terminal state and polling should end. */
  const poll = useCallback(async (): Promise<"stop" | undefined> => {
    if (!target || busyRef.current) return undefined;
    busyRef.current = true;
    try {
      const st = await mpSpectate(target, tapeRef.current.length - 1);
      if (!st) {
        // 404 — no duel answers to this address. Settle into the empty state.
        setView({ phase: "missing", winner: null, moves: 0, game: null, note: "no duel answers to this address" });
        return "stop";
      }
      if (st.status === "abandoned") {
        setView({ phase: "abandoned", winner: null, moves: 0, game: null, note: "the duel was struck from the record" });
        return "stop";
      }
      if (st.status === "waiting" || !st.deckA || !st.deckB || typeof st.seed !== "number") {
        // the rival has not taken their seat yet — nothing to replay
        setView((prev) => ({ ...prev, phase: "waiting", moves: tapeRef.current.length }));
        return undefined;
      }
      // (re)build the game when this is the first pass or the tape disagrees
      if (!gameRef.current || (st.actions.length > 0 && st.actions[0]!.seq !== tapeRef.current.length)) {
        let gs = createGame(
          st.seed,
          expandDeck(st.deckA as DeckEntry[]),
          expandDeck(st.deckB as DeckEntry[]),
          "A",
          st.playerAName ?? "Player A",
          st.playerBName ?? "Player B",
        );
        tapeRef.current = [];
        for (const row of st.actions) {
          const action = row.action as Action;
          tapeRef.current.push(action);
          gs = applyAction(gs, action);
          drainEvents(gs); // silent replay: the gallery sees the position, not the fireworks
        }
        gameRef.current = gs;
      } else {
        for (const row of st.actions) {
          const action = row.action as Action;
          tapeRef.current.push(action);
          const next = applyAction(gameRef.current, action);
          drainEvents(next);
          gameRef.current = next;
        }
      }
      const finished = st.status === "finished";
      setView({
        phase: finished ? "finished" : "live",
        winner: st.winner ?? null,
        moves: tapeRef.current.length,
        game: gameRef.current,
        note: null,
      });
      return finished ? "stop" : undefined;
    } finally {
      busyRef.current = false;
    }
  }, [target]);

  useEffect(() => {
    gameRef.current = null;
    tapeRef.current = [];
    if (!target) return;
    let iv = 0;
    const tick = () =>
      void (async () => {
        const stop = await poll();
        if (stop === "stop") window.clearInterval(iv);
      })();
    void tick();
    iv = window.setInterval(tick, POLL_MS);
    return () => window.clearInterval(iv);
  }, [target, poll]);

  const game = view.game;
  const turnLabel = useMemo(() => {
    if (!game) return null;
    if (game.phase === "GAME_OVER") return "FINAL";
    if (game.phase === "MULLIGAN") return "OPENING HANDS";
    return `${game.players[game.current].name.toUpperCase()} TO MOVE`;
  }, [game]);

  const winnerName = useMemo(() => {
    if (view.phase !== "finished" || !view.winner || !game) return null;
    if (view.winner === "DRAW") return null;
    return game.players[view.winner].name;
  }, [view.phase, view.winner, game]);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 pb-16">
      <header className="relative mt-10 text-center">
        <WashiTape angle={-2} className="left-1/2 top-0 -translate-x-1/2" width={110} />
        <div className="label-type text-[11px] text-graphite">SPECTATOR GALLERY · READ-ONLY · NO HANDS SHOWN</div>
        <h1 className="small-caps mt-1 border-y-4 border-ink py-3 text-5xl font-bold">The Gallery</h1>
        <div className="label-type mt-2 flex items-center justify-between text-[11px] text-graphite">
          <span>{code ? `WATCHING BY INVITE · ${code.toUpperCase()}` : "WATCHING A DUEL"}</span>
          <Stamp className="text-[10px]">MOVE {view.moves}</Stamp>
        </div>
      </header>

      {view.phase === "missing" && (
        <Panel className="mt-10 flex flex-col items-center gap-4 p-8 text-center" deep>
          <Stamp className="text-xl">NO DUEL HERE</Stamp>
          <HandNote className="max-w-md text-2xl leading-snug">
            {target
              ? "no duel answers to this address — check the invite code, or start a fresh one"
              : "this page watches a duel by invitation — open the lobby and take a seat, then send your friends here"}
          </HandNote>
          <Link href="/multiplayer" className="stamp-btn focus-ink label-type px-4 py-2 text-xs">
            To the lobby
          </Link>
        </Panel>
      )}

      {view.phase === "abandoned" && (
        <Panel className="mt-10 flex flex-col items-center gap-4 p-8 text-center" deep>
          <Stamp className="text-xl">STRUCK FROM THE RECORD</Stamp>
          <HandNote className="max-w-md text-2xl leading-snug">{view.note}</HandNote>
          <Link href="/multiplayer" className="stamp-btn focus-ink label-type px-4 py-2 text-xs">
            To the lobby
          </Link>
        </Panel>
      )}

      {(view.phase === "waiting" || view.phase === "loading") && (
        <Panel className="mt-10 flex flex-col items-center gap-4 p-8 text-center">
          <Stamp className={`text-xl ${view.phase === "waiting" ? "animate-pulse" : ""}`}>
            {view.phase === "waiting" ? "SEAT OPEN" : "FINDING YOUR SEAT"}
          </Stamp>
          <HandNote className="max-w-md text-2xl leading-snug">
            {view.phase === "waiting"
              ? "the table is set and one chair is empty — the duel begins the moment a rival joins"
              : "flipping through the archive for this duel…"}
          </HandNote>
          <p className="label-type text-[10px] text-graphite">THE GALLERY REFRESHES ITSELF EVERY FEW SECONDS</p>
        </Panel>
      )}

      {(view.phase === "live" || view.phase === "finished") && game && (
        <section className="mt-8">
          <div className="label-type flex items-center justify-between border-b-2 border-ink pb-2 text-[11px] text-graphite">
            <span>{turnLabel}</span>
            <span>
              TURN {Math.max(game.sideTurns.A, game.sideTurns.B)} · {view.moves} MOVES ON THE TAPE
            </span>
          </div>

          {/* side A */}
          <SpectatorRow side="A" game={game} reduce={!!reduce} />
          <div className="relative mx-4 my-1 flex items-center justify-center md:mx-8">
            <svg viewBox="0 0 400 20" className="h-5 w-full" preserveAspectRatio="none" aria-hidden>
              <path d="M0 10 C80 6 160 14 240 10 C300 7 360 12 400 10" fill="none" stroke="var(--color-pencil)" strokeWidth="2" strokeDasharray="7 5" />
            </svg>
            <span className="font-hand absolute -top-1 text-xl text-graphite">vs</span>
          </div>
          {/* side B */}
          <SpectatorRow side="B" game={game} reduce={!!reduce} />

          <AnimatePresence>
            {view.phase === "finished" && (
              <motion.div
                key="final"
                className="mt-10 flex flex-col items-center gap-3 text-center"
                initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
              >
                <Stamp className="text-4xl md:text-6xl">{view.winner === "DRAW" ? "DRAW" : "FINAL"}</Stamp>
                <HandNote className="text-2xl leading-snug">
                  {winnerName ? `${winnerName} takes the duel — ` : "both heroes fall together — "}
                  the tape stands as written, and the gallery goes home dry.
                </HandNote>
                <Link href="/multiplayer" className="label-type focus-ink text-xs underline underline-offset-4">
                  watch another duel →
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      )}

      <div className="mt-10 text-center">
        <Stamp className="text-xs">THE GALLERY SEES THE TABLE, NEVER THE HANDS</Stamp>
      </div>
    </main>
  );
}

/** One side of the table, spectator-cut: hero line, board chips, nothing else. */
function SpectatorRow({ side, game, reduce }: { side: Side; game: GameState; reduce: boolean }) {
  const p = game.players[side];
  const active = game.phase === "TURN" && game.current === side;
  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-3">
          <span className="small-caps text-2xl font-semibold">{p.name}</span>
          {active && (
            <span className="label-type rounded-full px-2 py-0.5 text-[9px]" style={{ background: "var(--color-ink)", color: "var(--color-paper)" }}>
              TO MOVE
            </span>
          )}
        </div>
        <div className="label-type flex items-baseline gap-4 text-xs text-graphite">
          <span>
            HP{" "}
            <motion.span
              key={p.heroHp}
              className="inline-block text-base font-bold text-ink"
              initial={reduce ? false : { scale: 1.45 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 420, damping: 18 }}
            >
              {p.heroHp}
            </motion.span>
          </span>
          <span>
            MANA {p.mana}/{p.maxMana}
          </span>
          <span>DECK {p.deck.length}</span>
        </div>
      </div>
      <div className="ruled relative mt-2 flex min-h-20 items-center justify-center gap-2 px-3 py-3" style={{ background: "var(--color-paper-deep)" }}>
        {p.board.length === 0 ? (
          <span className="label-type text-[10px] text-pencil">AN EMPTY HALF OF THE TABLE</span>
        ) : (
          p.board.map((u) => <UnitChip key={u.uid} unit={u} />)
        )}
      </div>
    </div>
  );
}

/** A board unit as a small ink chip: card name + atk/hp. */
function UnitChip({ unit }: { unit: UnitInstance }) {
  let name = unit.cardId;
  try {
    name = getCard(unit.cardId).name;
  } catch {
    // an unknown id still shows its raw cardId — the chip stays honest
  }
  return (
    <div
      className="ink-frame-thin flex w-20 flex-col items-center px-1.5 py-1.5 text-center"
      style={{ background: "var(--color-cardstock)" }}
      title={name}
    >
      <span className="small-caps w-full truncate text-[13px] font-semibold leading-tight">{name}</span>
      <span className="label-type mt-0.5 text-[10px] text-graphite">
        {unit.attack}/{unit.health}
      </span>
    </div>
  );
}
