import { prisma } from "@/lib/db";
import { fail, getSessionPlayer, ok } from "@/lib/session";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { ownedCardIds } from "@/lib/collection";
import { COLLECTIBLE_CARDS, computeSetCompletion, pendingSetRewards } from "@/game/cards";
import { CAMPAIGN_STAGES } from "@/game/campaign";
import { ZERO_SLIPS } from "@/game/packs";
import { applySeasonRollover, currentSeason, seasonLabel } from "@/lib/season";
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

  // seasonal ladder: lazy rollover — soft MMR reset + rank payout once per Issue
  const season = currentSeason();
  const rollover = applySeasonRollover(
    { seasonSeen: player.seasonSeen, mmr: player.mmr, coins: player.coins, matchesPlayed: matches },
    season,
  );
  let currentMmr = player.mmr;
  let coins = player.coins;
  if (rollover.applied) {
    currentMmr = rollover.mmr;
    coins += rollover.payout;
    await prisma.player.update({
      where: { id: player.id },
      data: { mmr: currentMmr, coins, seasonSeen: rollover.season },
    });
  }

  // set completion + one-time ink payouts (lazy grant, idempotent)
  const settings = (player.settings as Record<string, unknown> | null) ?? {};
  const claimed = new Set((settings.setRewards as string[] | null) ?? []);
  const setCompletion = computeSetCompletion(owned, claimed);
  const newlyClaimed = pendingSetRewards(setCompletion);
  if (newlyClaimed.length > 0) {
    for (const key of newlyClaimed) claimed.add(key);
    const payout = newlyClaimed.reduce((n, key) => n + (setCompletion.find((s) => s.key === key)?.rewardInk ?? 0), 0);
    coins += payout;
    await prisma.player.update({
      where: { id: player.id },
      data: { coins, settings: { ...settings, setRewards: [...claimed] } },
    });
  }

  return ok({
    id: player.id,
    name: `${player.name}${player.tag}`,
    mmr: currentMmr,
    coins,
    season: { current: season, label: seasonLabel(season), payout: rollover.payout, justReset: rollover.applied && rollover.payout > 0 },
    setCompletion,
    slips: { ...ZERO_SLIPS, ...((player.recycleSlips as Record<string, number> | null) ?? {}) },
    campaignStage: player.campaignStage,
    campaignTotal: CAMPAIGN_STAGES.length,
    rank: rankFor(currentMmr),
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
