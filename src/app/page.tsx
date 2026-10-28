"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ensureGuest, getMe, getMeta, getQuestToday, type MeProfile, type MetaData, type QuestDto } from "@/lib/api";
import { resetTutorialFlags } from "@/components/onboarding/Tutorial";
import { HandNote, StampButton, Stamp, WashiTape } from "@/components/paper";
import { RankBadge } from "@/components/rank-badge";
import { CardFace } from "@/components/card/CardFace";
import { getCard } from "@/game/cards";
import { GAME_NAME, GAME_TAGLINE, type RankKey } from "@/config";

const SPOTLIGHT = ["paper_swan", "ink_blot", "red_pen", "the_calligrapher"].map(getCard);

const RANK_KEY_BY_NAME: Record<string, RankKey> = {
  Wood: "wood",
  Bronze: "bronze",
  Silver: "silver",
  Gold: "gold",
  Platinum: "platinum",
  Obsidian: "obsidian",
  "INK MASTER": "ink-master",
};

const NAV = [
  { href: "/campaign", label: "Campaign" },
  { href: "/packs", label: "Packs" },
  { href: "/collection", label: "Collection" },
  { href: "/decks", label: "Decks" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/profile", label: "Profile" },
  { href: "/meta", label: "The Daily Ink" },
];

export default function HomePage() {
  const [me, setMe] = useState<MeProfile | null>(null);
  const [quest, setQuest] = useState<QuestDto | null>(null);
  const [meta, setMeta] = useState<MetaData | null>(null);
  const [playHref, setPlayHref] = useState("/duel");

  useEffect(() => {
    void (async () => {
      // route first-time players through the prologue before their first duel
      if (window.localStorage.getItem("inkduel:seenPrologue") === "1") {
        setPlayHref("/duel");
      } else {
        setPlayHref("/prologue");
      }
      await ensureGuest();
      const [meData, q, m] = await Promise.all([getMe(), getQuestToday(), getMeta()]);
      setMe(meData);
      setQuest(q);
      setMeta(m);
    })();
  }, []);

  const leadCard = meta?.topPlayed?.[0];
  const bestCard = meta?.bestWinRate?.[0];

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 pb-16">
      {/* ── masthead ── */}
      <header className="relative pt-8 text-center">
        <div className="label-type flex items-center justify-between text-[11px] text-graphite">
          <span>Vol. I — No. 1</span>
          <span className="hidden sm:inline">Weather: ink, heavy at times</span>
          <span>Printed in one color, on purpose</span>
        </div>
        <div className="relative mt-2 border-y-4 border-ink py-4">
          {/* ambient dealing hand across the masthead */}
          <MastheadDeal />
          <h1 className="small-caps relative text-6xl font-bold tracking-wide md:text-8xl" style={{ fontFamily: "var(--font-display)" }}>
            {GAME_NAME}
          </h1>
          <p className="font-hand relative mt-1 text-2xl text-graphite">{GAME_TAGLINE}</p>
          <InkSwash />
        </div>
        <div className="label-type mt-2 flex items-center justify-between text-[11px] text-graphite">
          <span>20-card decks · 5 slots · 30 HP</span>
          <span className="hidden sm:inline">&ldquo;the nib is mightier&rdquo;</span>
          <span>est. MMXXVI</span>
        </div>

        <nav className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-y border-ink py-3">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="label-type focus-ink text-sm text-ink underline-offset-4 hover:underline"
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </header>

      {/* ── front page: lead story + sidebar ── */}
      <section className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-[1.7fr_1fr]">
        <article className="relative">
          <div className="label-type text-[10px] tracking-[0.2em] text-graphite">LEAD STORY · FROM THE DUELING DESK</div>
          <h2 className="mt-2 text-3xl font-bold leading-tight md:text-4xl">
            {leadCard ? (
              <>
                <span className="small-caps">{leadCard.name}</span> seen at every table in town
              </>
            ) : (
              <>Paper golems rise: the dueling season opens</>
            )}
          </h2>
          <div className="label-type mt-1 text-[10px] text-graphite">
            {leadCard
              ? `printings to date: ${leadCard.gamesPlayed} · win rate ${leadCard.winRate}%`
              : "no duels on record — the archive awaits its first line"}
          </div>
          <hr className="my-3 border-ink" />
          <div className="gap-6 text-[15px] leading-relaxed text-ink columns-1 md:columns-2 [&_p]:mt-3">
            <p>
              <span className="float-left mr-2 text-5xl font-bold leading-[0.85]" style={{ fontFamily: "var(--font-display)" }}>
                T
              </span>
              he archive confirms what every scribe whispered: duels are once again
              fought in ink. Witnesses describe fountains of red stamps, walls of
              crumpled notes, and at least one dragon folded from a legal brief.
            </p>
            <p>
              {bestCard
                ? `Meanwhile, ${bestCard.name} posts a ${bestCard.winRate}% win rate across ${bestCard.gamesPlayed} printings — the margins have never been sharper.`
                : "The margins remain unwritten. Take a deck, sharpen a pencil, and give the archive something to print."}
            </p>
            <p>
              Four house players hold the ladder — from the reckless Duelist to the
              dreadful Archivist — and every match is stamped, sealed, and counted
              toward the standing of your name.
            </p>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-5">
            <Link href={playHref}>
              <motion.span
                className="inline-block"
                whileHover={{ rotate: -2, scale: 1.04 }}
                whileTap={{ rotate: 1, scale: 0.97 }}
              >
                <StampButton size="lg" className="text-2xl">
                  PLAY
                </StampButton>
              </motion.span>
            </Link>
            <Link href="/duel?mode=hotseat" className="focus-ink">
              <HandNote className="text-xl underline decoration-dashed underline-offset-4">
                or pass &amp; play with a friend →
              </HandNote>
            </Link>
            <HandNote className="text-2xl">← it only takes one pen</HandNote>
          </div>
          <div className="mt-3">
            <button
              type="button"
              className="focus-ink label-type text-[10px] text-graphite underline underline-offset-4"
              onClick={() => {
                window.localStorage.removeItem("inkduel:seenPrologue");
                resetTutorialFlags();
                window.location.href = "/prologue";
              }}
            >
              ⟲ replay the intro &amp; first-duel tips
            </button>
          </div>

          {/* spotlight cards dealing in */}
          <div className="mt-10">
            <div className="label-type text-[10px] tracking-[0.2em] text-graphite">CARDS IN THE SPOTLIGHT</div>
            <SpotlightFan />
          </div>
        </article>

        {/* sidebar */}
        <aside className="space-y-5">
          <div className="label-type border-b-2 border-ink pb-1 text-xs">TODAY&apos;S PRESS</div>

          {me && (
            <div className="relative flex items-center gap-3 p-3" style={{ background: "var(--color-cardstock)", border: "1.5px solid var(--color-ink)", borderRadius: "10px 8px 12px 9px / 8px 12px 9px 10px" }}>
              <RankBadge rank={RANK_KEY_BY_NAME[me.rank.name] ?? "wood"} size={48} />
              <div>
                <div className="label-type text-[10px] text-graphite">CURRENT RANK</div>
                <div className="small-caps text-xl font-semibold">{me.rank.name}</div>
                <div className="label-type text-[10px] text-graphite">
                  {me.mmr} MMR · {me.wins}W {me.losses}L
                </div>
              </div>
            </div>
          )}

          {quest && (
            <div className="relative max-w-full -rotate-2 p-4" style={{ background: "var(--color-paper-deep)", border: "1.5px solid var(--color-pencil)", borderRadius: "10px 8px 12px 9px / 8px 12px 9px 10px" }}>
              <WashiTape angle={-6} className="left-1/2 top-0 -translate-x-1/2" width={80} />
              <div className="label-type text-[10px] text-graphite">TODAY&apos;S QUEST</div>
              <HandNote className="text-xl leading-tight">{quest.description}</HandNote>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full" style={{ background: "var(--color-cardstock)", border: "1px solid var(--color-pencil)" }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.min(100, (quest.progress / quest.target) * 100)}%`, background: quest.completed ? "var(--color-ink)" : "var(--color-graphite)" }}
                />
              </div>
              <div className="label-type mt-1 text-[10px] text-graphite">
                {quest.progress}/{quest.target} {quest.completed && "· COMPLETE"}
              </div>
            </div>
          )}

          <div className="p-3" style={{ border: "1.5px solid var(--color-ink)", borderRadius: "var(--cut-b)" }}>
            <div className="label-type text-[10px] text-graphite">MOST PLAYED THIS WEEK</div>
            {leadCard ? (
              <div className="mt-2 flex items-center gap-3">
                <div style={{ ["--card-w" as string]: "64px" }}>
                  <CardFace card={getCard(leadCard.cardId)} size="token" />
                </div>
                <div>
                  <div className="small-caps text-lg font-semibold leading-tight">{leadCard.name}</div>
                  <div className="label-type text-[10px] text-graphite">{leadCard.gamesPlayed} printings</div>
                </div>
              </div>
            ) : (
              <HandNote className="text-xl">the presses are waiting</HandNote>
            )}
          </div>

          <div className="p-3" style={{ border: "1.5px dashed var(--color-pencil)", borderRadius: "var(--cut-a)" }}>
            <div className="label-type text-[10px] text-graphite">HOUSE CHALLENGERS</div>
            <ul className="mt-2 space-y-1 text-sm text-graphite">
              <li className="flex justify-between"><span className="small-caps text-ink">The Duelist</span> 900</li>
              <li className="flex justify-between"><span className="small-caps text-ink">The Gambler</span> 1050</li>
              <li className="flex justify-between"><span className="small-caps text-ink">The Collector</span> 1150</li>
              <li className="flex justify-between"><span className="small-caps text-ink">The Archivist</span> 1400</li>
            </ul>
          </div>

          <div className="text-center">
            <Stamp className="text-xs">FULL COVERAGE AT /META</Stamp>
          </div>
        </aside>
      </section>

      <footer className="mt-16 border-t-2 border-ink pt-4 text-center">
        <p className="label-type text-[11px] text-graphite">
          All rights reserved by whoever holds the pen
        </p>
      </footer>
    </main>
  );
}

