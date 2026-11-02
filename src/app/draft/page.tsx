"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CardFace } from "@/components/card/CardFace";
import { CardBack } from "@/components/duel/units";
import { HandNote, Panel, Stamp, StampButton, WashiTape } from "@/components/paper";
import { getCard } from "@/game/cards";
import {
  DECK_PICKS,
  DRAFT_STASH_KEY,
  buildDraftStash,
  pickFromOffer,
  rivalDraft,
  startDraftRun,
  type DraftRun,
} from "@/game/draft";
import { sound } from "@/lib/sound";

/**
 * /draft — INK DRAFT (gameplan phase 1). Twenty pick-rounds of three cards,
 * building a legal deck; a rival drafts its own twenty in parallel (seeded,
 * hidden). When the sheets run out both decks are stashed to sessionStorage
 * and the player is routed to /duel?draft=1.
 */

/** Pause after each player pick before the rival's count ticks up. */
const RIVAL_TICK_MS = 900;

export default function DraftPage() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [run, setRun] = useState<DraftRun | null>(null);
  const [rival, setRival] = useState<string[]>([]);
  const [rivalSeen, setRivalSeen] = useState(0);

  const startDraft = useCallback(() => {
    const seed = Date.now() % 2147483647;
    setRival(rivalDraft(seed));
    setRivalSeen(0);
    setRun(startDraftRun(seed));
    sound.paperSlide();
  }, []);

  const onPick = useCallback(
    (cardId: string) => {
      if (!run || run.complete) return;
      const next = pickFromOffer(run, cardId);
      sound.pop();
      if (next.complete) {
        // seal both decks for the duel before the reveal settles — if storage
        // is blocked the duel page sends the player back for a fresh draft
        try {
          window.sessionStorage.setItem(DRAFT_STASH_KEY, JSON.stringify(buildDraftStash(next, rival)));
        } catch {
          // the draft still completes; /duel?draft=1 just can't pick it up
        }
      }
      setRun(next);
    },
    [run, rival],
  );

  // the rival drafts in parallel: its revealed count ticks up one beat after
  // each of the player's picks, stopping exactly at the player's pick count
  useEffect(() => {
    if (!run || rivalSeen >= run.picks.length) return;
    const t = window.setTimeout(() => setRivalSeen(run.picks.length), RIVAL_TICK_MS);
    return () => window.clearTimeout(t);
  }, [run, rivalSeen]);

  const drafting = run !== null && !run.complete;

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 pb-16">
      {/* ── landing ── */}
      {run === null && (
        <header className="mt-10 text-center">
          <div className="label-type text-[11px] text-graphite">SOLO MODE · TWENTY OFFERS, ONE DECK</div>
          <h1 className="small-caps mt-1 border-y-4 border-ink py-3 text-5xl font-bold">The Ink Draft</h1>
          <HandNote className="mt-3 inline-block max-w-xl text-xl leading-snug">
            twenty rounds, three cards on the table each round — ink one into your deck.
            a rival drafts in the margins beside you, picks hidden until the sheets run out.
            then the two decks duel.
          </HandNote>

          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
            {[
              { k: "ROUND ONE", t: "3 cards per offer — areas, spells and units all pass across the table." },
              { k: "THE DECK", t: `${DECK_PICKS} picks make a legal deck — the offers never tempt you past the copy limits.` },
              { k: "THE RIVAL", t: "its picks stay face-down while it drafts; the full sheet is revealed at pick twenty." },
            ].map((c, i) => (
              <Panel key={c.k} className="relative p-4 text-left">
                <WashiTape angle={i % 2 === 0 ? -3 : 2} className="left-6 top-0" width={64} />
                <div className="label-type text-[10px] text-graphite">{c.k}</div>
                <p className="mt-2 text-sm leading-relaxed" style={{ fontFamily: "var(--font-type)" }}>{c.t}</p>
              </Panel>
            ))}
          </div>

          <div className="mt-10 flex flex-col items-center gap-4">
            <motion.span className="inline-block" whileHover={{ rotate: -2, scale: 1.04 }} whileTap={{ rotate: 1, scale: 0.97 }}>
              <StampButton size="lg" className="text-2xl" onClick={startDraft}>
                JOIN THE INK DRAFT
              </StampButton>
            </motion.span>
            <Link href="/" className="label-type focus-ink text-xs text-graphite underline underline-offset-4">
              ← back to the front page
            </Link>
          </div>
        </header>
      )}

      {/* ── drafting ── */}
      {drafting && run && (
        <section className="mt-8">
          <div className="text-center">
            <Stamp className="text-2xl md:text-3xl">{`PICK ${run.picks.length + 1} OF ${DECK_PICKS}`}</Stamp>
            <div className="mx-auto mt-4 h-2 w-full max-w-md overflow-hidden rounded-full" style={{ background: "var(--color-cardstock)", border: "1px solid var(--color-pencil)" }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: "var(--color-ink)" }}
                initial={false}
                animate={{ width: `${(run.picks.length / DECK_PICKS) * 100}%` }}
              />
            </div>
            <HandNote className="mt-2 text-lg">every offer holds three cards — ink one into your deck</HandNote>
          </div>

          {/* the offer */}
          <div className="mt-6 flex flex-wrap items-start justify-center gap-4 md:gap-8">
            {run.offer.map((id, i) => {
              const def = getCard(id);
              return (
                <motion.button
                  key={`${run.picks.length}-${id}`}
                  type="button"
                  className="focus-ink origin-center"
                  aria-label={`Pick ${def.name}`}
                  onClick={() => onPick(id)}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, y: -90, rotate: (i - 1) * 7 }}
                  animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, rotate: (i - 1) * 2.5 }}
                  transition={{ type: "spring", stiffness: 240, damping: 20, delay: 0.08 * i }}
                  whileHover={{ y: -12, rotate: 0, scale: 1.06, zIndex: 10 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <CardFace card={def} size="collection" className="!w-[136px] sm:!w-[164px] md:!w-[190px]" />
                </motion.button>
              );
            })}
          </div>

          {/* rival panel + deck so far */}
          <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-[1fr_1.6fr]">
            <Panel className="relative p-4">
              <WashiTape angle={-3} className="left-8 top-0" width={72} />
              <div className="label-type text-[10px] text-graphite">THE RIVAL&apos;S TABLE</div>
              <div className="label-type mt-2 text-3xl" style={{ fontFamily: "var(--font-type)" }}>
                {rivalSeen} / {DECK_PICKS}
              </div>
              <HandNote className="mt-1 block text-lg leading-tight">
                {rivalSeen < DECK_PICKS ? "your rival is choosing…" : "the rival's sheet is full"}
              </HandNote>
              <div className="mt-3 flex flex-wrap gap-1.5" aria-label={`Rival picks revealed: ${rivalSeen} of ${DECK_PICKS}`}>
                {Array.from({ length: DECK_PICKS }, (_, i) =>
                  i < rivalSeen ? <CardBack key={i} w={22} /> : (
                    <span
                      key={i}
                      aria-hidden
                      className="rounded-sm border-2 border-dashed"
                      style={{ width: 22, aspectRatio: "5 / 7", borderColor: "color-mix(in srgb, var(--color-pencil) 60%, transparent)" }}
                    />
                  ),
                )}
              </div>
            </Panel>

            <div className="p-4" style={{ border: "1.5px dashed var(--color-pencil)", borderRadius: "var(--cut-a)" }}>
              <div className="label-type text-[10px] text-graphite">YOUR DECK · {run.picks.length} / {DECK_PICKS}</div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {run.picks.length === 0 && <HandNote className="text-lg">nothing inked yet — the first offer waits above</HandNote>}
                {run.picks.map((id, i) => (
                  <motion.div
                    key={`${i}-${id}`}
                    initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.6, rotate: -8 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 320, damping: 22 }}
                  >
                    <CardFace card={getCard(id)} size="token" className="!w-[52px]" />
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── sealed: the reveal, then the duel ── */}
      <AnimatePresence>
        {run?.complete && (
          <motion.section
            key="sealed"
            className="mt-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="text-center">
              <motion.div
                initial={reduce ? { opacity: 1 } : { scale: 2.6, opacity: 0, rotate: 8 }}
                animate={{ scale: 1, opacity: 1, rotate: -4 }}
                transition={{ type: "spring", stiffness: 300, damping: 17 }}
                className="inline-block"
              >
                <Stamp className="text-4xl md:text-6xl">DRAFT SEALED</Stamp>
              </motion.div>
              <HandNote className="mt-3 block text-xl">twenty picks inked — the rival&apos;s sheet comes off the table</HandNote>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
              {[
                { title: "YOUR DRAFT", ids: run.picks },
                { title: "RIVAL DRAFT · REVEALED", ids: rival },
              ].map((col) => (
                <Panel key={col.title} className="relative p-4">
                  <div className="label-type text-[10px] text-graphite">{col.title} · {col.ids.length}</div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {col.ids.map((id, i) => (
                      <motion.div
                        key={`${col.title}-${i}-${id}`}
                        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14, rotate: (i % 3) - 1 }}
                        animate={{ opacity: 1, y: 0, rotate: 0 }}
                        transition={{ delay: 0.03 * i }}
                      >
                        <CardFace card={getCard(id)} size="token" className="!w-[56px]" />
                      </motion.div>
                    ))}
                  </div>
                </Panel>
              ))}
            </div>

            <div className="mt-8 flex flex-col items-center gap-3">
              <Stamp
                tone="red"
                className="text-sm"
              >
                NEXT: YOUR DRAFT VS THEIRS
              </Stamp>
              <motion.span className="inline-block" whileHover={{ rotate: -2, scale: 1.04 }} whileTap={{ rotate: 1, scale: 0.97 }}>
                <StampButton size="lg" onClick={() => { sound.pop(); router.push("/duel?draft=1"); }}>
                  TAKE THE TABLE →
                </StampButton>
              </motion.span>
              <HandNote className="text-lg">the duel records elo, ink and stamps, same as any ranked table</HandNote>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </main>
  );
}
