import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { assertMember } from "@/lib/household";
import { PLANS, planById, NEXT_PLAN } from "@/lib/plans";
import { isConfigured } from "@/lib/billing";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { hid: string } }) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const fb = await assertMember(r.user.id, params.hid);
  if (fb) return fb;

  const household = await prisma.household.findUnique({ where: { id: params.hid } });
  if (!household) return bad("Not found", 404);

  const me = await prisma.householdMember.findFirst({ where: { householdId: params.hid, userId: r.user.id, accepted: true } });

  const [memberCount, activeChores, activeLoans, activeGoals] = await Promise.all([
    prisma.householdMember.count({ where: { householdId: params.hid, accepted: true } }),
    prisma.chore.count({ where: { householdId: params.hid, active: true } }),
    prisma.loan.count({ where: { householdId: params.hid, status: "ACTIVE" } }),
    prisma.householdGoal.count({ where: { householdId: params.hid, status: "ACTIVE" } }),
  ]);

  const plan = planById(household.plan);

  return ok({
    planId: plan.id,
    plan,
    plans: PLANS,
    nextPlan: NEXT_PLAN[plan.id],
    isOwner: me?.role === "OWNER",
    billingConfigured: isConfigured(),
    planRenewsAt: household.planRenewsAt,
    usage: { members: memberCount, activeChores, activeLoans, activeGoals },
    limits: { members: plan.memberLimit, chores: plan.choreLimit, loans: plan.activeLoanLimit, goals: plan.activeGoalLimit },
  });
}
