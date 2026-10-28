"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ensureGuest, getMe, openPacks, type MeProfile, type PackResult } from "@/lib/api";
import { getCard } from "@/game/cards";
import { CardFace } from "@/components/card/CardFace";
import { HandNote, Panel, Stamp, StampButton, WashiTape } from "@/components/paper";
import { PACK_COST } from "@/game/packs";

const RARITY_TONE: Record<string, "ink" | "red"> = {
  common: "ink",
  rare: "ink",
  epic: "red",
  legendary: "red",
};

export default function PacksPage() {
  const [me, setMe] = useState<MeProfile | null>(null);
  const [opening, setOpening] = useState(false);
  const [result, setResult] = useState<PackResult | null>(null);
  const [revealed, setRevealed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      await ensureGuest();
      setMe(await getMe());
    })();
  }, []);

  const open = async (packs: number) => {
    setOpening(true);
    setError(null);
    setResult(null);
    setRevealed(0);
    const res = await openPacks(packs);
    setOpening(false);
    if (!res) {
      setError("Not enough ink for that many packs.");
      return;
    }
    setResult(res);
    setMe((prev) => (prev ? { ...prev, coins: res.coinsAfter } : prev));
    // reveal cards one by one
    for (let i = 1; i <= res.cards.length; i++) {
      await new Promise((r) => setTimeout(r, 550));
      setRevealed(i);
    }
  };

  const coins = me?.coins ?? 0;

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 pb-16">
      <header className="mt-10 text-center">
        <div className="label-type text-[11px] text-graphite">THE INK VAULT · PACKS &amp; PULLS</div>
        <h1 className="small-caps mt-1 border-y-4 border-ink py-3 text-5xl font-bold">Card Packs</h1>
        <div className="label-type mt-3 inline-block px-4 py-1.5" style={{ border: "2px solid var(--color-ink)", borderRadius: "var(--cut-a)", background: "var(--color-cardstock)" }}>
          INK BALANCE: {coins}
        </div>
      </header>

      <section className="mt-10 grid grid-cols-1 items-center gap-8 md:grid-cols-[1fr_1.2fr]">
        <div className="text-center">
          {/* the pack itself */}
          <motion.div
            className="relative mx-auto"
            style={{ width: 180 }}
            animate={opening ? { rotate: [0, -3, 3, 0], scale: [1, 1.04, 1] } : {}}
            transition={{ repeat: opening ? Infinity : 0, duration: 0.5 }}
          >
            <Panel className="p-0">
              <div className="relative flex flex-col items-center px-4 py-6">
                <WashiTape angle={-4} className="left-1/2 top-2 -translate-x-1/2" width={64} />
                <svg viewBox="0 0 60 80" style={{ width: 130 }} aria-hidden>
                  <rect x="6" y="6" width="48" height="68" fill="var(--color-paper)" stroke="var(--color-ink)" strokeWidth="2.5" rx="4" />
                  <path d="M30 18 C38 26 38 36 30 44 C22 36 22 26 30 18 Z" fill="none" stroke="var(--color-ink)" strokeWidth="2" />
                  <circle cx="30" cy="31" r="4.5" fill="none" stroke="var(--color-ink)" strokeWidth="1.8" />
                  <path d="M14 12 L46 12 M14 66 L46 66" stroke="var(--color-pencil)" strokeWidth="1.4" strokeDasharray="3 2.4" />
                </svg>
                <div className="label-type mt-2 text-xs">{PACK_COST} INK</div>
                <HandNote className="text-lg">5 cards each · rare or better guaranteed</HandNote>
              </div>
            </Panel>
          </motion.div>

          <div className="mt-6 flex flex-col items-center gap-3">
            <StampButton size="lg" disabled={opening || coins < PACK_COST} onClick={() => open(1)}>
              {opening ? "Opening…" : "Open 1 Pack"}
            </StampButton>
            <StampButton
              size="sm"
              disabled={opening || coins < PACK_COST * 5}
              onClick={() => open(5)}
            >
              Open 5 ({PACK_COST * 5} ink)
            </StampButton>
            {error && <HandNote className="text-xl">✎ {error}</HandNote>}
            <HandNote className="text-xl">duplicates refund 20 ink automatically</HandNote>
          </div>
        </div>

        <div className="relative min-h-[320px]">
          <AnimatePresence>
            {result && (
              <motion.div
                key="reveal"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-wrap items-center justify-center gap-4"
              >
                {result.cards.slice(0, revealed).map((card, i) => {
                  const def = getCard(card.cardId);
                  return (
                    <motion.div
                      key={`${result.cost}-${i}`}
                      initial={{ rotateY: 90, opacity: 0 }}
                      animate={{ rotateY: 0, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 200, damping: 20 }}
                      className="relative flex flex-col items-center"
                    >
                      <CardFace card={def} size="collection" />
                      <div className="mt-1 flex items-center gap-1">
                        <Stamp tone={RARITY_TONE[def.rarity] ?? "ink"} className="text-[8px]">
                          {def.rarity.toUpperCase()}
                        </Stamp>
                        {!card.isNew && (
                          <span className="label-type text-[9px] text-graphite">+{card.refund} ink</span>
                        )}
                      </div>
                      {card.isNew && def.rarity === "legendary" && (
                        <motion.div
                          className="absolute -inset-3 pointer-events-none"
                          initial={{ opacity: 0.8, scale: 0.9 }}
                          animate={{ opacity: 0, scale: 1.3 }}
                          transition={{ duration: 1.2 }}
                          style={{ border: "3px solid var(--color-red-stamp)", borderRadius: 12 }}
                        />
                      )}
                    </motion.div>
                  );
                })}
                {revealed >= result.cards.length && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 w-full text-center">
                    {result.newCards.length > 0 ? (
                      <HandNote className="text-2xl">
                        {result.newCards.length} new card{result.newCards.length === 1 ? "" : "s"} added to your collection!
                      </HandNote>
                    ) : (
                      <HandNote className="text-2xl">All duplicates — {result.totalRefund} ink refunded.</HandNote>
                    )}
                    <div className="mt-2">
                      <Link href="/decks" className="label-type text-xs underline">
                        build with them →
                      </Link>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
          {!result && (
            <Panel className="flex min-h-[320px] flex-col items-center justify-center gap-3 p-6 text-center" deep>
              <Stamp className="text-sm">THE ARCHIVE SET</Stamp>
              <p className="max-w-sm text-sm text-graphite">
                40 new cards live in these packs — Doodled Knights, Blot Monsters,
                the Mimeograph Mage and more. Win duels, clear campaign stages,
                and log in daily for the ink to tear them open.
              </p>
              <HandNote className="text-xl">odds per card: 70% · 20% · 8% · 2%</HandNote>
            </Panel>
          )}
        </div>
      </section>
    </main>
  );
}
