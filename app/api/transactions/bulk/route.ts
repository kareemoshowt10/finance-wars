import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { parseBody } from "@/lib/validate";
import { txBulkSchema } from "@/lib/schemas";
import { rateLimit, DEFAULT_MUTATION } from "@/lib/ratelimit";
import { log } from "@/lib/audit";
import { reverseViceTaxForTransaction, applyViceTaxOnTransaction } from "@/lib/viceTax";

export async function POST(req: NextRequest) {
  const rl = rateLimit(req, { key: "tx:bulk", ...DEFAULT_MUTATION });
  if (rl) return rl;
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const { data, error } = await parseBody(req, txBulkSchema);
  if (error) return error;

  // ensure ownership
  const txs = await prisma.transaction.findMany({
    where: { id: { in: data.ids }, userId: r.user.id },
  });
  const ids = txs.map((t) => t.id);
  if (ids.length === 0) return ok({ count: 0 });

  let count = 0;
  if (data.action === "delete") {
    // reverse balances
    const byAcct: Record<string, number> = {};
    for (const t of txs) {
      const delta = t.type === "income" ? t.amount : -t.amount;
      byAcct[t.accountId] = (byAcct[t.accountId] || 0) + delta;
    }
    await prisma.$transaction([
      prisma.transaction.deleteMany({ where: { id: { in: ids } } }),
      ...Object.entries(byAcct).map(([accountId, delta]) =>
        prisma.account.update({
          where: { id: accountId },
          data: { balance: { increment: -delta } },
        })
      ),
    ]);
    for (const t of txs) {
      await reverseViceTaxForTransaction(r.user.id, t.id).catch(() => {});
    }
    count = ids.length;
  } else if (data.action === "recategorize") {
    if (!data.category) return bad("category required");
    const res = await prisma.transaction.updateMany({
      where: { id: { in: ids } },
      data: { category: data.category },
    });
    // Reverse old vice tax, re-apply at new category for each tx.
    for (const t of txs) {
      await reverseViceTaxForTransaction(r.user.id, t.id).catch(() => {});
      if (t.type === "expense") {
        await applyViceTaxOnTransaction(r.user.id, {
          id: t.id,
          amount: t.amount,
          category: data.category,
          type: t.type,
          date: t.date,
        }).catch(() => {});
      }
    }
    count = res.count;
  } else if (data.action === "move") {
    if (!data.accountId) return bad("accountId required");
    const target = await prisma.account.findUnique({ where: { id: data.accountId } });
    if (!target || target.userId !== r.user.id) return bad("Invalid account");

    // reverse on old accounts, apply on new
    const byOld: Record<string, number> = {};
    let newSum = 0;
    for (const t of txs) {
      const delta = t.type === "income" ? t.amount : -t.amount;
      byOld[t.accountId] = (byOld[t.accountId] || 0) + delta;
      newSum += delta;
    }
    await prisma.$transaction([
      prisma.transaction.updateMany({
        where: { id: { in: ids } },
        data: { accountId: data.accountId },
      }),
      ...Object.entries(byOld).map(([accountId, delta]) =>
        prisma.account.update({ where: { id: accountId }, data: { balance: { increment: -delta } } })
      ),
      prisma.account.update({ where: { id: data.accountId }, data: { balance: { increment: newSum } } }),
    ]);
    count = ids.length;
  }
  const { upsertTodaySnapshot } = await import("@/lib/snapshots");
  await upsertTodaySnapshot(r.user.id);
  await log(r.user.id, `transaction.bulk.${data.action}`, {
    entity: "transaction",
    meta: { count, ids: ids.slice(0, 20) },
    req,
  });
  return ok({ count });
}
