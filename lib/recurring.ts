import { prisma } from "./prisma";

export function advanceDate(d: Date, frequency: string): Date {
  const next = new Date(d);
  switch (frequency) {
    case "WEEKLY": next.setDate(next.getDate() + 7); break;
    case "BIWEEKLY": next.setDate(next.getDate() + 14); break;
    case "MONTHLY": next.setMonth(next.getMonth() + 1); break;
    case "YEARLY": next.setFullYear(next.getFullYear() + 1); break;
    default: next.setMonth(next.getMonth() + 1);
  }
  return next;
}

export async function runDue(userId: string) {
  const now = new Date();
  const due = await prisma.recurringTransaction.findMany({
    where: { userId, active: true, nextRunDate: { lte: now } },
  });
  for (const r of due) {
    let runDate = new Date(r.nextRunDate);
    // catch up if multiple periods passed
    while (runDate <= now) {
      await prisma.transaction.create({
        data: {
          userId: r.userId,
          accountId: r.accountId,
          amount: r.amount,
          type: r.type,
          category: r.category,
          description: r.description,
          date: runDate,
        },
      });
      const delta = r.type === "income" ? r.amount : -r.amount;
      await prisma.account.update({
        where: { id: r.accountId },
        data: { balance: { increment: delta } },
      });
      runDate = advanceDate(runDate, r.frequency);
    }
    await prisma.recurringTransaction.update({
      where: { id: r.id },
      data: { nextRunDate: runDate },
    });
  }
}
