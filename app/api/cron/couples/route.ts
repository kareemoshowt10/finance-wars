import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCron } from "@/lib/cron";
import { notify } from "@/lib/notifications";
import { computeShares, getIncomesForMembers, balanceOf, type SplitMode } from "@/lib/billsplit";
import { nextDueAfter } from "@/lib/bills";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const fail = verifyCron(req);
  if (fail) return fail;

  const now = new Date();
  let expired = 0, reminders = 0, missed = 0, autoApproved = 0;
  let billCharges = 0, billMissed = 0, billDueSoon = 0, settleSuggested = 0;

  const expiredReviews = await prisma.purchaseReview.findMany({
    where: { status: "PENDING", expiresAt: { lt: now } },
    include: { household: { include: { pact: true } } },
  });
  for (const rev of expiredReviews) {
    const requireDual = rev.household.pact?.requireDualSignOff ?? true;
    const newStatus = requireDual ? "EXPIRED" : "APPROVED";
    await prisma.purchaseReview.update({
      where: { id: rev.id },
      data: { status: newStatus, decidedAt: now },
    });
    if (newStatus === "APPROVED") {
      await prisma.transaction.update({ where: { id: rev.transactionId }, data: { pending: false } }).catch(() => {});
      autoApproved++;
    } else {
      expired++;
    }
    await notify(
      rev.requesterUserId,
      newStatus === "APPROVED" ? "BIG_PURCHASE_APPROVED" : "BIG_PURCHASE_EXPIRED",
      newStatus === "APPROVED" ? "Auto-approved" : "Review expired",
      `$${rev.amount.toFixed(0)} ${newStatus === "APPROVED" ? "auto-approved" : "review expired"}.`,
      "/dashboard/couples",
      `review:${newStatus}:${rev.id}`
    );
  }

  const in24 = new Date(now.getTime() + 24 * 3600 * 1000);
  const upcoming = await prisma.moneyDate.findMany({
    where: { status: "UPCOMING", scheduledAt: { gte: now, lte: in24 } },
    include: { household: { include: { members: true } } },
  });
  for (const md of upcoming) {
    for (const m of md.household.members) {
      if (m.userId && m.accepted) {
        const ok = await notify(
          m.userId,
          "MONEY_DATE_REMINDER",
          "Money date tomorrow",
          `${md.scheduledAt.toUTCString()} — ${md.durationMin} min.`,
          `/dashboard/couples/money-dates/${md.id}`,
          `md:remind:${md.id}:${m.userId}`
        );
        if (ok) reminders++;
      }
    }
  }

  const past = await prisma.moneyDate.findMany({
    where: { status: { in: ["UPCOMING", "RESCHEDULED"] }, scheduledAt: { lt: new Date(now.getTime() - 24 * 3600 * 1000) } },
  });
  for (const md of past) {
    await prisma.moneyDate.update({ where: { id: md.id }, data: { status: "MISSED" } });
    missed++;
  }

  // Shared Bills: auto-generate UPCOMING charges + ledger entries when nextDueDate hits.
  const dueBills = await prisma.sharedBill.findMany({
    where: { active: true, nextDueDate: { lte: now } },
    include: { household: { include: { members: true } } },
  });
  for (const bill of dueBills) {
    const memberIds = bill.household.members.filter((m) => m.accepted && m.userId).map((m) => m.userId!);
    if (memberIds.length < 2) continue;
    let payer: string | null = null;
    if (bill.accountId) {
      const acct = await prisma.account.findUnique({ where: { id: bill.accountId } });
      if (acct) payer = acct.userId;
    }
    if (!payer) payer = memberIds[0];

    const existing = await prisma.billCharge.findUnique({
      where: { sharedBillId_dueDate: { sharedBillId: bill.id, dueDate: bill.nextDueDate } },
    }).catch(() => null);
    if (!existing) {
      const charge = await prisma.billCharge.create({
        data: {
          sharedBillId: bill.id,
          householdId: bill.householdId,
          paidByUserId: payer,
          amount: bill.amount,
          dueDate: bill.nextDueDate,
          status: "UPCOMING",
        },
      });
      let incomes: Record<string, number> | undefined;
      if (bill.splitMode === "INCOME_RATIO") incomes = await getIncomesForMembers(memberIds);
      const shares = computeShares(
        bill.splitMode as SplitMode,
        (bill.splitConfig as Record<string, number>) || {},
        memberIds.map((userId) => ({ userId })),
        incomes
      );
      for (const s of shares) {
        if (s.userId === payer) continue;
        const owed = Math.round(bill.amount * s.share * 100) / 100;
        if (owed <= 0) continue;
        await prisma.ledgerEntry.create({
          data: {
            householdId: bill.householdId,
            fromUserId: s.userId,
            toUserId: payer,
            amount: owed,
            reason: `${bill.name} (auto, ${bill.nextDueDate.toISOString().slice(0, 10)})`,
            billChargeId: charge.id,
          },
        });
      }
      billCharges++;
    }
    const next = nextDueAfter(bill.nextDueDate, bill.frequency);
    if (next) {
      await prisma.sharedBill.update({ where: { id: bill.id }, data: { nextDueDate: next } });
    } else {
      await prisma.sharedBill.update({ where: { id: bill.id }, data: { active: false } });
    }
  }

  // BILL_DUE_SOON
  const threeDays = new Date(now.getTime() + 3 * 86400000);
  const soonCharges = await prisma.billCharge.findMany({
    where: { status: "UPCOMING", dueDate: { gte: now, lte: threeDays } },
    include: { sharedBill: true, household: { include: { members: true } } },
  });
  for (const c of soonCharges) {
    const dk = c.dueDate.toISOString().slice(0, 10);
    for (const m of c.household.members) {
      if (!m.userId || !m.accepted) continue;
      const sent = await notify(
        m.userId,
        "BILL_DUE_SOON",
        `Bill due soon: ${c.sharedBill.name}`,
        `$${c.amount.toFixed(0)} due ${dk}.`,
        "/dashboard/couples",
        `billsoon:${c.id}:${m.userId}`
      );
      if (sent) billDueSoon++;
    }
  }

  // BILL_MISSED — UPCOMING past dueDate by 3+ days
  const missedCutoff = new Date(now.getTime() - 3 * 86400000);
  const missedCharges = await prisma.billCharge.findMany({
    where: { status: "UPCOMING", dueDate: { lt: missedCutoff } },
    include: { sharedBill: true, household: { include: { members: true } } },
  });
  for (const c of missedCharges) {
    await prisma.billCharge.update({ where: { id: c.id }, data: { status: "MISSED" } });
    billMissed++;
    for (const m of c.household.members) {
      if (!m.userId || !m.accepted) continue;
      await notify(
        m.userId,
        "BILL_MISSED",
        `Bill missed: ${c.sharedBill.name}`,
        `$${c.amount.toFixed(0)} was due ${c.dueDate.toISOString().slice(0, 10)}.`,
        "/dashboard/couples",
        `billmissed:${c.id}:${m.userId}`
      );
    }
  }

  // SETTLEMENT_SUGGESTED when imbalance > $50
  const allHouseholds = await prisma.household.findMany({ select: { id: true } });
  for (const h of allHouseholds) {
    const balances = await balanceOf(h.id);
    if (!balances.length) continue;
    const sorted = [...balances].sort((a, b) => a.net - b.net);
    const debtor = sorted[0], creditor = sorted[sorted.length - 1];
    if (!debtor || !creditor) continue;
    const amount = Math.min(-debtor.net, creditor.net);
    if (amount > 50) {
      const today = new Date().toISOString().slice(0, 10);
      const sent = await notify(
        debtor.userId,
        "SETTLEMENT_SUGGESTED",
        `Time to settle up`,
        `You owe $${amount.toFixed(0)} — tap to pay.`,
        "/dashboard/couples",
        `settsug:${h.id}:${debtor.userId}:${today}`
      );
      if (sent) settleSuggested++;
    }
  }

  return NextResponse.json({
    ok: true,
    expired, autoApproved, reminders, missed,
    billCharges, billMissed, billDueSoon, settleSuggested,
  });
}
