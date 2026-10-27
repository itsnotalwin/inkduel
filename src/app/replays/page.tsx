"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { applyAction, createGame, drainEvents, type Action, type GameState, type Side, type Target } from "@/game/engine";
import { getCard } from "@/game/cards";
import { expandDeck } from "@/game/decks";
import { botDeckIds, BOT_BY_KEY } from "@/game/ai";
import { getMatch, type MatchDetail, type ReplayAction } from "@/lib/api";
import { CardFace } from "@/components/card/CardFace";
import { HandNote, Panel, Stamp, StampButton } from "@/components/paper";
import { BoardUnit, CardBack, HeroPlate, ManaCrystals } from "@/components/duel/units";

const STEP_MS = 950;

interface ReplayFloat {
  id: number;
  key: string;
  n: number;
  kind: "damage" | "heal";
}

let floatId = 1;

function replayActionIsValid(a: ReplayAction): boolean {
  if (!a || typeof a !== "object") return false;
  if (a.type === "MULLIGAN") return Array.isArray(a.uids);
  if (a.type === "PLAY_CARD") return typeof a.uid === "string";
  if (a.type === "ATTACK") return typeof a.attackerUid === "string" && !!a.target;
  if (a.type === "END_TURN") return true;
  return false;
}

/** Narrow the stored tape entry back into a typed engine action. */
function asAction(a: ReplayAction): Action {
  const side = a.side as Side;
  const target: Target | undefined = a.target
    ? a.target.uid
      ? { uid: a.target.uid }
      : { hero: a.target.hero as Side }
    : undefined;
  switch (a.type) {
    case "MULLIGAN":
      return { type: "MULLIGAN", side, uids: a.uids ?? [] };
    case "PLAY_CARD":
      return { type: "PLAY_CARD", side, uid: a.uid ?? "", target };
    case "ATTACK":
      return { type: "ATTACK", side, attackerUid: a.attackerUid ?? "", target };
    case "END_TURN":
      return { type: "END_TURN", side };
  }
}

export default function ReplayPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-dvh items-center justify-center">
        <p className="label-type animate-pulse text-sm text-graphite">Rewinding the tape…</p>
      </main>
    }>
      <ReplayInner />
    </Suspense>
  );
}

