"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ensureGuest, getMeta, type MetaCard } from "@/lib/api";
import { HandNote, Panel, Stamp, WashiTape } from "@/components/paper";
import { getCard } from "@/game/cards";

interface MetaData {
  totalMatches: number;
  averageTurns: number;
  averageDurationMs: number;
  topPlayed: MetaCard[];
  bestWinRate: MetaCard[];
  longestMatches: { turns: number; result: string; opponentKey: string; createdAt: string }[];
  costBuckets: { cost: number; card: { cardId: string; name: string; gamesPlayed: number } | null }[];
  cards: MetaCard[];
}

/** Auto-generated Caveat headlines from the data. */
function headlines(data: MetaData | null): string[] {
  if (!data || data.topPlayed.length === 0) return ["The presses are warm but the pages are blank — go play some duels!"];
  const top = data.topPlayed[0];
  const best = data.bestWinRate[0];
  const lines: string[] = [];
  if (top) lines.push(`${top.name} dominates the meta at ${top.gamesPlayed} printings!`);
  if (best) lines.push(`${best.name} wins ${best.winRate}% of its duels — editors outraged.`);
  lines.push(`Average duel runs ${data.averageTurns} turns on ${formatDuration(data.averageDurationMs)} of ink.`);
  const longest = data.longestMatches[0];
  if (longest) lines.push(`Marathon alert: a ${longest.turns}-turn war against ${longest.opponentKey} shakes the archive.`);
  return lines;
}

function formatDuration(ms: number): string {
  const m = Math.floor(ms / 60000);
  const s = Math.round((ms % 60000) / 1000);
  if (m <= 0) return `${s}s`;
  return `${m}m ${s}s`;
}

