import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { parseBody } from "@/lib/validate";
import { goalSchema } from "@/lib/schemas";
import { rateLimit, DEFAULT_MUTATION } from "@/lib/ratelimit";
import { log } from "@/lib/audit";
import { checkGoalMilestones } from "@/lib/notifications";

export async function GET(req: NextRequest) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const goals = await prisma.goal.findMany({
    where: { userId: r.user.id },
    orderBy: { deadline: "asc" },
  });
  return ok(goals);
}

export async function POST(req: NextRequest) {
  const rl = rateLimit(req, { key: "goals", ...DEFAULT_MUTATION });
  if (rl) return rl;
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const { data, error } = await parseBody(req, goalSchema);
  if (error) return error;
  const goal = await prisma.goal.create({
    data: {
      userId: r.user.id,
      name: data.name,
      targetAmount: data.targetAmount,
      currentAmount: data.currentAmount ?? 0,
      deadline: new Date(data.deadline),
    },
  });
  await checkGoalMilestones(r.user.id, goal.id, 0, goal.currentAmount, goal.targetAmount, goal.name);
  await log(r.user.id, "goal.create", { entity: "goal", entityId: goal.id, meta: { name: goal.name }, req });
  const { evaluate: evalAch } = await import("@/lib/achievements/engine");
  evalAch(r.user.id, { type: "goal-created" }).catch(() => {});
  return ok(goal);
}
