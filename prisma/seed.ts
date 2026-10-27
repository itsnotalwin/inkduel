/**
 * Idempotent seed: static Card table + Achievement table.
 * New players get their 3 default archetype decks + default collection at
 * account creation (see /api/auth/guest).
 *
 * Run with: npm run db:seed
 */
import "dotenv/config";
import { prisma } from "../src/lib/db";
import { CARDS } from "../src/game/cards";
import { ACHIEVEMENTS } from "../src/lib/achievements";

async function main() {
  for (const c of CARDS) {
    await prisma.card.upsert({
      where: { id: c.id },
      create: {
        id: c.id,
        name: c.name,
        type: c.type,
        cost: c.cost,
        atk: c.attack ?? null,
        hp: c.health ?? null,
        rarity: c.rarity,
      },
      update: {
        name: c.name,
        type: c.type,
        cost: c.cost,
        atk: c.attack ?? null,
        hp: c.health ?? null,
        rarity: c.rarity,
      },
    });
  }
  console.log(`cards seeded: ${CARDS.length}`);

  for (const a of ACHIEVEMENTS) {
    await prisma.achievement.upsert({
      where: { key: a.key },
      create: {
        key: a.key,
        name: a.name,
        description: a.description,
        icon: a.icon,
        unlocksCard: a.unlocksCard ?? null,
      },
      update: {
        name: a.name,
        description: a.description,
        icon: a.icon,
        unlocksCard: a.unlocksCard ?? null,
      },
    });
  }
  console.log(`achievements seeded: ${ACHIEVEMENTS.length}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
