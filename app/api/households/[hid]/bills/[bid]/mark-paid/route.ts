import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { parseBody } from "@/lib/validate";
import { assertMember, getHouseholdMembers } from "@/lib/household";
import { log } from "@/lib/audit";
import { computeShares, getIncomesForMembers, type SplitMode } from "@/lib/billsplit";
import { advanceBillDueDate } from "@/lib/bills";

const bodySchema = z.object({
  paidByUserId: z.string().min(1).optional(),
  dueDate: z.string().optional(),
  amount: z.coerce.number().positive().optional(),
  createTransaction: z.boolean().optional().default(false),
  accountId: z.string().optional(),
});

export async function POST(req: NextRequest, { params }: { params: { hid: string; bid: string } }) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const fb = await assertMember(r.user.id, params.hid);
  if (fb) return fb;
  const { data, error } = await parseBody(req, bodySchema);
  if (error) return error;

  const bill = await prisma.sharedBill.findUnique({ where: { id: params.bid } });
  if (!bill || bill.householdId !== params.hid) return bad("Not found", 404);

  const paidByUserId = data.paidByUserId || r.user.id;
  const amount = data.amount ?? bill.amount;
  const dueDate = data.dueDate ? new Date(data.dueDate) : bill.nextDueDate;
  if (isNaN(dueDate.getTime())) return bad("Invalid dueDate", 422);

  const members = await getHouseholdMembers(params.hid);
  const memberIds = members.filter((m) => m.accepted && m.userId).map((m) => m.userId!);
  const memberList = memberIds.map((userId) => ({ userId }));

  let incomes: Record<string, number> | undefined;
  if (bill.splitMode === "INCOME_RATIO") {
    incomes = await getIncomesForMembers(memberIds);
  }
  const shares = computeShares(
    bill.splitMode as SplitMode,
    (bill.splitConfig as Record<string, number>) || {},
    memberList,
    incomes
  );

  // Optional: create a Transaction for the payer
  let transactionId: string | null = null;
  if (data.createTransaction) {
    const accountId = data.accountId || bill.accountId;
    if (accountId) {
      const account = await prisma.account.findUnique({ where: { id: accountId } });
      if (account && account.userId === paidByUserId) {
        const tx = await prisma.transaction.create({
          data: {
            userId: paidByUserId,
            accountId,
            amount,
            type: "expense",
            category: bill.categoryName,
            description: bill.name,
            date: new Date(),
          },
        });
        transactionId = tx.id;
        // adjust account balance (mirror existing tx logic best-effort)
        await prisma.account.update({
          where: { id: account.id },
          data: { balance: account.type === "credit" ? account.balance + amount : account.balance - amount },
        });
      }
    }
  }

  // Upsert charge with PAID status
  const existing = await prisma.billCharge.findUnique({
    where: { sharedBillId_dueDate: { sharedBillId: bill.id, dueDate } },
  }).catch(() => null);

  const charge = existing
    ? await prisma.billCharge.update({
        where: { id: existing.id },
        data: {
          paidByUserId,
          amount,
          status: "PAID",
          paidAt: new Date(),
          transactionId,
        },
      })
    : await prisma.billCharge.create({
        data: {
          sharedBillId: bill.id,
          householdId: params.hid,
          paidByUserId,
          amount,
          dueDate,
          status: "PAID",
          paidAt: new Date(),
          transactionId,
        },
      });

  // Remove previously generated ledger entries from this charge (idempotent)
  await prisma.ledgerEntry.deleteMany({ where: { billChargeId: charge.id } });

  // Create ledger entries: each non-payer member owes the payer their share
  for (const s of shares) {
    if (s.userId === paidByUserId) continue;
    const owed = Math.round(amount * s.share * 100) / 100;
    if (owed <= 0) continue;
    await prisma.ledgerEntry.create({
      data: {
        householdId: params.hid,
        fromUserId: s.userId,
        toUserId: paidByUserId,
        amount: owed,
        reason: `${bill.name} (${dueDate.toISOString().slice(0, 10)})`,
        billChargeId: charge.id,
      },
    });
  }

  // Advance the bill's nextDueDate if it matched
  if (bill.nextDueDate.getTime() === dueDate.getTime()) {
    await advanceBillDueDate(bill.id);
  }

  await log(r.user.id, "bill.mark_paid", {
    entity: "bill",
    entityId: bill.id,
    meta: { chargeId: charge.id, amount, paidByUserId },
    req,
  });
  return ok({ charge, shares });
}
