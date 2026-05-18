import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { upsertTodaySnapshot } from "@/lib/snapshots";
import { parseBody } from "@/lib/validate";
import { accountPatchSchema } from "@/lib/schemas";
import { rateLimit, DEFAULT_MUTATION } from "@/lib/ratelimit";
import { log } from "@/lib/audit";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const rl = rateLimit(req, { key: "accounts:patch", ...DEFAULT_MUTATION });
  if (rl) return rl;
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const existing = await prisma.account.findUnique({ where: { id: params.id } });
  if (!existing || existing.userId !== r.user.id) return bad("Not found", 404);
  const { data, error } = await parseBody(req, accountPatchSchema);
  if (error) return error;
  const account = await prisma.account.update({ where: { id: params.id }, data });
  await upsertTodaySnapshot(r.user.id);
  await log(r.user.id, "account.update", { entity: "account", entityId: account.id, meta: data, req });
  return ok(account);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const rl = rateLimit(req, { key: "accounts:del", ...DEFAULT_MUTATION });
  if (rl) return rl;
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const existing = await prisma.account.findUnique({ where: { id: params.id } });
  if (!existing || existing.userId !== r.user.id) return bad("Not found", 404);
  await prisma.account.delete({ where: { id: params.id } });
  await upsertTodaySnapshot(r.user.id);
  await log(r.user.id, "account.delete", { entity: "account", entityId: params.id, req });
  return ok({ success: true });
}
