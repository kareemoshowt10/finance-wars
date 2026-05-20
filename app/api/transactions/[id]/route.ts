import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { parseBody } from "@/lib/validate";
import { txPatchSchema } from "@/lib/schemas";
import { rateLimit, DEFAULT_MUTATION } from "@/lib/ratelimit";
import { log } from "@/lib/audit";
import { checkBudgetThresholds } from "@/lib/notifications";
import { reverseViceTaxForTransaction } from "@/lib/viceTax";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const rl = rateLimit(req, { key: "tx:patch", ...DEFAULT_MUTATION });
  if (rl) return rl;
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const existing = await prisma.transaction.findUnique({ where: { id: params.id } });
  if (!existing || existing.userId !== r.user.id) return bad("Not found", 404);
  const { data, error } = await parseBody(req, txPatchSchema);
  if (error) return error;

  const prevDelta = existing.type === "income" ? existing.amount : -existing.amount;
  await prisma.account.update({
    where: { id: existing.accountId },
    data: { balance: { increment: -prevDelta } },
  });

  const patch: Record<string, unknown> = { ...data };
  if (data.date) patch.date = new Date(data.date);
  if (data.amount !== undefined) patch.amount = Math.abs(data.amount);

  const updated = await prisma.transaction.update({ where: { id: params.id }, data: patch });
  const newDelta = updated.type === "income" ? updated.amount : -updated.amount;
  await prisma.account.update({
    where: { id: updated.accountId },
    data: { balance: { increment: newDelta } },
  });
  const { upsertTodaySnapshot } = await import("@/lib/snapshots");
  await upsertTodaySnapshot(r.user.id);
  if (updated.type === "expense") await checkBudgetThresholds(r.user.id, updated.category);
  await log(r.user.id, "transaction.update", { entity: "transaction", entityId: updated.id, meta: patch, req });
  return ok(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const rl = rateLimit(req, { key: "tx:del", ...DEFAULT_MUTATION });
  if (rl) return rl;
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const existing = await prisma.transaction.findUnique({ where: { id: params.id } });
  if (!existing || existing.userId !== r.user.id) return bad("Not found", 404);
  const delta = existing.type === "income" ? existing.amount : -existing.amount;
  await prisma.account.update({
    where: { id: existing.accountId },
    data: { balance: { increment: -delta } },
  });
  await reverseViceTaxForTransaction(r.user.id, params.id).catch(() => {});
  await prisma.transaction.delete({ where: { id: params.id } });
  const { upsertTodaySnapshot } = await import("@/lib/snapshots");
  await upsertTodaySnapshot(r.user.id);
  await log(r.user.id, "transaction.delete", { entity: "transaction", entityId: params.id, req });
  return ok({ success: true });
}
