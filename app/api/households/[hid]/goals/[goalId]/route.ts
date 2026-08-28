import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { assertMember } from "@/lib/household";
import { goalProgressPct, isNeglected } from "@/lib/householdGoals";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { hid: string; goalId: string } }) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const fb = await assertMember(r.user.id, params.hid);
  if (fb) return fb;

  const goal = await prisma.householdGoal.findUnique({
    where: { id: params.goalId },
    include: {
      contributions: { orderBy: { createdAt: "desc" }, include: { user: { select: { id: true, name: true } } } },
      votes: { include: { user: { select: { id: true, name: true } } } },
    },
  });
  if (!goal || goal.householdId !== params.hid) return bad("Not found", 404);

  return ok({
    goal,
    progressPct: goalProgressPct(goal.targetAmount, goal.currentAmount),
    neglected: isNeglected(goal),
    myVote: goal.votes.some((v) => v.userId === r.user.id),
  });
}
