import { prisma } from "./prisma";
import { accrueLoanInterest } from "./loans";

/**
 * Accrue interest on a single active loan and persist it. Safe to call
 * repeatedly (a dashboard load, then the monthly cron) — it's a no-op within
 * the same month, same as personal-account interest.
 */
export async function accrueLoanById(loanId: string, now: Date = new Date()) {
  const loan = await prisma.loan.findUnique({ where: { id: loanId } });
  if (!loan || loan.status !== "ACTIVE") return null;

  const { interest, newBalance, monthsAccrued } = accrueLoanInterest(
    loan.balanceRemaining,
    loan.interestRateApr,
    loan.lastAccruedAt,
    now
  );
  if (monthsAccrued <= 0) return loan;

  const anchor = new Date(now.getFullYear(), now.getMonth(), 1);
  return prisma.loan.update({
    where: { id: loanId },
    data: { balanceRemaining: newBalance, lastAccruedAt: anchor },
  });
}

export async function accrueAllActiveLoans(now: Date = new Date()) {
  const loans = await prisma.loan.findMany({
    where: { status: "ACTIVE", interestRateApr: { gt: 0 } },
    select: { id: true },
  });
  let accrued = 0;
  for (const l of loans) {
    try {
      await accrueLoanById(l.id, now);
      accrued++;
    } catch {}
  }
  return { processed: loans.length, accrued };
}
