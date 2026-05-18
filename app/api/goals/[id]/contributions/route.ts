import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { parseBody } from "@/lib/validate";
import { goalContributionSchema } from "@/lib/schemas";
import { rateLimit, DEFAULT_MUTATION } from "@/lib/ratelimit";
import { log } from "@/lib/audit";
import { checkGoalMilestones } from "@/lib/notifications";

async function recompute(userId: string, goalId: string, goalName: string, target: number, prevAmount: number) {
  const all = await prisma.goalContribution.findMany({ where: { userId, goalId } });
  const total = all.reduce((s, c) => s + c.amount, 0);
  const goal = await prisma.goal.update({ where: { id: goalId }, data: { currentAmount: total } });
  await checkGoalMilestones(userId, goalId, prevAmount, total, target, goalName);
  return goal;
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const goal = await prisma.goal.findUnique({ where: { id: params.id } });
  if (!goal || goal.userId !== r.user.id) return bad("Not found", 404);
  const items = await prisma.goalContribution.findMany({
    where: { userId: r.user.id, goalId: params.id },
    orderBy: { date: "desc" },
  });
  return ok(items);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const rl = rateLimit(req, { key: "goal:contrib", ...DEFAULT_MUTATION });
  if (rl) return rl;
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const goal = await prisma.goal.findUnique({ where: { id: params.id } });
  if (!goal || goal.userId !== r.user.id) return bad("Not found", 404);
  const { data, error } = await parseBody(req, goalContributionSchema);
  if (error) return error;
  const item = await prisma.goalContribution.create({
    data: {
      userId: r.user.id,
      goalId: params.id,
      amount: data.amount,
      date: new Date(data.date),
      transactionId: data.transactionId ?? null,
      note: data.note ?? null,
    },
  });
  await recompute(r.user.id, params.id, goal.name, goal.targetAmount, goal.currentAmount);
  await log(r.user.id, "goal.contrib.create", { entity: "goalContribution", entityId: item.id, req });
  return ok(item);
}
