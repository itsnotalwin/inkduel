"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ensureGuest, getAchievements, getMatchHistory, getMe, type MatchDto } from "@/lib/api";
import { HandNote, Panel, Stamp, StampButton, WashiTape } from "@/components/paper";
import { RankBadge } from "@/components/rank-badge";
import { getCard } from "@/game/cards";
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

interface MeData {
  name: string;
  mmr: number;
  rank: { key: string; name: string; min: number };
  wins: number;
  losses: number;
  draws: number;
  matches: number;
  winRate: number;
  streak: number;
  bestStreak: number;
}

interface AchievementDto {
  key: string;
  name: string;
  description: string;
  icon: string;
  unlocksCard: string | null;
  unlocked: boolean;
}

function MmrSparkline({ matches }: { matches: MatchDto[] }) {
  // chronological ascending
  const points = [...matches].reverse();
  if (points.length < 2) {
    return <HandNote className="text-xl">the line begins with your next duel…</HandNote>;
  }
  const values = [points[0].playerMmrBefore, ...points.map((m) => m.playerMmrAfter)];
  const min = Math.min(...values) - 5;
  const max = Math.max(...values) + 5;
  const w = 560;
  const h = 90;
  const step = w / (values.length - 1);
  const d = values
    .map((v, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)} ${(h - ((v - min) / (max - min)) * h).toFixed(1)}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ overflow: "visible" }} aria-label="MMR history">
      <path d={d} fill="none" stroke="var(--color-ink)" strokeWidth="2.2" strokeLinecap="round" />
      {values.map((v, i) => (
        <circle key={i} cx={i * step} cy={h - ((v - min) / (max - min)) * h} r="2.6" fill="var(--color-ink)" />
      ))}
    </svg>
  );
}

