"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ensureGuest, getCampaign, type CampaignState } from "@/lib/api";
import { getCard } from "@/game/cards";
import { HandNote, Panel, Stamp, StampButton } from "@/components/paper";
import { RankBadge } from "@/components/rank-badge";

export default function CampaignPage() {
  const [state, setState] = useState<CampaignState | null>(null);

  useEffect(() => {
    void (async () => {
      await ensureGuest();
      setState(await getCampaign());
    })();
  }, []);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 pb-16">
      <header className="mt-10 text-center">
        <div className="label-type text-[11px] text-graphite">THE ARCHIVE CAMPAIGN · 12 STAGES</div>
        <h1 className="small-caps mt-1 border-y-4 border-ink py-3 text-5xl font-bold">The Campaign</h1>
        <HandNote className="mt-2 text-xl">
          twelve keepers stand between you and the Head Archivist. Beat each one once for the purse — replays pay a little.
        </HandNote>
      </header>

      {state === null ? (
        <p className="label-type mt-10 animate-pulse text-center text-sm text-graphite">Unrolling the campaign map…</p>
      ) : (
        <div className="relative mt-10">
          {/* dashed path down the map */}
          <svg viewBox="0 0 20 100" preserveAspectRatio="none" aria-hidden className="pointer-events-none absolute inset-y-0 left-1/2 h-full w-6 -translate-x-1/2 md:left-24 md:translate-x-0">
            <path d="M10 0 C 14 15, 6 30, 10 45 S 14 75, 10 100" fill="none" stroke="var(--color-pencil)" strokeWidth="2.5" strokeDasharray="7 5" />
          </svg>

          <div className="space-y-5">
            {state.stages.map((stage, i) => {
              const def = stage.rewardCard ? getCard(stage.rewardCard) : null;
              return (
                <motion.div
                  key={stage.index}
                  initial={{ opacity: 0, x: i % 2 === 0 ? -24 : 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * i }}
                  className={`relative flex items-stretch gap-4 md:ml-16 ${stage.unlocked ? "" : "opacity-60"}`}
                >
                  <div className="hidden w-14 shrink-0 items-center justify-center md:flex">
                    <RankBadge rank={stage.cleared ? "ink-master" : stage.unlocked ? "gold" : "wood"} size={44} />
                  </div>
                  <Panel className={`flex flex-1 flex-col gap-2 p-4 ${stage.cleared ? "bg-cardstock" : ""}`}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="label-type text-[10px] text-graphite">STAGE {stage.index + 1}</span>
                      {stage.cleared && <Stamp tone="ink" className="text-[9px]">CLEARED</Stamp>}
                      {stage.index === state.progress && <Stamp tone="red" className="text-[9px]">CURRENT</Stamp>}
                      {!stage.unlocked && <Stamp tone="red" className="text-[9px]">LOCKED</Stamp>}
                      <span className="label-type ml-auto text-[10px] text-graphite">+{stage.rewardCoins} INK</span>
                    </div>
                    <h2 className="small-caps text-2xl font-bold leading-tight">{stage.name}</h2>
                    <p className="text-sm text-graphite">{stage.blurb}</p>
                    {def && (
                      <p className="label-type text-[10px] text-graphite">
                        FIRST CLEAR UNLOCKS: {def.name}
                      </p>
                    )}
                    {stage.unlocked && (
                      <div className="mt-1">
                        <Link href={`/duel?campaign=${stage.index}`}>
                          <StampButton size="sm" className={stage.index === state.progress ? "" : "opacity-70"}>
                            {stage.cleared ? "Replay" : "Duel"}
                          </StampButton>
                        </Link>
                      </div>
                    )}
                  </Panel>
                </motion.div>
              );
            })}
          </div>

          {state.progress >= state.stages.length && (
            <Panel className="mt-8 flex flex-col items-center gap-2 p-8 text-center" deep>
              <Stamp tone="red" className="text-3xl">CAMPAIGN COMPLETE</Stamp>
              <HandNote className="text-2xl">The archive is yours. The ranked ladder awaits a true Inkmaster.</HandNote>
            </Panel>
          )}
        </div>
      )}
    </main>
  );
}
