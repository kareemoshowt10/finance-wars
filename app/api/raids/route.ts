import { NextRequest } from "next/server";
import { z } from "zod";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { log } from "@/lib/audit";
import { rateLimit, DEFAULT_MUTATION } from "@/lib/ratelimit";
import { getActiveHousehold } from "@/lib/household";
import { processRaidsForUser } from "@/lib/goalRaidLifecycle";
import {
  RAID_THEMES, isRaidEligible, pickTheme, buildBoss, syncRaid,
  daysRemaining, raidPace, stageFor, type RaidTheme,
} from "@/lib/goalRaid";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  goalId: z.string().min(1),
  theme: z.enum(RAID_THEMES).optional(),
  shareWithHousehold: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);

  // Detect victories / expirations on visit so state is fresh even without cron.
  await processRaidsForUser(r.user.id).catch(() => {});

  const raids = await prisma.goalRaid.findMany({
    where: { userId: r.user.id },
    include: { goal: true },
    orderBy: { createdAt: "desc" },
  });

  const enriched = await Promise.all(
    raids.map(async (raid) => {
      const synced = await syncRaid(raid.id);
      const current = raid.goal.currentAmount;
      const pct = raid.targetAmount > raid.startAmount
        ? Math.max(0, Math.min(100, Math.round(((current - raid.startAmount) / (raid.targetAmount - raid.startAmount)) * 100)))
        : 0;
      const theme = raid.theme as RaidTheme;
      return {
        id: raid.id,
        goalId: raid.goalId,
        goalName: raid.goal.name,
        bossName: raid.bossName,
        bossTitle: raid.bossTitle,
        theme,
        lore: raid.lore,
        status: synced?.status ?? raid.status,
        targetAmount: raid.targetAmount,
        startAmount: raid.startAmount,
        currentAmount: current,
        pct,
        hpPct: 100 - pct,
        deadline: raid.deadline.toISOString(),
        daysRemaining: daysRemaining(raid.deadline),
        pace: raidPace(raid.targetAmount, current, raid.deadline),
        stage: stageFor(theme, pct),
        sharedWithHousehold: !!raid.householdId,
      };
    })
  );

  return ok({ raids: enriched });
}

export async function POST(req: NextRequest) {
  const rl = rateLimit(req, { key: "raids", ...DEFAULT_MUTATION });
  if (rl) return rl;
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const parsed = createSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return bad("Invalid input", 400);

  const goal = await prisma.goal.findUnique({ where: { id: parsed.data.goalId } });
  if (!goal || goal.userId !== r.user.id) return bad("Invalid goal", 400);

  const existing = await prisma.goalRaid.findUnique({ where: { goalId: goal.id } });
  if (existing) return bad("This goal is already a raid", 409);

  if (!isRaidEligible(goal.deadline, goal.targetAmount)) {
    return bad("Raids need a deadline within 180 days and a target of at least $500", 400);
  }

  const theme: RaidTheme = parsed.data.theme ?? pickTheme(goal.name);
  const boss = buildBoss(goal.name, theme, goal.targetAmount, goal.deadline);

  let householdId: string | null = null;
  if (parsed.data.shareWithHousehold) {
    const hh = await getActiveHousehold(r.user.id);
    householdId = hh?.id ?? null;
  }

  const raid = await prisma.goalRaid.create({
    data: {
      userId: r.user.id,
      householdId,
      goalId: goal.id,
      bossName: boss.bossName,
      bossTitle: boss.bossTitle,
      theme,
      lore: boss.lore,
      deadline: goal.deadline,
      targetAmount: goal.targetAmount,
      startAmount: goal.currentAmount,
    },
  });

  await log(r.user.id, "raid.create", { entity: "GoalRaid", entityId: raid.id, req });
  return ok({ raid });
}