/** Cards dealt one by one across the masthead, then idling with a gentle float. */
function MastheadDeal() {
  const reduce = useReducedMotion();
  const cards = SPOTLIGHT;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-2 flex justify-center gap-3 md:gap-5">
      {cards.map((card, i) => {
        const mid = (cards.length - 1) / 2;
        const rest = (i - mid) * 4;
        return (
          <motion.div
            key={card.id}
            className="relative opacity-[0.16]"
            style={{ width: 92, filter: "grayscale(1)" }}
            initial={reduce ? { opacity: 0 } : { opacity: 0, x: -420 + i * 30, y: -160, rotate: -40 }}
            animate={
              reduce
                ? { opacity: 0.16 }
                : {
                    opacity: [0, 0.16],
                    x: [-420 + i * 30, 0],
                    y: [-160, 0, -3, 0],
                    rotate: [-40, rest, rest + 1.2, rest],
                    transition: {
                      duration: 2.6,
                      delay: 0.35 * i,
                      times: [0, 0.55, 0.8, 1],
                      opacity: { duration: 0.5, delay: 0.35 * i },
                    },
                  }
            }
          >
            <CardFace card={card} size="token" />
          </motion.div>
        );
      })}
    </div>
  );
}

/** Hand-drawn swash under the tagline. */
function InkSwash() {
  return (
    <svg viewBox="0 0 300 14" className="mx-auto mt-2 w-56" aria-hidden>
      <path
        d="M4 9 C40 2 70 12 110 7 C150 2 180 12 220 7 C250 4 275 9 296 6"
        fill="none"
        stroke="var(--color-ink)"
        strokeWidth="2.6"
        strokeLinecap="round"
        opacity="0.75"
      />
      <circle cx="297" cy="6" r="1.8" fill="var(--color-ink)" />
    </svg>
  );
}

/** Spotlight cards deal in and idle-float. */
function SpotlightFan() {
  const reduce = useReducedMotion();
  return (
    <div className="mt-4 flex flex-wrap items-start justify-center gap-4">
      {SPOTLIGHT.map((card, i) => {
        const rest = (i - 1.5) * 2.4;
        return (
          <motion.div
            key={card.id}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -120, rotate: (i - 1.5) * 8, x: -160 }}
            animate={
              reduce
                ? { opacity: 1 }
                : { opacity: 1, y: [ -120, 0, -4, 0 ], rotate: [(i - 1.5) * 8, rest, rest + 0.8, rest], x: [-160, 0] }
            }
            transition={{
              duration: 1.4,
              delay: 0.6 + 0.18 * i,
              times: [0, 0.7, 0.88, 1],
              opacity: { duration: 0.4, delay: 0.6 + 0.18 * i },
            }}
            whileHover={{ rotate: 0, scale: 1.07, y: -8, zIndex: 10 }}
          >
            <CardFace card={card} size="collection" />
          </motion.div>
        );
      })}
    </div>
  );
}
