"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { ensureGuest, getLeaderboard, getMeta, type LeaderboardRow, type MetaData } from "@/lib/api";
import { HandNote, Panel, Stamp, WashiTape } from "@/components/paper";
import { getCard } from "@/game/cards";

/**
 * THE DAILY INK — the stats page as a broadsheet. Every headline, obituary
 * and gossip line is typeset from the live /api/analytics/meta and
 * /api/leaderboard figures; nothing is invented, and every slot degrades to
 * real filler on a fresh install.
 */

interface LadderData {
  rows: LeaderboardRow[];
  ownRow: LeaderboardRow | null;
  bots: { key: string; name: string; mmr: number }[];
}

function formatDuration(ms: number): string {
  const m = Math.floor(ms / 60000);
  const s = Math.round((ms % 60000) / 1000);
  if (m <= 0) return `${s}s`;
  return `${m}m ${s}s`;
}

/** Display name for a match's opponentKey without inventing data. */
function opponentLabel(key: string): string {
  if (key.startsWith("duel:")) return "a rival across the table";
  if (key === "ink-draft") return "a drafted rival";
  if (key.length === 0) return "an unnamed rival";
  return key.charAt(0).toUpperCase() + key.slice(1);
}

/** A newspaper article: kicker, headline, thin ink rule above, typeface body. */
function Article({ kicker, headline, children }: { kicker: string; headline: ReactNode; children: ReactNode }) {
  return (
    <section className="mb-8 break-inside-avoid border-t border-ink pt-2">
      <div className="label-type text-[10px] tracking-[0.2em] text-graphite">{kicker}</div>
      <h3 className="small-caps mt-1 text-xl font-bold leading-tight md:text-2xl">{headline}</h3>
      <div className="mt-2 space-y-2 text-[13px] leading-relaxed" style={{ fontFamily: "var(--font-type)" }}>
        {children}
      </div>
    </section>
  );
}

