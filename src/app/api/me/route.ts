import { prisma } from "@/lib/db";
import { fail, getSessionPlayer, ok } from "@/lib/session";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { ownedCardIds } from "@/lib/collection";
import { COLLECTIBLE_CARDS } from "@/game/cards";
import { CAMPAIGN_STAGES } from "@/game/campaign";
import { ZERO_SLIPS } from "@/game/packs";
import { rankFor } from "@/config";

export async function GET() {
  const player = await getSessionPlayer();
  if (!player) return fail("Not signed in", 401);

  const achievements = await prisma.playerAchievement.findMany({
    where: { playerId: player.id },
    include: { achievement: true },
  });
  const unlocked = new Set(achievements.map((a) => a.achievementKey));
  const extras = ((player.extraCards as string[] | null) ?? []);
  const owned = ownedCardIds([...unlocked], extras);
  const collection = COLLECTIBLE_CARDS.map((c) => ({
    ...c,
    owned: owned.has(c.id),
  }));

  const matches = player.wins + player.losses + player.draws;
  return ok({
    id: player.id,
    name: `${player.name}${player.tag}`,
    mmr: player.mmr,
    coins: player.coins,
    slips: { ...ZERO_SLIPS, ...((player.recycleSlips as Record<string, number> | null) ?? {}) },
    campaignStage: player.campaignStage,
    campaignTotal: CAMPAIGN_STAGES.length,
    rank: rankFor(player.mmr),
    wins: player.wins,
    losses: player.losses,
    draws: player.draws,
    matches,
    winRate: matches > 0 ? Math.round((player.wins / matches) * 100) : 0,
    streak: player.streak,
    bestStreak: player.bestStreak,
    achievements: ACHIEVEMENTS.map((a) => ({
      key: a.key,
      name: a.name,
      description: a.description,
      icon: a.icon,
      unlocksCard: a.unlocksCard ?? null,
      unlocked: unlocked.has(a.key),
    })),
    collection,
  });
}
