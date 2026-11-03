"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  BLESSINGS_BY_KEY,
  DESCENT_FLOORS,
  blessingOffer,
  clearRun,
  descentFloorSpec,
  floorsCleared,
  hasWingbreaker,
  loadRun,
  saveRun,
  startRun,
  takeBlessing,
  type DescentRun,
} from "@/game/descent";
import { ensureGuest } from "@/lib/api";
import { HandNote, Panel, Stamp, StampButton, WashiTape } from "@/components/paper";
import { sound } from "@/lib/sound";

/**
 * DESCENT INTO THE SEALED WING — the run map. Seven floors down; win a floor
 * and draft a Blessing; lose once and the wing keeps you. The duels themselves
 * run at /duel?descent=1 (the run lives in localStorage).
 */
export default function DescentPage() {
  const [run, setRun] = useState<DescentRun | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [wingbreaker, setWingbreaker] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration of the persisted run
    setRun(loadRun());
    setWingbreaker(hasWingbreaker());
    setHydrated(true);
  }, []);

  const offer = useMemo(() => (run && run.alive && run.wonLast ? blessingOffer(run) : []), [run]);
  const spec = useMemo(() => (run ? descentFloorSpec(Math.min(run.floor, DESCENT_FLOORS)) : null), [run]);

  const begin = async () => {
    setBusy(true);
    await ensureGuest();
    const seed = Math.floor(Math.random() * 2 ** 31);
    const fresh = startRun(seed);
    saveRun(fresh);
    setRun(fresh);
    sound.stampThunk();
    // straight down the stair — floor 1 is waiting
    window.location.href = "/duel?descent=1";
  };

  const take = (key: string) => {
    if (!run || busy) return;
    setBusy(true);
    const updated = takeBlessing(run, key);
    saveRun(updated);
    sound.paperSlide();
    setRun(updated);
    setBusy(false);
  };

  const descend = () => {
    if (!run) return;
    window.location.href = "/duel?descent=1";
  };

  const newRun = () => {
    clearRun();
    setRun(null);
    setWingbreaker(hasWingbreaker());
  };

  const floorLabel = (n: number) => descentFloorSpec(n).name;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 pb-16">
      <header className="mt-10 text-center">
        <div className="label-type text-[11px] text-graphite">ROGUELITE · ONE LOSS ENDS THE RUN</div>
        <h1 className="small-caps mt-1 border-y-4 border-ink py-3 text-5xl font-bold">The Sealed Wing</h1>
        <HandNote className="mt-2 text-xl">
          seven floors down, a blessing between each. Lose once and the wing keeps you.
        </HandNote>
        {wingbreaker && (
          <div className="mt-3 inline-block">
            <Stamp tone="red" className="text-sm">WINGBREAKER</Stamp>
          </div>
        )}
      </header>

      {!hydrated ? (
        <p className="label-type mt-10 animate-pulse text-center text-sm text-graphite">Listening at the stair…</p>
      ) : !run || (!run.alive && !run.cleared) ? (
        /* ── no run (or a claimed one) — the stair down ── */
        <Panel className="mt-8 flex flex-col items-center gap-4 p-8 text-center" deep>
          <WashiTape angle={-3} className="left-1/2 top-0 -translate-x-1/2" width={80} />
          <Stamp className="text-base">FLOOR 1 · {floorLabel(1).toUpperCase()}</Stamp>
          <p className="max-w-md text-sm leading-snug text-graphite">
            {run && floorsCleared(run) > 0
              ? `the wing keeps what it caught — that run ended on floor ${run.floor}, ${floorsCleared(run)} cleared.`
              : "the door seals behind you on the way down."}
          </p>
          <StampButton size="lg" disabled={busy} onClick={() => void begin()}>
            {busy ? "…" : "BEGIN THE DESCENT"}
          </StampButton>
          <Link href="/" className="label-type text-xs underline">back to the front page</Link>
        </Panel>
      ) : run.cleared ? (
        /* ── the seal is broken ── */
        <Panel className="mt-8 flex flex-col items-center gap-4 p-8 text-center" deep>
          <Stamp tone="red" className="text-3xl">DESCENT CLEARED</Stamp>
          <HandNote className="text-2xl leading-snug">
            the Head Archivist folds back into the dark. the seal is broken — the wingbreaker walks out.
          </HandNote>
          <div className="label-type text-[11px] text-graphite">
            7 FLOORS · {run.blessings.length} BLESSINGS · {floorsCleared(run)} CLEARED
          </div>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            {run.blessings.map((k) => (
              <span key={k} className="label-type px-2 py-1 text-[9px]" style={{ border: "1px solid var(--color-ink)", borderRadius: 4 }}>
                {BLESSINGS_BY_KEY[k]?.title.toUpperCase() ?? k}
              </span>
            ))}
          </div>
          <StampButton onClick={newRun}>Descend again</StampButton>
          <Link href="/" className="label-type text-xs underline">back to the front page</Link>
        </Panel>
      ) : !run.alive ? (
        /* ── claimed by the wing ── */
        <Panel className="mt-8 flex flex-col items-center gap-4 p-8 text-center" deep>
          <Stamp tone="red" className="text-2xl">THE WING CLAIMS YOU</Stamp>
          <HandNote className="text-2xl leading-snug">
            floor {run.floor} — {floorLabel(run.floor)}. {floorsCleared(run)} floors cleared.
          </HandNote>
          <StampButton onClick={newRun}>Begin a new descent</StampButton>
          <Link href="/" className="label-type text-xs underline">back to the front page</Link>
        </Panel>
      ) : run.wonLast && offer.length > 0 ? (
        /* ── the blessing draft ── */
        <div className="mt-8">
          <div className="text-center">
            <Stamp tone="red" className="text-lg">FLOOR {run.floor} CLEARED</Stamp>
            <h2 className="small-caps mt-2 text-3xl font-bold">Choose a Blessing</h2>
            <HandNote className="mt-1 text-lg">it rides every floor that follows.</HandNote>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {offer.map((key, i) => {
              const b = BLESSINGS_BY_KEY[key]!;
              return (
                <motion.button
                  key={key}
                  type="button"
                  disabled={busy}
                  onClick={() => take(key)}
                  className="focus-ink text-left"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * i }}
                  whileHover={{ y: -5 }}
                >
                  <Panel className="flex h-full flex-col gap-2 p-5">
                    <Stamp className="text-[10px]">BLESSING</Stamp>
                    <div className="small-caps text-lg font-bold leading-tight">{b.title}</div>
                    <p className="text-sm leading-snug text-graphite">{b.blurb}</p>
                  </Panel>
                </motion.button>
              );
            })}
          </div>
          <div className="mt-6 text-center">
            <StampButton size="sm" disabled={busy} onClick={descend}>
              Skip the blessing — descend
            </StampButton>
          </div>
        </div>
      ) : (
        /* ── the run map: the stair down ── */
        <div className="mt-8">
          <Panel className="p-6 text-center" deep>
            <div className="label-type text-[11px] text-graphite">
              DESCENT IN PROGRESS · FLOOR {run.floor} OF {DESCENT_FLOORS}
            </div>
            <h2 className="small-caps mt-1 text-2xl font-bold">{spec?.name}</h2>
            <HandNote className="mt-1 block text-lg leading-snug">{spec?.blurb}</HandNote>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {run.blessings.map((k) => (
                <span key={k} className="label-type px-2 py-1 text-[9px]" style={{ border: "1px solid var(--color-ink)", borderRadius: 4 }}>
                  {BLESSINGS_BY_KEY[k]?.title.toUpperCase() ?? k}
                </span>
              ))}
            </div>
            <div className="mt-4 flex justify-center gap-2">
              <StampButton size="lg" onClick={descend}>DESCEND TO FLOOR {run.floor}</StampButton>
              <StampButton size="sm" onClick={() => { clearRun(); setRun(null); }}>Abandon</StampButton>
            </div>
          </Panel>

          {/* the stair */}
          <div className="mt-8 flex flex-col-reverse items-stretch gap-2">
            {Array.from({ length: DESCENT_FLOORS }, (_, i) => i + 1).map((n) => {
              const here = n === run.floor;
              const below = n < run.floor;
              return (
                <div
                  key={n}
                  className="label-type flex items-center gap-3 px-4 py-2 text-[10px]"
                  style={{
                    border: here ? "2px solid var(--color-ink)" : "1px dashed var(--color-pencil)",
                    borderRadius: "6px 4px 7px 5px / 5px 7px 4px 6px",
                    opacity: here ? 1 : below ? 0.45 : 0.7,
                    background: here ? "var(--color-cardstock)" : "transparent",
                  }}
                >
                  <span className="w-8">{here ? "▼" : below ? "✓" : "·"}</span>
                  <span className="flex-1">{floorLabel(n).toUpperCase()}</span>
                  <span>{here ? "YOU ARE HERE" : below ? "cleared" : "below"}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-6 text-center">
            <Link href="/" className="label-type text-xs underline">back to the front page</Link>
          </div>
        </div>
      )}
    </main>
  );
}
