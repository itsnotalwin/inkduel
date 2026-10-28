import { z } from "zod";
import { prisma } from "@/lib/db";
import { fail, getSessionPlayer, ok } from "@/lib/session";
import { CAMPAIGN_STAGES } from "@/game/campaign";

/** Campaign progress + stage definitions. */
export async function GET() {
  const player = await getSessionPlayer();
  if (!player) return fail("Not signed in", 401);
  return ok({
    progress: player.campaignStage,
    stages: CAMPAIGN_STAGES.map((s) => ({
      index: s.index,
      name: s.name,
      blurb: s.blurb,
      rewardCoins: s.rewardCoins,
      rewardCard: s.rewardCard ?? null,
      cleared: s.index < player.campaignStage,
      unlocked: s.index <= player.campaignStage,
    })),
  });
}

/**
 * Report a campaign result. The stage must be the player's current frontier
 * stage to grant the first-clear reward; replaying cleared stages pays a
 * small token amount.
 */
const bodySchema = z.object({
  stage: z.number().int().min(0).max(CAMPAIGN_STAGES.length - 1),
  result: z.enum(["WIN", "LOSS", "DRAW"]),
  turns: z.number().int().min(0).max(500).optional(),
});

const REPLAY_REWARD = 10;

export async function POST(request: Request) {
  const player = await getSessionPlayer();
  if (!player) return fail("Not signed in", 401);
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return fail("Invalid campaign payload.");
  const { stage, result } = parsed.data;

  if (result !== "WIN") {
    return ok({ cleared: false, coinsAwarded: 0, coinsAfter: player.coins, progress: player.campaignStage, rewardCard: null });
  }

  const stageDef = CAMPAIGN_STAGES[stage];
  if (stage < player.campaignStage) {
    // replay of a cleared stage
    const updated = await prisma.player.update({
      where: { id: player.id },
      data: { coins: { increment: REPLAY_REWARD } },
    });
    return ok({ cleared: false, replay: true, coinsAwarded: REPLAY_REWARD, coinsAfter: updated.coins, progress: player.campaignStage, rewardCard: null });
  }
  if (stage !== player.campaignStage) {
    return fail("The previous stage stands between you and this one.", 409);
  }

  // first clear
  const updated = await prisma.player.update({
    where: { id: player.id },
    data: {
      campaignStage: stage + 1,
      coins: { increment: stageDef.rewardCoins },
      ...(stageDef.rewardCard
        ? { extraCards: [...(((player.extraCards as string[] | null) ?? [])), stageDef.rewardCard] }
        : {}),
    },
  });
  return ok({
    cleared: true,
    coinsAwarded: stageDef.rewardCoins,
    coinsAfter: updated.coins,
    progress: updated.campaignStage,
    rewardCard: stageDef.rewardCard ?? null,
  });
}
