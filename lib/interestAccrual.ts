import { prisma } from "./prisma";
import { isDebtAccount } from "./debtBoss";

const INTEREST_CATEGORY = "Interest";

function monthsBetween(from: Date, to: Date): number {
  if (to <= from) return 0;
  const years = to.getFullYear() - from.getFullYear();
  const months = to.getMonth() - from.getMonth();
  let total = years * 12 + months;
  if (to.getDate() < from.getDate()) total -= 1;
  return Math.max(0, total);
}

export async function accrueInterestForUser(userId: string, now: Date = new Date()) {
  const accts = await prisma.account.findMany({ where: { userId } });
  let chargedAccounts = 0;
  let totalInterest = 0;

  for (const a of accts) {
    if (!isDebtAccount(a.type)) continue;
    const apr = (a as unknown as { interestRate?: number | null }).interestRate ?? null;
    if (!apr || apr <= 0) continue;
    const balance = a.balance;
    if (balance >= 0) continue;

    const lastAt = (a as unknown as { lastInterestAccruedAt?: Date | null }).lastInterestAccruedAt ?? a.createdAt;
    const months = monthsBetween(new Date(lastAt), now);
    if (months <= 0) continue;

    const monthlyRate = apr / 100 / 12;
    const principal = Math.abs(balance);
    const interest = Math.round(principal * monthlyRate * months * 100) / 100;
    if (interest <= 0) continue;

    await prisma.$transaction([
      prisma.transaction.create({
        data: {
          userId,
          accountId: a.id,
          amount: interest,
          type: "expense",
          category: INTEREST_CATEGORY,
          description: `${apr}% APR interest (${months} mo)`,
          date: now,
        },
      }),
      prisma.account.update({
        where: { id: a.id },
        data: {
          balance: { decrement: interest },
          lastInterestAccruedAt: now,
        },
      }),
    ]);
    chargedAccounts++;
    totalInterest += interest;
  }

  return { chargedAccounts, totalInterest: Math.round(totalInterest * 100) / 100 };
}
