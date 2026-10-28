"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ensureGuest, getLeaderboard, type LeaderboardRow } from "@/lib/api";
import { Panel, Stamp } from "@/components/paper";
import { RankBadge } from "@/components/rank-badge";
import { BOTS } from "@/game/ai";
import type { RankKey } from "@/config";

const RANK_KEY_BY_NAME: Record<string, RankKey> = {
  Wood: "wood",
  Bronze: "bronze",
  Silver: "silver",
  Gold: "gold",
  Platinum: "platinum",
  Obsidian: "obsidian",
  "INK MASTER": "ink-master",
};

export default function LeaderboardPage() {
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null);
  const [own, setOwn] = useState<LeaderboardRow | null>(null);

  useEffect(() => {
    void (async () => {
      await ensureGuest();
      const data = await getLeaderboard();
      if (data) {
        setRows(data.rows);
        setOwn(data.ownRow);
      } else {
        setRows([]);
      }
    })();
  }, []);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 pb-16">
      <header className="mt-10 text-center">
        <div className="label-type text-[11px] text-graphite">STANDINGS · PRINTED DAILY</div>
        <h1 className="small-caps mt-1 border-y-4 border-ink py-3 text-5xl font-bold">TOP {rows?.length ?? 100} INKMASTERS</h1>
      </header>

      {rows === null ? (
        <p className="label-type mt-10 animate-pulse text-center text-sm text-graphite">Ink still drying…</p>
      ) : (
        <Panel className="mt-8 overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="label-type border-b-2 border-ink text-[10px] text-graphite">
                <th className="px-3 py-2 text-left">#</th>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Rank</th>
                <th className="px-3 py-2 text-right">MMR</th>
                <th className="hidden px-3 py-2 text-right sm:table-cell">W/L</th>
              </tr>
            </thead>
            <tbody style={{ fontFamily: "var(--font-type)" }}>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-sm text-graphite">
                    The table is blank. Be the first name in ink — <Link href="/duel" className="underline">play a duel</Link>.
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className={`border-b border-pencil/40 ${own?.id === r.id ? "target-ring" : ""}`}
                >
                  <td className="px-3 py-2 text-left">{r.position}</td>
                  <td className="px-3 py-2 text-left">{r.name}</td>
                  <td className="px-3 py-2 text-left">
                    <span className="inline-flex items-center gap-2">
                      <RankBadge rank={RANK_KEY_BY_NAME[r.rank] ?? "wood"} size={24} />
                      <span className="text-xs">{r.rank}</span>
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">{r.mmr}</td>
                  <td className="hidden px-3 py-2 text-right text-xs text-graphite sm:table-cell">
                    {r.wins}/{r.losses}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}

      {own && (
        <p className="label-type mt-4 text-center text-xs text-graphite">
          You stand at position {own.position} with {own.mmr} MMR.
        </p>
      )}

      {/* the house bots, for reference */}
      <section className="mt-10">
        <h2 className="label-type text-sm text-graphite">THE HOUSE PLAYERS</h2>
        <div className="mt-3 flex flex-wrap justify-center gap-4">
          {BOTS.map((b) => (
            <Panel key={b.key} className="flex w-56 flex-col items-center gap-2 p-4 text-center">
              <RankBadge rank={b.elo >= 1400 ? "gold" : b.elo >= 1000 ? "bronze" : "wood"} size={34} />
              <div className="small-caps text-lg font-semibold">{b.name}</div>
              <Stamp className="text-[10px]">{b.elo} MMR</Stamp>
              <p className="text-xs text-graphite">{b.blurb}</p>
            </Panel>
          ))}
        </div>
      </section>
    </main>
  );
}
