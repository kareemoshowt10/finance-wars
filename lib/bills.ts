import { prisma } from "./prisma";

/** Advance a bill's nextDueDate by its frequency. ONEOFF deactivates. */
export async function advanceBillDueDate(billId: string) {
  const bill = await prisma.sharedBill.findUnique({ where: { id: billId } });
  if (!bill) return;
  const next = nextDueAfter(bill.nextDueDate, bill.frequency);
  if (!next) {
    await prisma.sharedBill.update({ where: { id: billId }, data: { active: false } });
    return;
  }
  await prisma.sharedBill.update({ where: { id: billId }, data: { nextDueDate: next } });
}

export function nextDueAfter(d: Date, frequency: string): Date | null {
  const x = new Date(d);
  switch (frequency) {
    case "WEEKLY":
      x.setDate(x.getDate() + 7);
      return x;
    case "BIWEEKLY":
      x.setDate(x.getDate() + 14);
      return x;
    case "MONTHLY":
      x.setMonth(x.getMonth() + 1);
      return x;
    case "YEARLY":
      x.setFullYear(x.getFullYear() + 1);
      return x;
    case "ONEOFF":
    default:
      return null;
  }
}
