"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { createDeck } from "@/lib/api";
import { decodeDeckCode, encodeDeckCode } from "@/lib/deck-code";
import { CardFace } from "@/components/card/CardFace";
import { HandNote, Panel, StampButton } from "@/components/paper";
import { getCard } from "@/game/cards";
import type { DeckEntry } from "@/game/decks";
import { DECK_SIZE } from "@/config";

/** Pages deploys live under /inkduel — copied links must carry the basePath. */
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export default function SharePage() {
  return (
    <Suspense fallback={
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 pb-16">
        <p className="label-type mt-10 animate-pulse text-center text-sm text-graphite">Unfolding the shared folio…</p>
      </main>
    }>
      <ShareInner />
    </Suspense>
  );
}

function ShareInner() {
  const params = useSearchParams();
  const code = params.get("d") ?? "";
  const cards = useMemo(() => decodeDeckCode(code), [code]);
  const [imported, setImported] = useState<"idle" | "done" | "missing">("idle");

  const total = cards?.reduce((n, e) => n + e.count, 0) ?? 0;

  const importDeck = async () => {
    if (!cards) return;
    const deck = await createDeck("Imported Folio", cards);
    if (deck) {
      // if the importer already has 8+ folios the new one may sit inactive — no ceremony needed
      setImported("done");
    } else {
      setImported("missing");
    }
  };

  if (!code || !cards) {
    return (
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 pb-16">
        <header className="mt-10 text-center">
          <div className="label-type text-[11px] text-graphite">SHARED FOLIO</div>
          <h1 className="small-caps mt-1 border-y-4 border-ink py-3 text-5xl font-bold">Deck Share</h1>
        </header>
        <Panel className="mt-10 p-8 text-center">
          <HandNote className="text-2xl">✎ This share link is smudged beyond reading.</HandNote>
          <p className="label-type mt-3 text-xs text-graphite">ASK THE SENDER FOR A FRESH LINK — OR BUILD YOUR OWN IN THE WORKSHOP</p>
          <StampButton className="mt-6" onClick={() => { window.location.href = "/decks"; }}>To the workshop</StampButton>
        </Panel>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 pb-16">
      <header className="mt-10 text-center">
        <div className="label-type text-[11px] text-graphite">SHARED FOLIO</div>
        <h1 className="small-caps mt-1 border-y-4 border-ink py-3 text-5xl font-bold">A Rival&apos;s Deck</h1>
        <HandNote className="mt-2 text-xl">
          someone folded this {total}/{DECK_SIZE}-card list and sent it your way.
        </HandNote>
      </header>

      <Panel className="mt-8 p-6">
        <div className="flex flex-wrap gap-1.5">
          {(() => {
            const flat: string[] = [];
            for (const e of cards as DeckEntry[]) for (let k = 0; k < e.count; k++) flat.push(e.cardId);
            return flat.map((id, i) => {
              const def = getCard(id);
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.02 * i }}
                  style={{ width: 86 }}
                >
                  <CardFace card={def} size="token" />
                </motion.div>
              );
            });
          })()}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <StampButton onClick={importDeck}>Import as folio</StampButton>
          <StampButton
            onClick={() => {
              const joined = new URLSearchParams({ d: encodeDeckCode(cards as DeckEntry[]) });
              void navigator.clipboard?.writeText(`${window.location.origin}${BASE_PATH}/decks/share?${joined}`).catch(() => {});
            }}
          >
            Copy share link
          </StampButton>
          <Link href="/decks" className="label-type text-xs underline">to the workshop</Link>
          {imported === "done" && <HandNote className="text-xl">✎ imported — find it in your workshop</HandNote>}
          {imported === "missing" && (
            <HandNote className="text-xl">✎ the archivist declined — you don&apos;t own every card in this folio yet</HandNote>
          )}
        </div>
        {total !== DECK_SIZE && (
          <HandNote className="mt-4 text-lg">✎ heads up: this list is {total} cards, a legal deck is exactly {DECK_SIZE}</HandNote>
        )}
      </Panel>
    </main>
  );
}
