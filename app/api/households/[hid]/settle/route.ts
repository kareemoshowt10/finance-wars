import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { parseBody } from "@/lib/validate";
import { assertMember } from "@/lib/household";
import { log } from "@/lib/audit";
import { notify } from "@/lib/notifications";

const schema = z.object({
  fromUserId: z.string().min(1),
  toUserId: z.string().min(1),
  amount: z.coerce.number().positive(),
  note: z.string().max(280).optional(),
  createTransactions: z.boolean().optional().default(false),
});

export async function POST(req: NextRequest, { params }: { params: { hid: string } }) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const fb = await assertMember(r.user.id, params.hid);
  if (fb) return fb;
  const { data, error } = await parseBody(req, schema);
  if (error) return error;

  if (data.fromUserId === data.toUserId) return bad("Cannot settle with self", 422);

  // Ensure both are members
  const members = await prisma.householdMember.findMany({
    where: { householdId: params.hid, accepted: true, userId: { in: [data.fromUserId, data.toUserId] } },
  });
  if (members.length !== 2) return bad("Both users must be household members", 422);

  // Optional paired transactions using default stake account
  let txExpenseId: string | null = null;
  let txIncomeId: string | null = null;
  if (data.createTransactions) {
    const [fromUser, toUser] = await Promise.all([
      prisma.user.findUnique({ where: { id: data.fromUserId } }),
      prisma.user.findUnique({ where: { id: data.toUserId } }),
    ]);
    const fromAcct = fromUser?.defaultStakeAccountId
      ? await prisma.account.findUnique({ where: { id: fromUser.defaultStakeAccountId } })
      : await prisma.account.findFirst({ where: { userId: data.fromUserId, type: "checking" } });
    const toAcct = toUser?.defaultStakeAccountId
      ? await prisma.account.findUnique({ where: { id: toUser.defaultStakeAccountId } })
      : await prisma.account.findFirst({ where: { userId: data.toUserId, type: "checking" } });

    if (fromAcct && fromAcct.userId === data.fromUserId) {
      const tx = await prisma.transaction.create({
        data: {
          userId: data.fromUserId,
          accountId: fromAcct.id,
          amount: data.amount,
          type: "expense",
          category: "Transfer",
          description: `Settle up${data.note ? `: ${data.note}` : ""}`,
          date: new Date(),
        },
      });
      txExpenseId = tx.id;
      await prisma.account.update({
        where: { id: fromAcct.id },
        data: { balance: fromAcct.type === "credit" ? fromAcct.balance + data.amount : fromAcct.balance - data.amount },
      });
    }
    if (toAcct && toAcct.userId === data.toUserId) {
      const tx = await prisma.transaction.create({
        data: {
          userId: data.toUserId,
          accountId: toAcct.id,
          amount: data.amount,
          type: "income",
          category: "Transfer",
          description: `Settle up${data.note ? `: ${data.note}` : ""}`,
          date: new Date(),
        },
      });
      txIncomeId = tx.id;
      await prisma.account.update({
        where: { id: toAcct.id },
        data: { balance: toAcct.balance + data.amount },
      });
    }
  }

  const settlement = await prisma.settlement.create({
    data: {
      householdId: params.hid,
      fromUserId: data.fromUserId,
      toUserId: data.toUserId,
      amount: data.amount,
      transactionId: txExpenseId,
      note: data.note,
    },
  });

  // Insert a balancing ledger entry: payer (from) is now owed back by payee (to)
  // This zeroes out the previous balance.
  await prisma.ledgerEntry.create({
    data: {
      householdId: params.hid,
      fromUserId: data.toUserId,
      toUserId: data.fromUserId,
      amount: data.amount,
      reason: `Settlement${data.note ? `: ${data.note}` : ""}`,
      settlementId: settlement.id,
    },
  });

  await notify(
    data.toUserId,
    "SETTLEMENT_RECEIVED",
    "You were paid",
    `$${data.amount.toFixed(2)} settled${data.note ? ` — ${data.note}` : ""}.`,
    "/dashboard/couples",
    `settle:${settlement.id}`
  );

  await log(r.user.id, "settle.create", {
    entity: "settlement",
    entityId: settlement.id,
    meta: { fromUserId: data.fromUserId, toUserId: data.toUserId, amount: data.amount, txExpenseId, txIncomeId },
    req,
  });

  return ok({ settlement, txExpenseId, txIncomeId });
}
