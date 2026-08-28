import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { assertMember } from "@/lib/household";
import { log } from "@/lib/audit";

export const dynamic = "force-dynamic";

/** Toggle the current user's vote for a competing elective goal (e.g. PS5 vs. the pool). */
export async function POST(req: NextRequest, { params }: { params: { hid: string; goalId: string } }) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const fb = await assertMember(r.user.id, params.hid);
  if (fb) return fb;

  const goal = await prisma.householdGoal.findUnique({ where: { id: params.goalId } });
  if (!goal || goal.householdId !== params.hid) return bad("Not found", 404);

  const existing = await prisma.householdGoalVote.findUnique({
    where: { goalId_userId: { goalId: goal.id, userId: r.user.id } },
  });

  if (existing) {
    await prisma.householdGoalVote.delete({ where: { id: existing.id } });
    await log(r.user.id, "unvote", { entity: "HouseholdGoal", entityId: goal.id, req });
    return ok({ voted: false });
  }

  await prisma.householdGoalVote.create({ data: { goalId: goal.id, userId: r.user.id } });
  await log(r.user.id, "vote", { entity: "HouseholdGoal", entityId: goal.id, req });
  return ok({ voted: true });
}
