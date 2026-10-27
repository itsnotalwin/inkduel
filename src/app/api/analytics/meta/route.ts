import { prisma } from "@/lib/db";
import { ok } from "@/lib/session";
import { getCard } from "@/game/cards";

/** The Daily Ink: per-card play/win rates + match aggregates from real data. */
export async function GET() {
  const [stats, agg, matchCount] = await Promise.all([
    prisma.cardStat.findMany(),
    prisma.match.aggregate({
      _avg: { turns: true, durationMs: true },
      _count: { id: true },
    }),
    prisma.match.count(),
  ]);

  const longest = await prisma.match.findMany({ orderBy: { turns: "desc" }, take: 3 });

  const cards = stats
    .filter((s) => s.gamesPlayed > 0)
    .map((s) => {
      try {
        const def = getCard(s.cardId);
        return {
          cardId: s.cardId,
          name: def.name,
          cost: def.cost,
          rarity: def.rarity,
          type: def.type,
          gamesPlayed: s.gamesPlayed,
          winRate: Math.round((s.wins / s.gamesPlayed) * 100),
        };
      } catch {
        return null;
      }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const topPlayed = [...cards].sort((a, b) => b.gamesPlayed - a.gamesPlayed).slice(0, 10);
  const bestWinRate = [...cards]
    .filter((c) => c.gamesPlayed >= 3)
    .sort((a, b) => b.winRate - a.winRate || b.gamesPlayed - a.gamesPlayed)
    .slice(0, 10);

  // most-played card per cost bucket
  const buckets: Record<number, { cardId: string; name: string; gamesPlayed: number } | null> = {};
  for (const c of cards) {
    const b = Math.min(c.cost, 7);
    if (!buckets[b] || buckets[b]!.gamesPlayed < c.gamesPlayed) {
      buckets[b] = { cardId: c.cardId, name: c.name, gamesPlayed: c.gamesPlayed };
    }
  }

  return ok({
    totalMatches: matchCount,
    averageTurns: agg._avg.turns ? Math.round(agg._avg.turns * 10) / 10 : 0,
    averageDurationMs: agg._avg.durationMs ? Math.round(agg._avg.durationMs) : 0,
    topPlayed,
    bestWinRate,
    longestMatches: longest.map((m) => ({ turns: m.turns, result: m.result, opponentKey: m.opponentKey, createdAt: m.createdAt })),
    costBuckets: Object.entries(buckets).map(([cost, card]) => ({ cost: Number(cost), card })),
    cards,
  });
}