export default function ProfilePage() {
  const [me, setMe] = useState<MeData | null>(null);
  const [achievements, setAchievements] = useState<AchievementDto[] | null>(null);
  const [history, setHistory] = useState<MatchDto[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  useEffect(() => {
    void (async () => {
      await ensureGuest();
      const [meData, ach] = await Promise.all([getMe(), getAchievements()]);
      setMe(meData);
      setAchievements(ach?.achievements ?? []);
    })();
  }, []);

  useEffect(() => {
    void (async () => {
      const h = await getMatchHistory(page);
      if (h) {
        setHistory(h.matches);
        setPages(h.pages);
      }
    })();
  }, [page]);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 pb-16">
      <header className="mt-10 text-center">
        <div className="label-type text-[11px] text-graphite">PERSONAL RECORD</div>
        <h1 className="small-caps mt-1 border-y-4 border-ink py-3 text-5xl font-bold">The Player&apos;s Page</h1>
      </header>

      {!me ? (
        <p className="label-type mt-10 animate-pulse text-center text-sm text-graphite">Fetching the record…</p>
      ) : (
        <>
          <section className="mt-8 flex flex-wrap items-center justify-center gap-8">
            <div className="flex flex-col items-center gap-2">
              <RankBadge rank={RANK_KEY_BY_NAME[me.rank.name] ?? "wood"} size={72} />
              <Stamp className="text-xs">{me.rank.name}</Stamp>
            </div>
            <Panel className="p-6">
              <div className="small-caps text-3xl font-bold">{me.name}</div>
              <div className="mt-3 grid grid-cols-2 gap-x-10 gap-y-2" style={{ fontFamily: "var(--font-type)", fontSize: 13 }}>
                <span className="text-graphite">MMR</span>
                <span className="text-right">{me.mmr}</span>
                <span className="text-graphite">Win rate</span>
                <span className="text-right">{me.winRate}%</span>
                <span className="text-graphite">Record</span>
                <span className="text-right">{me.wins}W · {me.losses}L · {me.draws}D</span>
                <span className="text-graphite">Streak</span>
                <span className="text-right">{me.streak} (best {me.bestStreak})</span>
              </div>
            </Panel>
            <Panel className="flex w-full max-w-md flex-col gap-2 p-6 md:w-auto">
              <div className="label-type text-xs text-graphite">MMR · LAST {Math.max(history.length, 1)} MATCHES</div>
              <MmrSparkline matches={history} />
            </Panel>
          </section>

          {/* achievement wall */}
          <section className="mt-12">
            <h2 className="label-type border-b-2 border-ink pb-2 text-sm">ACHIEVEMENT WALL</h2>
            <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {(achievements ?? []).map((a) => (
                <motion.div
                  key={a.key}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`relative flex flex-col items-center gap-2 p-4 text-center ${a.unlocked ? "ink-frame" : ""}`}
                  style={
                    a.unlocked
                      ? undefined
                      : { border: "2px dashed var(--color-pencil)", borderRadius: "12px 9px 13px 8px / 9px 12px 8px 13px" }
                  }
                >
                  {a.unlocked && <WashiTape angle={-4} className="left-1/2 top-0 -translate-x-1/2" width={64} />}
                  <Stamp tone={a.unlocked ? "ink" : "red"} className="text-xs">
                    {a.unlocked ? a.name : "?"}
                  </Stamp>
                  <p className={`text-xs ${a.unlocked ? "text-ink" : "text-pencil"}`}>{a.description}</p>
                  {a.unlocksCard && (
                    <p className="label-type text-[9px]" style={{ color: a.unlocked ? "var(--color-ink)" : "var(--color-pencil)" }}>
                      UNLOCKS: {getCard(a.unlocksCard).name}
                    </p>
                  )}
                  {!a.unlocked && <HandNote className="text-base">keep dueling…</HandNote>}
                </motion.div>
              ))}
            </div>
          </section>

          {/* match history */}
          <section className="mt-12">
            <h2 className="label-type border-b-2 border-ink pb-2 text-sm">MATCH HISTORY</h2>
            <Panel className="mt-4 overflow-x-auto">
              <table className="w-full border-collapse" style={{ fontFamily: "var(--font-type)", fontSize: 12 }}>
                <thead>
                  <tr className="label-type border-b border-ink text-[10px] text-graphite">
                    <th className="px-3 py-2 text-left">Date</th>
                    <th className="px-3 py-2 text-left">Opponent</th>
                    <th className="px-3 py-2 text-left">Result</th>
                    <th className="hidden px-3 py-2 text-right sm:table-cell">HP</th>
                    <th className="hidden px-3 py-2 text-right sm:table-cell">Turns</th>
                    <th className="hidden px-3 py-2 text-right sm:table-cell">MMR</th>
                    <th className="px-3 py-2 text-right">Tape</th>
                  </tr>
                </thead>
                <tbody>
                  {history.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-3 py-6 text-center text-graphite">
                        No duels on record yet. <Link href="/duel" className="underline">Fix that.</Link>
                      </td>
                    </tr>
                  )}
                  {history.map((m) => (
                    <tr key={m.id} className="border-b border-pencil/40">
                      <td className="px-3 py-2">{new Date(m.createdAt).toLocaleDateString()}</td>
                      <td className="px-3 py-2">{m.opponentKey}</td>
                      <td className="px-3 py-2" style={{ color: m.result === "WIN" ? "var(--color-ink)" : "var(--color-red-stamp)" }}>
                        {m.result}
                      </td>
                      <td className="hidden px-3 py-2 text-right sm:table-cell">{m.playerHpLeft}–{m.botHpLeft}</td>
                      <td className="hidden px-3 py-2 text-right sm:table-cell">{m.turns}</td>
                      <td className="hidden px-3 py-2 text-right sm:table-cell">
                        {m.playerMmrBefore} → {m.playerMmrAfter}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {m.hasActions ? (
                          <Link href={`/replays?id=${m.id}`} className="underline underline-offset-2">
                            replay
                          </Link>
                        ) : (
                          <span className="text-pencil">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>
            <div className="mt-3 flex items-center justify-center gap-3">
              <StampButton size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                ← Newer
              </StampButton>
              <span className="label-type text-xs text-graphite">
                Page {page}/{pages}
              </span>
              <StampButton size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
                Older →
              </StampButton>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
