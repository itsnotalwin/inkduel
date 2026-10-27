import { prisma } from "@/lib/db";
import { fail, getSessionPlayer, ok } from "@/lib/session";
import { questForDate, todayKey } from "@/lib/quests";

export async function GET() {
  const player = await getSessionPlayer();
  if (!player) return fail("Not signed in", 401);
  const dateKey = todayKey();
  const template = questForDate(dateKey, player.id);
  const quest = await prisma.dailyQuest.upsert({
    where: { playerId_date: { playerId: player.id, date: dateKey } },
    create: { playerId: player.id, date: dateKey, templateKey: template.key, target: template.target, progress: 0 },
    update: {},
  });
  return ok({
    key: quest.templateKey,
    description: template.description(quest.target),
    target: quest.target,
    progress: quest.progress,
    completed: quest.completed,
    date: dateKey,
  });
}

