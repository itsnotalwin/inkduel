import { prisma } from "@/lib/db";
import { fail, getSessionPlayer, ok } from "@/lib/session";
import { ACHIEVEMENTS } from "@/lib/achievements";

export async function GET() {
  const player = await getSessionPlayer();
  if (!player) return fail("Not signed in", 401);
  const held = await prisma.playerAchievement.findMany({ where: { playerId: player.id } });
  const unlocked = new Set(held.map((h) => h.achievementKey));
  return ok({
    achievements: ACHIEVEMENTS.map((a) => ({
      key: a.key,
      name: a.name,
      description: a.description,
      icon: a.icon,
      unlocksCard: a.unlocksCard ?? null,
      unlocked: unlocked.has(a.key),
      unlockedAt: held.find((h) => h.achievementKey === a.key)?.unlockedAt ?? null,
    })),
  });
}

