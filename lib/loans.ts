// Household HQ: The Bank.
//
// One member fronts money to another for something specific — the phone
// screen repair, the concert tickets, the "I'm short on rent this month" —
// and the household can see exactly who owes what, why, and whether it's
// quietly accruing interest. Pure math lives here; lib/loanAccrual.ts wires
// it to Prisma.

export type LoanCategory = "ESSENTIAL" | "ELECTIVE";
export type LoanStatus = "ACTIVE" | "PAID" | "FORGIVEN";

function monthsBetween(from: Date, to: Date): number {
  if (to <= from) return 0;
  const years = to.getFullYear() - from.getFullYear();
  const months = to.getMonth() - from.getMonth();
  let total = years * 12 + months;
  if (to.getDate() < from.getDate()) total -= 1;
  return Math.max(0, total);
}

export type AccrualResult = {
  interest: number;
  newBalance: number;
  monthsAccrued: number;
};

/**
 * Simple monthly interest on the outstanding balance, same shape as the
 * personal-debt accrual in lib/interestAccrual.ts. A 0% loan (the common
 * case for family loans) always returns 0 interest.
 */
export function accrueLoanInterest(
  balanceRemaining: number,
  interestRateApr: number,
  lastAccruedAt: Date,
  now: Date = new Date()
): AccrualResult {
  if (balanceRemaining <= 0 || interestRateApr <= 0) {
    return { interest: 0, newBalance: Math.max(0, balanceRemaining), monthsAccrued: 0 };
  }
  const months = monthsBetween(lastAccruedAt, now);
  if (months <= 0) return { interest: 0, newBalance: balanceRemaining, monthsAccrued: 0 };

  const monthlyRate = interestRateApr / 100 / 12;
  const interest = Math.round(balanceRemaining * monthlyRate * months * 100) / 100;
  return {
    interest,
    newBalance: Math.round((balanceRemaining + interest) * 100) / 100,
    monthsAccrued: months,
  };
}

export type PaymentResult = {
  newBalance: number;
  overpaid: number;
  paidOff: boolean;
};

/** Apply a payment to a loan balance. Overpayment is reported, not silently absorbed. */
export function applyLoanPayment(balanceRemaining: number, amount: number): PaymentResult {
  const newBalance = Math.round(Math.max(0, balanceRemaining - amount) * 100) / 100;
  const overpaid = amount > balanceRemaining ? Math.round((amount - balanceRemaining) * 100) / 100 : 0;
  return { newBalance, overpaid, paidOff: newBalance <= 0 };
}

export function loanProgress(principal: number, balanceRemaining: number): number {
  if (principal <= 0) return 100;
  const paid = principal - balanceRemaining;
  return Math.max(0, Math.min(100, (paid / principal) * 100));
}

/** Net "who owes whom" per household member across every active loan — the bank's own book. */
export function summarizeBankPosition(
  loans: { lenderUserId: string; borrowerUserId: string; balanceRemaining: number; status: string }[]
): Record<string, number> {
  const net: Record<string, number> = {};
  for (const l of loans) {
    if (l.status !== "ACTIVE" || l.balanceRemaining <= 0) continue;
    net[l.borrowerUserId] = (net[l.borrowerUserId] ?? 0) - l.balanceRemaining;
    net[l.lenderUserId] = (net[l.lenderUserId] ?? 0) + l.balanceRemaining;
  }
  for (const k of Object.keys(net)) net[k] = Math.round(net[k] * 100) / 100;
  return net;
}
