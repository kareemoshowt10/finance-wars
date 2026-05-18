import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { parseBody } from "@/lib/validate";
import { goalPatchSchema } from "@/lib/schemas";
import { rateLimit, DEFAULT_MUTATION } from "@/lib/ratelimit";
import { log } from "@/lib/audit";
import { checkGoalMilestones } from "@/lib/notifications";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const rl = rateLimit(req, { key: "goals:patch", ...DEFAULT_MUTATION });
  if (rl) return rl;
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const existing = await prisma.goal.findUnique({ where: { id: params.id } });
  if (!existing || existing.userId !== r.user.id) return bad("Not found", 404);
  const { data, error } = await parseBody(req, goalPatchSchema);
  if (error) return error;
  const patch: Record<string, unknown> = { ...data };
  if (data.deadline) patch.deadline = new Date(data.deadline);
  const goal = await prisma.goal.update({ where: { id: params.id }, data: patch });
  await checkGoalMilestones(
    r.user.id, goal.id, existing.currentAmount, goal.currentAmount, goal.targetAmount, goal.name
  );
  await log(r.user.id, "goal.update", { entity: "goal", entityId: goal.id, meta: patch, req });
  return ok(goal);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const rl = rateLimit(req, { key: "goals:del", ...DEFAULT_MUTATION });
  if (rl) return rl;
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const existing = await prisma.goal.findUnique({ where: { id: params.id } });
  if (!existing || existing.userId !== r.user.id) return bad("Not found", 404);
  await prisma.goal.delete({ where: { id: params.id } });
  await log(r.user.id, "goal.delete", { entity: "goal", entityId: params.id, req });
  return ok({ success: true });
}
