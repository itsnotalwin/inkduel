import { z } from "zod";
import { prisma } from "@/lib/db";
import { fail, getSessionPlayer, ok, startSession } from "@/lib/session";
import { ARCHETYPE_DECKS } from "@/game/cards";

const LOGIN_BONUS = 100;
const STARTING_COINS = 150;

const bodySchema = z.object({
  name: z.string().trim().min(2).max(24).optional(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body ?? {});
  if (!parsed.success) return fail("Name must be 2–24 characters.");

  const existing = await getSessionPlayer();
  if (existing) {
    // daily login bonus — once per calendar day
    const today = new Date().toISOString().slice(0, 10);
    if (existing.lastLoginDate !== today) {
      const updated = await prisma.player.update({
        where: { id: existing.id },
        data: { lastLoginDate: today, coins: { increment: LOGIN_BONUS } },
      });
      return ok({
        id: updated.id,
        name: `${updated.name}${updated.tag}`,
        mmr: updated.mmr,
        coins: updated.coins,
        dailyBonus: LOGIN_BONUS,
      });
    }
    await prisma.player.update({ where: { id: existing.id }, data: { lastSeenAt: new Date() } });
    return ok({
      id: existing.id,
      name: `${existing.name}${existing.tag}`,
      mmr: existing.mmr,
      coins: existing.coins,
      dailyBonus: 0,
    });
  }

  const baseName = parsed.data.name ?? `Scribe-${Math.floor(1000 + Math.random() * 9000)}`;
  const name = baseName;
  let tag = "#0001";
  // name collisions append a tag
  for (let i = 1; i < 9999; i++) {
    const clash = await prisma.player.findUnique({ where: { name_tag: { name, tag } } });
    if (!clash) break;
    tag = `#${String(i + 1).padStart(4, "0")}`;
    if (tag === "#9999") return fail("Name is too popular — pick another.", 409);
  }

  const player = await prisma.player.create({
    data: {
      name,
      tag,
      coins: STARTING_COINS,
      settings: {},
      decks: {
        create: Object.values(ARCHETYPE_DECKS).map((archetype, i) => ({
          name: archetype.name,
          cards: archetype.cards.map(([cardId, count]) => ({ cardId, count })),
          isActive: i === 0,
        })),
      },
    },
  });
  await startSession(player.id);
  return ok({ id: player.id, name: `${player.name}${player.tag}`, mmr: player.mmr, coins: player.coins, dailyBonus: 0 });
}