function ReplayInner() {
  const sp = useSearchParams();
  const matchId = sp.get("id") ?? "";
  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [missing, setMissing] = useState(false);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [base, setBase] = useState<GameState | null>(null);

  useEffect(() => {
    void (async () => {
      const m = await getMatch(matchId);
      if (!m || !m.actions) {
        setMissing(true);
        return;
      }
      setMatch(m);
      setBase(
        createGame(
          m.seed,
          expandDeck(m.deckUsed),
          botDeckIds(BOT_BY_KEY[m.opponentKey]?.key ?? "duelist", m.seed),
          "A",
          "You",
          BOT_BY_KEY[m.opponentKey]?.name ?? m.opponentKey,
        ),
      );
      setIdx(0);
    })();
  }, [matchId]);

  const actions = useMemo(() => (match?.actions ?? []).filter(replayActionIsValid), [match]);
  const total = actions.length;

  const view = useMemo(() => {
    if (!base) return null;
    let s: GameState = structuredClone(base);
    for (let i = 0; i < idx && i < total; i++) {
      s = applyAction(s, asAction(actions[i]));
      drainEvents(s);
    }
    return s;
  }, [base, idx, actions, total]);

  // transient effects for the transition INTO the current step — fully derived,
  // keyed by step index; the animation settles at opacity 0 so no timers are needed.
  const stepFx = useMemo(() => {
    if (!base || idx === 0) return { floats: [] as ReplayFloat[], slash: null as string | null, lunge: null as string | null };
    let s: GameState = structuredClone(base);
    for (let i = 0; i < idx - 1; i++) s = applyAction(s, asAction(actions[i]));
    const after = applyAction(s, asAction(actions[idx - 1]));
    const events = drainEvents(after);
    const floats: ReplayFloat[] = [];
    let slash: string | null = null;
    let lunge: string | null = null;
    for (const e of events) {
      if (e.type === "DAMAGE") {
        floats.push({ id: floatId++, key: e.kind === "hero" ? `h:${e.side}` : `u:${e.uid}`, n: e.n, kind: "damage" });
      } else if (e.type === "HEAL") {
        floats.push({ id: floatId++, key: `h:${e.side}`, n: e.n, kind: "heal" });
      } else if (e.type === "ATTACK") {
        slash = "uid" in e.target ? `u:${e.target.uid}` : `h:${e.target.hero}`;
        lunge = e.attackerUid;
      }
    }
    return { floats, slash, lunge };
  }, [base, idx, actions]);

  // auto-play
  useEffect(() => {
    if (!playing) return;
    if (idx >= total) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- the tape simply stops when it runs out
      setPlaying(false);
      return;
    }
    const t = window.setTimeout(() => setIdx((i) => Math.min(total, i + 1)), STEP_MS);
    return () => window.clearTimeout(t);
  }, [playing, idx, total]);

  const floatersFor = (key: string) =>
    stepFx.floats.filter((f) => f.key === key).map((f) => (
      <motion.span
        key={`${idx}-${f.id}`}
        className="font-hand pointer-events-none absolute left-1/2 top-0 z-30 -translate-x-1/2 whitespace-nowrap"
        style={{ fontSize: 34, fontWeight: 700, color: f.kind === "heal" ? "var(--color-ink)" : "var(--color-red-stamp)" }}
        initial={{ opacity: 1, y: 8 }}
        animate={{ opacity: 0, y: -46 }}
        transition={{ duration: 0.95, ease: "easeOut" }}
      >
        {f.kind === "heal" ? `+${f.n}` : `-${f.n}`}
      </motion.span>
    ));
  const slashFor = (key: string) =>
    stepFx.slash === key ? (
      <motion.svg
        key={idx}
        viewBox="0 0 120 40"
        className="pointer-events-none absolute left-1/2 top-1/2 z-40 w-[130%] -translate-x-1/2 -translate-y-1/2"
        initial={{ opacity: 0.95, rotate: -14 }}
        animate={{ opacity: 0, rotate: -6 }}
        transition={{ duration: 0.24 }}
      >
        <path d="M6 32 C26 14 44 30 62 16 C80 4 100 22 114 10" fill="none" stroke="var(--color-ink)" strokeWidth="5" strokeLinecap="round" />
      </motion.svg>
    ) : null;

  if (missing) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4">
        <Stamp tone="red" className="text-2xl">REPLAY UNAVAILABLE</Stamp>
        <HandNote className="text-2xl">this duel was played before the replay press was installed</HandNote>
        <Link href="/profile" className="stamp-btn label-type focus-ink px-5 py-2 text-sm">
          ← Back to Profile
        </Link>
      </main>
    );
  }

  if (!match || !view) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <p className="label-type animate-pulse text-sm text-graphite">Rewinding the tape…</p>
      </main>
    );
  }

  const me = view.players.A;
  const foe = view.players.B;
  const latestLog = view.log.slice(-3);

  const slots = (side: "A" | "B") =>
    Array.from({ length: 5 }, (_, i) => {
      const u = view.players[side].board[i];
      if (!u) {
        return (
          <div
            key={`s-${side}-${i}`}
            aria-hidden
            className="rounded-full border-2 border-dashed"
            style={{ width: "var(--unit-w, 108px)", aspectRatio: "5 / 6.4", borderColor: "color-mix(in srgb, var(--color-pencil) 60%, transparent)" }}
          />
        );
      }
      return (
        <div key={u.uid} className="relative">
          <BoardUnit unit={u} side={side} lunging={stepFx.lunge === u.uid} floaters={<>{floatersFor(`u:${u.uid}`)}{slashFor(`u:${u.uid}`)}</>} />
        </div>
      );
    });

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-10">
      <header className="flex flex-wrap items-center justify-between gap-3 pt-6">
        <div>
          <div className="label-type text-[10px] text-graphite">REPLAY · {match.result} vs {BOT_BY_KEY[match.opponentKey]?.name ?? match.opponentKey}</div>
          <h1 className="small-caps text-3xl font-bold">{new Date(match.createdAt).toLocaleString()}</h1>
        </div>
        <Link href="/profile" className="stamp-btn label-type focus-ink px-4 py-2 text-xs">
          ← Profile
        </Link>
      </header>

      {/* board */}
      <section className="mt-4 flex items-start justify-between gap-4">
        <HeroPlate name={foe.name} hp={foe.heroHp} side="B" floaters={floatersFor("h:B")} sub={`${foe.hand.length} in hand`} />
        <ManaCrystals available={foe.mana} cap={foe.maxMana} temp={foe.tempMana} />
        <div className="flex -space-x-6">
          {foe.hand.map((c) => (
            <CardBack key={c.uid} w={40} />
          ))}
        </div>
      </section>
      <section className="ruled mt-2 flex min-h-[21vh] items-center justify-center gap-2 px-2 py-3 md:gap-3" style={{ background: "var(--color-paper-deep)" }}>
        {slots("B")}
      </section>
      <div className="relative my-1 flex items-center justify-center">
        <svg viewBox="0 0 400 14" className="h-4 w-full" preserveAspectRatio="none" aria-hidden>
          <path d="M0 7 C80 3 160 11 240 7 C300 4 360 9 400 7" fill="none" stroke="var(--color-pencil)" strokeWidth="2" strokeDasharray="7 5" />
        </svg>
        <span className="font-hand absolute -top-1 text-lg text-graphite">vs</span>
      </div>
      <section className="ruled flex min-h-[21vh] items-center justify-center gap-2 px-2 py-3 md:gap-3" style={{ background: "var(--color-paper-deep)" }}>
        {slots("A")}
      </section>
      <section className="mt-3 flex items-start justify-between gap-4">
        <HeroPlate name={me.name} hp={me.heroHp} side="A" floaters={floatersFor("h:A")} sub={`${me.hand.length} in hand`} />
        <ManaCrystals available={me.mana} cap={me.maxMana} temp={me.tempMana} />
        <DeckPileInline count={me.deck.length} />
      </section>

      {/* player hand, face up */}
      <div className="mt-2 flex min-h-[92px] items-end justify-center gap-1 overflow-x-auto px-2">
        {me.hand.map((c) => (
          <div key={c.uid} style={{ width: 74 }}>
            <CardFace card={getCard(c.cardId)} size="token" />
          </div>
        ))}
      </div>

      {/* commentary strip */}
      <Panel className="mt-3 p-3" deep>
        <div className="label-type text-[10px] text-graphite">COMMENTARY</div>
        <div className="mt-1 space-y-0.5" style={{ fontFamily: "var(--font-type)", fontSize: 12 }}>
          {latestLog.map((l, i) => (
            <p key={i} className={i === latestLog.length - 1 ? "text-ink" : "text-pencil"}>
              {l.text}
            </p>
          ))}
          {view.phase === "MULLIGAN" && <p className="text-graphite">Both players are mulliganing…</p>}
        </div>
      </Panel>

      {/* transport controls */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <StampButton size="sm" onClick={() => { setPlaying(false); setIdx(0); }} disabled={idx === 0}>
          ⏮
        </StampButton>
        <StampButton size="sm" onClick={() => { setPlaying(false); setIdx((i) => Math.max(0, i - 1)); }} disabled={idx === 0}>
          ◀
        </StampButton>
        <StampButton
          size="sm"
          className="min-w-24"
          onClick={() => setPlaying((p) => !p)}
          disabled={idx >= total}
        >
          {playing ? "PAUSE" : "PLAY"}
        </StampButton>
        <StampButton size="sm" onClick={() => { setPlaying(false); setIdx((i) => Math.min(total, i + 1)); }} disabled={idx >= total}>
          ▶
        </StampButton>
        <StampButton size="sm" onClick={() => { setPlaying(false); setIdx(total); }} disabled={idx >= total}>
          ⏭
        </StampButton>
        <input
          type="range"
          min={0}
          max={total}
          value={idx}
          onChange={(e) => {
            setPlaying(false);
            setIdx(Number(e.target.value));
          }}
          aria-label="Replay position"
          className="mx-2 h-2 flex-1 accent-ink"
          style={{ accentColor: "var(--color-ink)" }}
        />
        <span className="label-type text-xs text-graphite">
          {idx}/{total}
        </span>
      </div>
      <HandNote className="mt-2 block text-center text-xl">
        step through the duel exactly as it was played — seeded, stamped, and sealed
      </HandNote>
    </main>
  );
}

function DeckPileInline({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-2" aria-label={`Deck: ${count} cards`}>
      <CardBack w={34} />
      <span className="label-type text-xs text-graphite">×{count}</span>
    </div>
  );
}