export default function MetaPage() {
  const [data, setData] = useState<MetaData | null>(null);

  useEffect(() => {
    void (async () => {
      await ensureGuest();
      setData(await getMeta());
    })();
  }, []);

  const cards = data?.cards ?? [];

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 pb-16">
      <header className="relative mt-10 text-center">
        <div className="label-type text-[11px] text-graphite">META ANALYSIS · FRESH FROM THE ARCHIVE</div>
        <h1 className="small-caps mt-1 border-y-4 border-ink py-3 text-5xl font-bold">The Daily Ink</h1>
        <div className="label-type mt-2 flex items-center justify-between text-[11px] text-graphite">
          <span>{data?.totalMatches ?? 0} duels on record</span>
          <span>all figures in monochrome</span>
        </div>
        <WashiTape angle={-2} className="left-1/2 top-0 -translate-x-1/2" width={110} />
      </header>

      {/* auto headlines */}
      <section className="mt-8 border-y-2 border-ink py-4">
        {headlines(data).map((h, i) => (
          <p key={i} className="font-hand text-center text-2xl leading-snug text-graphite md:text-3xl">
            — {h}
          </p>
        ))}
      </section>

      {data === null ? (
        <p className="label-type mt-10 animate-pulse text-center text-sm text-graphite">Setting the type…</p>
      ) : (
        <div className="mt-8 columns-1 gap-8 md:columns-2">
          {/* top played */}
          <section className="mb-8 break-inside-avoid">
            <h2 className="label-type border-b-2 border-ink pb-1 text-sm">TOP 10 MOST-PLAYED CARDS</h2>
            <ol className="mt-3 space-y-1.5" style={{ fontFamily: "var(--font-type)", fontSize: 13 }}>
              {data.topPlayed.map((c, i) => (
                <li key={c.cardId} className="flex items-baseline gap-2">
                  <span className="w-5 text-right text-graphite">{i + 1}.</span>
                  <span className="small-caps" style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600 }}>
                    {c.name}
                  </span>
                  <span className="ml-auto text-graphite">{c.gamesPlayed}× · {c.winRate}% WR</span>
                </li>
              ))}
              {data.topPlayed.length === 0 && <li className="text-graphite">No matches recorded yet.</li>}
            </ol>
          </section>

          {/* best win rate */}
          <section className="mb-8 break-inside-avoid">
            <h2 className="label-type border-b-2 border-ink pb-1 text-sm">BEST WIN RATES (3+ DUELS)</h2>
            <ol className="mt-3 space-y-1.5" style={{ fontFamily: "var(--font-type)", fontSize: 13 }}>
              {data.bestWinRate.map((c, i) => (
                <li key={c.cardId} className="flex items-baseline gap-2">
                  <span className="w-5 text-right text-graphite">{i + 1}.</span>
                  <span className="small-caps" style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600 }}>
                    {c.name}
                  </span>
                  <span className="ml-auto text-graphite">{c.winRate}% of {c.gamesPlayed}</span>
                </li>
              ))}
              {data.bestWinRate.length === 0 && (
                <li className="text-graphite">
                  Not enough duels yet — <Link href="/duel" className="underline">fix that</Link>.
                </li>
              )}
            </ol>
          </section>

          {/* cost buckets */}
          <section className="mb-8 break-inside-avoid">
            <h2 className="label-type border-b-2 border-ink pb-1 text-sm">MOST-PLAYED CARD PER COST</h2>
            <div className="mt-3 space-y-1.5" style={{ fontFamily: "var(--font-type)", fontSize: 13 }}>
              {data.costBuckets
                .sort((a, b) => a.cost - b.cost)
                .map(({ cost, card }) => (
                  <div key={cost} className="flex items-center gap-2">
                    <span className="label-type flex h-6 w-6 items-center justify-center rounded-full text-[10px]" style={{ background: "var(--color-ink)", color: "var(--color-paper)" }}>
                      {cost === 7 ? "7+" : cost}
                    </span>
                    {card ? (
                      <>
                        <span className="small-caps" style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 600 }}>
                          {card.name}
                        </span>
                        <span className="ml-auto text-graphite">{card.gamesPlayed}×</span>
                      </>
                    ) : (
                      <span className="text-pencil">—</span>
                    )}
                  </div>
                ))}
            </div>
          </section>

          {/* longest matches */}
          <section className="mb-8 break-inside-avoid">
            <h2 className="label-type border-b-2 border-ink pb-1 text-sm">THE MARATHON DESK</h2>
            <ul className="mt-3 space-y-2" style={{ fontFamily: "var(--font-type)", fontSize: 13 }}>
              {data.longestMatches.map((m, i) => (
                <li key={i} className="flex items-center gap-2">
                  <Stamp className="text-[9px]">{m.turns}T</Stamp>
                  <span>
                    vs {m.opponentKey} — {m.result}
                  </span>
                  <span className="ml-auto text-graphite">{new Date(m.createdAt).toLocaleDateString()}</span>
                </li>
              ))}
              {data.longestMatches.length === 0 && <li className="text-graphite">No marathons yet.</li>}
            </ul>
          </section>
        </div>
      )}

      {/* full table */}
      {cards.length > 0 && (
        <section className="mt-4">
          <h2 className="label-type border-b-2 border-ink pb-1 text-sm">THE FULL LEDGER</h2>
          <Panel className="mt-3 overflow-x-auto">
            <table className="w-full border-collapse" style={{ fontFamily: "var(--font-type)", fontSize: 12 }}>
              <thead>
                <tr className="label-type border-b border-ink text-[10px] text-graphite">
                  <th className="px-2 py-1.5 text-left">Card</th>
                  <th className="px-2 py-1.5 text-right">Cost</th>
                  <th className="px-2 py-1.5 text-left">Rarity</th>
                  <th className="px-2 py-1.5 text-right">Played</th>
                  <th className="px-2 py-1.5 text-right">Win rate</th>
                </tr>
              </thead>
              <tbody>
                {cards
                  .slice()
                  .sort((a, b) => b.gamesPlayed - a.gamesPlayed)
                  .map((c) => (
                    <tr key={c.cardId} className="border-b border-pencil/40">
                      <td className="px-2 py-1.5">
                        <span className="small-caps" style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 600 }}>
                          {getCard(c.cardId).name}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 text-right">{c.cost}</td>
                      <td className="px-2 py-1.5">{c.rarity}</td>
                      <td className="px-2 py-1.5 text-right">{c.gamesPlayed}</td>
                      <td className="px-2 py-1.5 text-right">{c.winRate}%</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </Panel>
          <HandNote className="mt-3 block text-center text-xl">figures aggregated by the archive, not the players</HandNote>
        </section>
      )}
    </main>
  );
}
