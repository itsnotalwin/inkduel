import { z } from "zod";
import { prisma } from "@/lib/db";
import { fail, getSessionPlayer, ok, startSession } from "@/lib/session";
import { ARCHETYPE_DECKS } from "@/game/cards";

const bodySchema = z.object({
  name: z.string().trim().min(2).max(24).optional(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body ?? {});
  if (!parsed.success) return fail("Name must be 2–24 characters.");

  const existing = await getSessionPlayer();
  if (existing) {
    await prisma.player.update({ where: { id: existing.id }, data: { lastSeenAt: new Date() } });
    return ok({ id: existing.id, name: `${existing.name}${existing.tag}`, mmr: existing.mmr });
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
  return ok({ id: player.id, name: `${player.name}${player.tag}`, mmr: player.mmr });
}
