import { describe, it, expect } from "vitest";
import { accrueLoanInterest, applyLoanPayment, loanProgress, summarizeBankPosition } from "@/lib/loans";

describe("loans", () => {
  it("accrueLoanInterest is a no-op for 0% loans (the common family-loan case)", () => {
    const r = accrueLoanInterest(500, 0, new Date(2026, 0, 1), new Date(2026, 5, 1));
    expect(r).toEqual({ interest: 0, newBalance: 500, monthsAccrued: 0 });
  });

  it("accrueLoanInterest is a no-op once the loan is paid off", () => {
    const r = accrueLoanInterest(0, 12, new Date(2026, 0, 1), new Date(2026, 5, 1));
    expect(r.interest).toBe(0);
    expect(r.newBalance).toBe(0);
  });

  it("accrueLoanInterest compounds monthly simple interest on the balance", () => {
    // 12% APR = 1%/mo on $1000 for 3 months ≈ $30
    const r = accrueLoanInterest(1000, 12, new Date(2026, 0, 1), new Date(2026, 3, 1));
    expect(r.monthsAccrued).toBe(3);
    expect(r.interest).toBeCloseTo(30, 2);
    expect(r.newBalance).toBeCloseTo(1030, 2);
  });

  it("accrueLoanInterest does nothing within the same month", () => {
    const r = accrueLoanInterest(1000, 12, new Date(2026, 0, 1), new Date(2026, 0, 15));
    expect(r.interest).toBe(0);
  });

  it("applyLoanPayment reduces the balance and reports payoff", () => {
    expect(applyLoanPayment(100, 40)).toEqual({ newBalance: 60, overpaid: 0, paidOff: false });
    expect(applyLoanPayment(100, 100)).toEqual({ newBalance: 0, overpaid: 0, paidOff: true });
  });

  it("applyLoanPayment reports overpayment instead of going negative", () => {
    expect(applyLoanPayment(50, 80)).toEqual({ newBalance: 0, overpaid: 30, paidOff: true });
  });

  it("loanProgress is a percentage of principal paid down", () => {
    expect(loanProgress(200, 200)).toBe(0);
    expect(loanProgress(200, 0)).toBe(100);
    expect(loanProgress(200, 50)).toBe(75);
  });

  it("loanProgress treats a zero-principal loan as fully paid", () => {
    expect(loanProgress(0, 0)).toBe(100);
  });

  it("summarizeBankPosition nets who owes whom across active loans, ignoring paid ones", () => {
    const loans = [
      { lenderUserId: "parent", borrowerUserId: "kid1", balanceRemaining: 100, status: "ACTIVE" as const },
      { lenderUserId: "parent", borrowerUserId: "kid2", balanceRemaining: 40, status: "ACTIVE" as const },
      { lenderUserId: "parent", borrowerUserId: "kid1", balanceRemaining: 0, status: "PAID" as const },
    ];
    const pos = summarizeBankPosition(loans);
    expect(pos.parent).toBe(140);
    expect(pos.kid1).toBe(-100);
    expect(pos.kid2).toBe(-40);
  });
});