export default function MetaPage() {
  const [data, setData] = useState<MetaData | null>(null);
  const [ladder, setLadder] = useState<LadderData | null>(null);
  const [today, setToday] = useState("");

  useEffect(() => {
    void (async () => {
      await ensureGuest();
      const [meta, ladderData] = await Promise.all([getMeta(), getLeaderboard()]);
      setData(meta);
      setLadder(ladderData);
      setToday(
        new Date()
          .toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })
          .toUpperCase(),
      );
    })();
  }, []);

  const issue = (data?.totalMatches ?? 0) + 1;
  const lead = (data?.bestWinRate ?? [])[0] ?? null;
  const mostPlayed = (data?.topPlayed ?? [])[0] ?? null;
  const marathon = (data?.longestMatches ?? [])[0] ?? null;
  const alsoPlayed = (data?.topPlayed ?? []).slice(1, 4);
  const runnersUp = (data?.longestMatches ?? []).slice(1);
  const ladderRows = ladder?.rows.slice(0, 3) ?? [];
  const costBuckets = (data?.costBuckets ?? [])
    .slice()
    .sort((a, b) => a.cost - b.cost)
    .filter((b) => b.card !== null);

  // the obituaries desk: lowest win rate among cards with three duels or more,
  // skipping the card already celebrated as the people's choice
  const obituary = useMemo(() => {
    const qualified = (data?.cards ?? []).filter((c) => c.gamesPlayed >= 3 && c.cardId !== lead?.cardId);
    if (qualified.length === 0) return null;
    return [...qualified].sort((a, b) => a.winRate - b.winRate || b.gamesPlayed - a.gamesPlayed)[0] ?? null;
  }, [data, lead]);

  const ledger = useMemo(() => (data?.cards ?? []).slice().sort((a, b) => b.gamesPlayed - a.gamesPlayed), [data]);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 pb-16">
      {/* ── masthead ── */}
      <header className="relative mt-10">
        <WashiTape angle={-2} className="left-1/2 top-0 -translate-x-1/2" width={110} />
        <div className="label-type flex items-baseline justify-between border-b border-ink pb-1 text-[10px] text-graphite">
          <span>ISSUE NO. {data ? issue : "—"}</span>
          <span>{today || "· · ·"}</span>
          <span className="hidden sm:inline">MONOCHROME EDITION</span>
        </div>
        <h1
          className="small-caps mt-2 text-center text-6xl font-bold tracking-tight md:text-8xl"
          style={{ textShadow: "0 1px 0 var(--color-cardstock), 0 3px 1px rgba(23,20,15,0.22)" }}
        >
          The Daily Ink
        </h1>
        <Stamp className="absolute right-0 top-12 rotate-6 text-[10px] md:text-xs">PRICE: ONE DUEL</Stamp>
        <div className="mt-3 border-y-4 border-ink py-1.5">
          <p className="label-type text-center text-[10px] tracking-[0.22em] text-graphite md:text-[11px]">
            ALL THE NEWS THAT&apos;S FIT TO PRINT — AND MOST THAT ISN&apos;T
          </p>
        </div>
      </header>

      {data === null ? (
        <p className="label-type mt-10 animate-pulse text-center text-sm text-graphite">Setting the type…</p>
      ) : (
        <>
          {/* ── the lead: highest win rate with 3+ duels ── */}
          <section className="mt-8">
            <div className="label-type text-[10px] tracking-[0.2em] text-graphite">THE LEAD · META DESK</div>
            {lead ? (
              <>
                <h2 className="small-caps mt-1 text-3xl font-bold leading-tight md:text-5xl">
                  THE PEOPLE&apos;S CARD: {lead.name.toUpperCase()} WINS {lead.winRate}% OF DUELS
                </h2>
                <p
                  className="mt-3 max-w-4xl text-[15px] leading-relaxed first-letter:float-left first-letter:mr-2 first-letter:mt-1 first-letter:text-6xl first-letter:font-bold first-letter:leading-[0.8]"
                  style={{ fontFamily: "var(--font-type)" }}
                >
                  Fielded {lead.gamesPlayed} times across the archive, {lead.name} — a {lead.cost}-cost {lead.rarity.toLowerCase()} — has
                  taken {lead.winRate}% of its duels, and the desk double-checked the ledger before printing the figure. The table cannot
                  stop dealing it in.
                  {(() => {
                    const second = data.bestWinRate[1];
                    return second ? ` The chase is led by ${second.name} at ${second.winRate}%, gaining ground one printing at a time.` : "";
                  })()}
                </p>
              </>
            ) : (
              <>
                <h2 className="small-caps mt-1 text-3xl font-bold leading-tight md:text-5xl">A SLOW NEWS DAY AT THE BLANK PAGE</h2>
                <p
                  className="mt-3 max-w-4xl text-[15px] leading-relaxed first-letter:float-left first-letter:mr-2 first-letter:mt-1 first-letter:text-6xl first-letter:font-bold first-letter:leading-[0.8]"
                  style={{ fontFamily: "var(--font-type)" }}
                >
                  The presses are warm, the rules are posted, and the type is set — but no card has yet survived the three duels it takes to
                  reach this page. Until then the Blank Page keeps its perfect record: it has never lost a duel it was never dealt into.
                  Correspondents expect history to begin the moment the first deck list hits the table.
                </p>
              </>
            )}
          </section>

          {/* ── the broadsheet columns ── */}
          <div className="mt-8 gap-8 [column-rule:1px_solid_var(--color-pencil)] md:columns-2 xl:columns-3">
            {/* most played */}
            {mostPlayed ? (
              <Article kicker="THE BINDERY REPORT" headline={`${mostPlayed.name.toUpperCase()} SEEN IN ${mostPlayed.gamesPlayed} DECKS`}>
                <p>
                  No card has been printed more often: the archive logs {mostPlayed.gamesPlayed} fieldings of {mostPlayed.name} at a{" "}
                  {mostPlayed.winRate}% win rate, and the bindery expects the run to continue.
                </p>
                {alsoPlayed.length > 0 && (
                  <p>
                    Also spotted on the table:{" "}
                    {alsoPlayed
                      .map((c) => `${c.name} (${c.gamesPlayed})`)
                      .join(", ")}
                    .
                  </p>
                )}
              </Article>
            ) : (
              <Article kicker="THE BINDERY REPORT" headline="AN EMPTY SHELF AT THE BINDERY">
                <p>
                  No card has been printed into a duel yet, and the shelf sits bare. The first deck list to reach the table will lead this
                  column tomorrow — bring ink.
                </p>
              </Article>
            )}

            {/* obituaries */}
            {obituary ? (
              <Article kicker="THE OBITUARIES" headline={`IN MEMORIAM: ${obituary.name.toUpperCase()}`}>
                <p>
                  {obituary.name}, survived only {obituary.winRate}% of its duels. It is survived by its echoes.
                </p>
                <p>
                  The card was fielded {obituary.gamesPlayed} times and outlasted the mortician&apos;s arithmetic; services are pending until
                  the meta turns and the echoes get their second printing.
                </p>
              </Article>
            ) : (
              <Article kicker="THE OBITUARIES" headline="NOTHING TO MOURN THIS EDITION">
                <p>
                  The obituaries desk reports no card fallen hard enough to earn a eulogy — either the meta is kind, or not enough duels have
                  been dealt. The echoes, for now, keep to themselves.
                </p>
              </Article>
            )}

            {/* the marathon */}
            {marathon ? (
              <Article
                kicker="SPORTS DESK"
                headline={`THE MARATHON: ${marathon.turns} TURNS AGAINST ${opponentLabel(marathon.opponentKey).toUpperCase()}`}
              >
                <p>
                  The longest duel on record ran {marathon.turns} turns before the tape closed — it reads {marathon.result.toLowerCase()} for
                  the home side, filed {new Date(marathon.createdAt).toLocaleDateString()}.
                </p>
                {runnersUp.length > 0 && (
                  <p>
                    Runners-up: {runnersUp.map((m) => `${m.turns} turns (${opponentLabel(m.opponentKey)})`).join(", ")} — the archive keeps
                    every one of them.
                  </p>
                )}
              </Article>
            ) : (
              <Article kicker="SPORTS DESK" headline="THE MARATHON DESK IS QUIET">
                <p>
                  No long wars on record yet. The tape keeps every turn, so the desk will know — bring a grudge, a full deck, and an
                  afternoon.
                </p>
              </Article>
            )}

            {/* the ladder */}
            {ladderRows.length > 0 ? (
              <Article kicker="THE LADDER" headline="STANDINGS AT THE TOP OF THE STACK">
                <ol className="space-y-1.5">
                  {ladderRows.map((r) => (
                    <li key={r.id} className="flex items-baseline gap-2">
                      <span className="text-graphite">{r.position}.</span>
                      <span className="small-caps text-[15px] font-semibold" style={{ fontFamily: "var(--font-display)" }}>
                        {r.name}
                      </span>
                      <span className="ml-auto text-graphite">
                        {r.mmr} MMR · {r.wins}–{r.losses}
                      </span>
                    </li>
                  ))}
                </ol>
                <p>
                  The full standings, bots included, live{" "}
                  <Link href="/leaderboard" className="underline underline-offset-4">
                    here
                  </Link>
                  .
                </p>
              </Article>
            ) : (
              <Article kicker="THE LADDER" headline="THE LADDER IS WET INK">
                <p>
                  No names posted yet — the first climb is always the quietest. The issue is open and the ink is not dry;{" "}
                  <Link href="/leaderboard" className="underline underline-offset-4">
                    the standings
                  </Link>{" "}
                  will fill as duels are filed.
                </p>
              </Article>
            )}

            {/* market prices */}
            {costBuckets.length > 0 && (
              <Article kicker="COMMERCIAL ADVERTISER" headline="THE PRICE OF INK">
                <p>Most-played card at each price point, straight from the stationer&apos;s ledger:</p>
                <ul className="mt-1 space-y-1">
                  {costBuckets.map(({ cost, card }) => (
                    <li key={cost} className="flex items-baseline gap-2">
                      <span
                        className="label-type flex h-5 w-5 items-center justify-center rounded-full text-[9px]"
                        style={{ background: "var(--color-ink)", color: "var(--color-paper)" }}
                      >
                        {cost === 7 ? "7+" : cost}
                      </span>
                      <span className="small-caps text-[14px] font-semibold" style={{ fontFamily: "var(--font-display)" }}>
                        {card?.name}
                      </span>
                      <span className="ml-auto text-graphite">{card?.gamesPlayed}×</span>
                    </li>
                  ))}
                </ul>
              </Article>
            )}

            {/* gossip column */}
            <section className="mb-8 break-inside-avoid border-t border-ink pt-2">
              <div className="label-type text-[10px] tracking-[0.2em] text-graphite">FROM THE SEALED WING</div>
              <h3 className="small-caps mt-1 text-xl font-bold leading-tight md:text-2xl">GOSSIP, GRIME &amp; DUPLICATES</h3>
              <HandNote className="mt-2 block text-xl leading-snug">
                The Blot denies everything, as usual. Staff confide the archive now holds {data.totalMatches} duel
                {data.totalMatches === 1 ? "" : "s"}, each averaging {data.averageTurns} turns ({formatDuration(data.averageDurationMs)} of
                wet ink) before somebody&apos;s margins run red. A source close to the recycling bin insists the duplicates are “happier as
                slips,” which is exactly what a wing full of legendaries would say.
              </HandNote>
            </section>
          </div>

          {/* ── the full ledger ── */}
          {ledger.length > 0 && (
            <section className="mt-4">
              <h2 className="label-type border-b-2 border-ink pb-1 text-sm">THE FULL LEDGER — EVERY CARD ON FILE</h2>
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
                    {ledger.map((c) => (
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

          <div className="mt-10 text-center">
            <p className="label-type text-[10px] text-graphite">
              THE DAILY INK · PRINTED IN MONOCHROME · NO DUELS WERE INVENTED IN THE MAKING OF THIS ISSUE
            </p>
            <div className="mt-3">
              <Link href="/" className="label-type focus-ink text-xs underline underline-offset-4">
                ← back to the front page
              </Link>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
