import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { parseBody } from "@/lib/validate";
import { rulePatchSchema } from "@/lib/schemas";
import { rateLimit, DEFAULT_MUTATION } from "@/lib/ratelimit";
import { log } from "@/lib/audit";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const rl = rateLimit(req, { key: "rules:patch", ...DEFAULT_MUTATION });
  if (rl) return rl;
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const existing = await prisma.rule.findUnique({ where: { id: params.id } });
  if (!existing || existing.userId !== r.user.id) return bad("Not found", 404);
  const { data, error } = await parseBody(req, rulePatchSchema);
  if (error) return error;
  const rule = await prisma.rule.update({ where: { id: params.id }, data });
  await log(r.user.id, "rule.update", { entity: "rule", entityId: rule.id, req });
  return ok(rule);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const rl = rateLimit(req, { key: "rules:del", ...DEFAULT_MUTATION });
  if (rl) return rl;
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const existing = await prisma.rule.findUnique({ where: { id: params.id } });
  if (!existing || existing.userId !== r.user.id) return bad("Not found", 404);
  await prisma.rule.delete({ where: { id: params.id } });
  await log(r.user.id, "rule.delete", { entity: "rule", entityId: params.id, req });
  return ok({ success: true });
}
