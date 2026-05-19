import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCron } from "@/lib/cron";
import { notify } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const fail = verifyCron(req);
  if (fail) return fail;

  const now = new Date();
  let expired = 0, reminders = 0, missed = 0, autoApproved = 0;

  // Expire pending PurchaseReviews
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
      await prisma.transaction.update({
        where: { id: rev.transactionId },
        data: { pending: false },
      }).catch(() => {});
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

  // 24h reminders
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

  // Mark past upcoming as MISSED
  const past = await prisma.moneyDate.findMany({
    where: { status: { in: ["UPCOMING", "RESCHEDULED"] }, scheduledAt: { lt: new Date(now.getTime() - 24 * 3600 * 1000) } },
  });
  for (const md of past) {
    await prisma.moneyDate.update({ where: { id: md.id }, data: { status: "MISSED" } });
    missed++;
  }

  return NextResponse.json({ ok: true, expired, autoApproved, reminders, missed });
}
