import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { parseBody } from "@/lib/validate";
import { holdingPatchSchema } from "@/lib/schemas";
import { rateLimit, DEFAULT_MUTATION } from "@/lib/ratelimit";
import { log } from "@/lib/audit";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const rl = rateLimit(req, { key: "holdings:patch", ...DEFAULT_MUTATION });
  if (rl) return rl;
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const existing = await prisma.holding.findUnique({ where: { id: params.id } });
  if (!existing || existing.userId !== r.user.id) return bad("Not found", 404);
  const { data, error } = await parseBody(req, holdingPatchSchema);
  if (error) return error;
  if (data.accountId) {
    const acct = await prisma.account.findUnique({ where: { id: data.accountId } });
    if (!acct || acct.userId !== r.user.id) return bad("Invalid account");
    if (acct.type !== "investment") return bad("Account must be an investment account");
  }
  const h = await prisma.holding.update({ where: { id: params.id }, data });
  await log(r.user.id, "holding.update", { entity: "holding", entityId: h.id, meta: data, req });
  return ok(h);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const rl = rateLimit(req, { key: "holdings:del", ...DEFAULT_MUTATION });
  if (rl) return rl;
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const existing = await prisma.holding.findUnique({ where: { id: params.id } });
  if (!existing || existing.userId !== r.user.id) return bad("Not found", 404);
  await prisma.holding.delete({ where: { id: params.id } });
  await log(r.user.id, "holding.delete", { entity: "holding", entityId: params.id, req });
  return ok({ success: true });
}
