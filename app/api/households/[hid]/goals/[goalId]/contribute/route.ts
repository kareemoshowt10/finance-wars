import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { assertMember, getHouseholdMembers } from "@/lib/household";
import { getBalance, award } from "@/lib/wallet";
import { isNeglected, CROWN_VALUE_USD } from "@/lib/householdGoals";
import { maybeAwardDailyBonus } from "@/lib/dailyEngagement";
import { evaluate } from "@/lib/achievements/engine";
import { log } from "@/lib/audit";

export const dynamic = "force-dynamic";

const contributeSchema = z.object({
  source: z.enum(["CASH", "CROWNS"]).default("CASH"),
  amount: z.coerce.number().positive().optional(),
  crowns: z.coerce.number().int().positive().optional(),
  note: z.string().max(200).optional(),
});

export async function POST(req: NextRequest, { params }: { params: { hid: string; goalId: string } }) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const fb = await assertMember(r.user.id, params.hid);
  if (fb) return fb;

  const goal = await prisma.householdGoal.findUnique({ where: { id: params.goalId } });
  if (!goal || goal.householdId !== params.hid) return bad("Not found", 404);
  if (goal.status !== "ACTIVE") return bad("This goal is no longer accepting contributions");

  const parsed = contributeSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return bad("Invalid input", 400);

  let amount: number;
  if (parsed.data.source === "CROWNS") {
    const crowns = parsed.data.crowns;
    if (!crowns) return bad("crowns is required when source is CROWNS");
    const balance = await getBalance(r.user.id, "CROWNS");
    if (balance < crowns) return bad(`Not enough Crowns (have ${balance}, need ${crowns})`);
    amount = Math.round(crowns * CROWN_VALUE_USD * 100) / 100;
    await award({
      userId: r.user.id,
      currency: "CROWNS",
      delta: -crowns,
      reason: "GOAL_CONTRIBUTION",
      refType: "HouseholdGoal",
      refId: goal.id,
      householdId: params.hid,
      meta: { goalName: goal.name, usdValue: amount },
    });
  } else {
    if (!parsed.data.amount) return bad("amount is required when source is CASH");
    amount = parsed.data.amount;
  }

  const wasNeglected = isNeglected(goal);
  const now = new Date();

  // Atomic increment, not read-modify-write.
  //
  // Two people funding the same goal in the same moment — which is the normal
  // case, not the exotic one — both read the same currentAmount, both computed
  // a total from it, and the second write silently discarded the first
  // person's money. `increment` makes the addition happen inside the database,
  // so every contribution lands.
  const [contribution, updated] = await prisma.$transaction([
    prisma.householdGoalContribution.create({
      data: { goalId: goal.id, userId: r.user.id, amount, source: parsed.data.source, note: parsed.data.note },
    }),
    prisma.householdGoal.update({
      where: { id: goal.id },
      data: {
        currentAmount: { increment: amount },
        lastContributionAt: now,
      },
    }),
  ]);

  // Round the running total back to cents after the atomic add, so float
  // addition can't drift over hundreds of contributions.
  const newTotal = Math.round(updated.currentAmount * 100) / 100;

  // Flip to FUNDED under a status guard, so that when the contribution that
  // crosses the target races another, exactly one of them owns the transition
  // and the "fully funded" notifications go out once.
  let justFunded = false;
  if (newTotal >= updated.targetAmount) {
    const flip = await prisma.householdGoal.updateMany({
      where: { id: goal.id, status: "ACTIVE" },
      data: { status: "FUNDED", currentAmount: newTotal },
    });
    justFunded = flip.count === 1;
  } else if (newTotal !== updated.currentAmount) {
    await prisma.householdGoal.update({ where: { id: goal.id }, data: { currentAmount: newTotal } });
  }

  await log(r.user.id, "contribute", { entity: "HouseholdGoal", entityId: goal.id, meta: { amount }, req });

  if (justFunded) {
    await evaluate(r.user.id, { type: "household-goal-funded" });
    const members = await getHouseholdMembers(params.hid);
    await Promise.all(
      members
        .filter((m) => m.userId)
        .map((m) =>
          prisma.notification.create({
            data: {
              userId: m.userId as string,
              kind: "GOAL",
              title: `${goal.emoji} "${goal.name}" is fully funded!`,
              body: `The household hit $${newTotal.toFixed(2)} together.`,
              link: "/dashboard/household/goals",
            },
          }).catch(() => null)
        )
    );
  } else if (wasNeglected) {
    await evaluate(r.user.id, { type: "essential-fund-rescued" });
  }

  const bonusAwarded = await maybeAwardDailyBonus(params.hid, r.user.id);

  return ok({ contribution, currentAmount: newTotal, justFunded, bonusAwarded });
}
