import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { parseBody } from "@/lib/validate";
import { recurringPatchSchema } from "@/lib/schemas";
import { rateLimit, DEFAULT_MUTATION } from "@/lib/ratelimit";
import { log } from "@/lib/audit";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const rl = rateLimit(req, { key: "recur:patch", ...DEFAULT_MUTATION });
  if (rl) return rl;
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const existing = await prisma.recurringTransaction.findUnique({ where: { id: params.id } });
  if (!existing || existing.userId !== r.user.id) return bad("Not found", 404);
  const { data, error } = await parseBody(req, recurringPatchSchema);
  if (error) return error;
  const patch: Record<string, unknown> = { ...data };
  if (data.nextRunDate) patch.nextRunDate = new Date(data.nextRunDate);
  if (data.amount !== undefined) patch.amount = Math.abs(data.amount);
  const updated = await prisma.recurringTransaction.update({ where: { id: params.id }, data: patch });
  await log(r.user.id, "recurring.update", { entity: "recurring", entityId: updated.id, meta: patch, req });
  return ok(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const rl = rateLimit(req, { key: "recur:del", ...DEFAULT_MUTATION });
  if (rl) return rl;
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const existing = await prisma.recurringTransaction.findUnique({ where: { id: params.id } });
  if (!existing || existing.userId !== r.user.id) return bad("Not found", 404);
  await prisma.recurringTransaction.delete({ where: { id: params.id } });
  await log(r.user.id, "recurring.delete", { entity: "recurring", entityId: params.id, req });
  return ok({ success: true });
}
