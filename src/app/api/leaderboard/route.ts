import { prisma } from "@/lib/db";
import { getSessionPlayer, ok } from "@/lib/session";
import { rankFor, LEADERBOARD_SIZE } from "@/config";
import { BOTS } from "@/game/ai";

export async function GET() {
  const top = await prisma.player.findMany({
    orderBy: [{ mmr: "desc" }, { wins: "desc" }],
    take: LEADERBOARD_SIZE,
  });
  const rows = top.map((p, i) => ({
    position: i + 1,
    id: p.id,
    name: `${p.name}${p.tag}`,
    mmr: p.mmr,
    rank: rankFor(p.mmr).name,
    wins: p.wins,
    losses: p.losses,
    isBot: false,
  }));

  const player = await getSessionPlayer();
  let ownRow = null;
  if (player) {
    const higher = await prisma.player.count({ where: { mmr: { gt: player.mmr } } });
    ownRow = {
      position: higher + 1,
      id: player.id,
      name: `${player.name}${player.tag}`,
      mmr: player.mmr,
      rank: rankFor(player.mmr).name,
      wins: player.wins,
      losses: player.losses,
      isBot: false,
    };
  }

  return ok({ rows, ownRow, bots: BOTS.map((b) => ({ key: b.key, name: b.name, mmr: b.elo })) });
}

