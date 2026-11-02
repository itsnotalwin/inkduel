"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ensureGuest } from "@/lib/api";
import { HandNote, Panel, Stamp, StampButton, WashiTape } from "@/components/paper";

/** One row of the /api/puzzles payload (daily + archive share the shape). */
interface PuzzleView {
  id: string;
  title: string;
  brief: string;
  par: number;
  rewardInk: number;
  solved: boolean | null;
}

interface PuzzlesData {
  daily: PuzzleView;
  puzzles: PuzzleView[];
}

function RewardStamps({ p }: { p: PuzzleView }) {
  return (
    <span className="label-type text-[10px] text-graphite">
      PAR {p.par} · +{p.rewardInk} INK
    </span>
  );
}

function SolvedStamp({ p }: { p: PuzzleView }) {
  if (p.solved !== true) return null;
  return <Stamp tone="ink" className="text-[9px]">SOLVED</Stamp>;
}

export default function PuzzlesPage() {
  const [data, setData] = useState<PuzzlesData | null>(null);

  useEffect(() => {
    void (async () => {
      await ensureGuest(); // so the solved stamps reflect this session's record
      const res = await fetch("/api/puzzles");
      const body = (await res.json()) as { ok: boolean; data?: PuzzlesData };
      if (body.ok && body.data) setData(body.data);
    })();
  }, []);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 pb-16">
      <header className="mt-10 text-center">
        <div className="label-type text-[11px] text-graphite">THE ARCHIVIST&#39;S TESTS · GRADED DAILY</div>
        <h1 className="small-caps mt-1 border-y-4 border-ink py-3 text-5xl font-bold">The Tests</h1>
        <HandNote className="mt-2 text-xl">
          Six graded tests, one featured a day. Play the winning tape and the Archivist pays in ink — the daily pays extra, once a day.
        </HandNote>
      </header>

      {data === null ? (
        <p className="label-type mt-10 animate-pulse text-center text-sm text-graphite">Unlocking the test cabinet…</p>
      ) : (
        <>
          {/* ── Today's featured test ── */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="relative mt-10">
            <WashiTape className="-top-3 left-1/2 -translate-x-1/2" angle={-2} width={120} />
            <Panel deep className="flex flex-col gap-3 p-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="label-type inline-block border-2 border-ink px-2 py-0.5 text-[10px]">THE DAILY TEST</span>
                <SolvedStamp p={data.daily} />
                <RewardStamps p={data.daily} />
              </div>
              <h2 className="small-caps text-4xl font-bold leading-tight">{data.daily.title}</h2>
              <p className="text-base text-graphite">{data.daily.brief}</p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <Link href={`/duel?puzzle=${data.daily.id}`}>
                  <StampButton size="lg">Take the Test</StampButton>
                </Link>
                {data.daily.solved === true ? (
                  <HandNote className="text-lg">Solved. The Archivist nods, once.</HandNote>
                ) : (
                  <HandNote className="text-lg">First solve of the day earns the +25 bonus.</HandNote>
                )}
              </div>
            </Panel>
          </motion.div>

          {/* ── The archive ── */}
          <div className="mt-12 flex items-baseline gap-3">
            <h2 className="small-caps text-2xl font-bold">The Archive</h2>
            <HandNote className="text-base">every test on file, in order of cruelty</HandNote>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {data.puzzles.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i }}
              >
                <Panel className={`flex h-full flex-col gap-2 p-4 ${p.solved ? "bg-cardstock" : ""}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="label-type text-[10px] text-graphite">TEST {String(i + 1).padStart(2, "0")}</span>
                    {p.id === data.daily.id && <Stamp tone="red" className="text-[9px]">TODAY</Stamp>}
                    <SolvedStamp p={p} />
                    <RewardStamps p={p} />
                  </div>
                  <h3 className="small-caps text-xl font-bold leading-tight">{p.title}</h3>
                  <p className="flex-1 text-sm text-graphite">{p.brief}</p>
                  <div className="mt-1">
                    <Link href={`/duel?puzzle=${p.id}`}>
                      <StampButton size="sm" className={p.solved ? "opacity-70" : ""}>
                        {p.solved ? "Replay" : "Take the Test"}
                      </StampButton>
                    </Link>
                  </div>
                </Panel>
              </motion.div>
            ))}
          </div>

          <Panel className="mt-8 p-4">
            <HandNote className="text-base">
              The Archivist verifies every tape on the server — no ink for stories that don&#39;t replay. First solve of a test pays in
              full; re-solves are for pride.
            </HandNote>
          </Panel>
        </>
      )}
    </main>
  );
}
