import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { rateLimit, DEFAULT_MUTATION } from "@/lib/ratelimit";
import { log } from "@/lib/audit";
import { checkGoalMilestones } from "@/lib/notifications";

export async function DELETE(req: NextRequest, { params }: { params: { id: string; cid: string } }) {
  const rl = rateLimit(req, { key: "goal:contrib:del", ...DEFAULT_MUTATION });
  if (rl) return rl;
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const item = await prisma.goalContribution.findUnique({ where: { id: params.cid } });
  if (!item || item.userId !== r.user.id || item.goalId !== params.id) return bad("Not found", 404);
  const goal = await prisma.goal.findUnique({ where: { id: params.id } });
  if (!goal) return bad("Not found", 404);
  const prev = goal.currentAmount;
  await prisma.goalContribution.delete({ where: { id: params.cid } });
  const all = await prisma.goalContribution.findMany({ where: { userId: r.user.id, goalId: params.id } });
  const total = all.reduce((s, c) => s + c.amount, 0);
  await prisma.goal.update({ where: { id: params.id }, data: { currentAmount: total } });
  await checkGoalMilestones(r.user.id, params.id, prev, total, goal.targetAmount, goal.name);
  await log(r.user.id, "goal.contrib.delete", { entity: "goalContribution", entityId: params.cid, req });
  return ok({ success: true });
}
