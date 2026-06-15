import { describe, it, expect } from "vitest";
import {
  monthlyMortgagePayment, computePITI, maxAffordableHomePrice,
  debtToIncome, mortgagePayoff, downPaymentPlan, carAffordability,
} from "@/lib/bigPurchase";

describe("monthlyMortgagePayment", () => {
  it("returns 0 for non-positive principal", () => {
    expect(monthlyMortgagePayment(0, 6, 30)).toBe(0);
  });
  it("handles zero APR as straight-line amortization", () => {
    expect(monthlyMortgagePayment(120_000, 0, 30)).toBeCloseTo(120_000 / 360, 5);
  });
  it("approximates a known textbook value", () => {
    // $300k @ 6% / 30yr should be ~$1798.65
    expect(monthlyMortgagePayment(300_000, 6, 30)).toBeGreaterThan(1790);
    expect(monthlyMortgagePayment(300_000, 6, 30)).toBeLessThan(1810);
  });
});

describe("computePITI", () => {
  it("adds PMI when LTV > 80%", () => {
    const high = computePITI({
      homePrice: 400_000, downPayment: 40_000, // 10% down → LTV 90%
      aprPct: 6.5, years: 30,
      annualTaxRatePct: 1.1, annualInsurance: 1800, monthlyHOA: 0,
    });
    expect(high.pmi).toBeGreaterThan(0);
  });
  it("omits PMI at 20% down", () => {
    const low = computePITI({
      homePrice: 400_000, downPayment: 80_000, // 20% down → LTV 80%
      aprPct: 6.5, years: 30,
      annualTaxRatePct: 1.1, annualInsurance: 1800, monthlyHOA: 0,
    });
    expect(low.pmi).toBe(0);
  });
  it("includes HOA and taxes in total", () => {
    const p = computePITI({
      homePrice: 500_000, downPayment: 100_000, aprPct: 7, years: 30,
      annualTaxRatePct: 1.2, annualInsurance: 2400, monthlyHOA: 250,
    });
    expect(p.hoa).toBe(250);
    expect(p.taxes).toBeGreaterThan(450); // ~$500/mo
    expect(p.total).toBeGreaterThan(p.principalInterest);
  });
});

describe("maxAffordableHomePrice", () => {
  it("respects the monthly budget ceiling", () => {
    const price = maxAffordableHomePrice({
      monthlyBudget: 2500, downPayment: 50_000, aprPct: 6.5, years: 30,
      annualTaxRatePct: 1.1, annualInsurance: 1800, monthlyHOA: 0,
    });
    const piti = computePITI({
      homePrice: price, downPayment: 50_000, aprPct: 6.5, years: 30,
      annualTaxRatePct: 1.1, annualInsurance: 1800, monthlyHOA: 0,
    });
    expect(piti.total).toBeLessThanOrEqual(2500 + 1); // ~budget, allow penny slop
    expect(piti.total).toBeGreaterThan(2400);          // and uses most of it
  });
});

describe("debtToIncome", () => {
  it("computes front and back end and flags ok/not", () => {
    const r = debtToIncome({
      grossMonthlyIncome: 10_000, monthlyHousing: 2500, otherMonthlyDebts: 800,
    });
    expect(r.frontEnd).toBeCloseTo(0.25, 2);
    expect(r.backEnd).toBeCloseTo(0.33, 2);
    expect(r.frontEndOk).toBe(true);
    expect(r.backEndOk).toBe(true);
  });
  it("flags over-limit DTI", () => {
    const r = debtToIncome({
      grossMonthlyIncome: 8_000, monthlyHousing: 2700, otherMonthlyDebts: 800,
    });
    expect(r.frontEndOk).toBe(false);
    expect(r.backEndOk).toBe(false);
  });
});

describe("mortgagePayoff", () => {
  it("shortens timeline and saves interest with extra principal", () => {
    const r = mortgagePayoff({ loan: 300_000, aprPct: 6.5, years: 30, extraMonthly: 300 });
    expect(r.monthsSaved).toBeGreaterThan(0);
    expect(r.interestSaved).toBeGreaterThan(0);
    expect(r.acceleratedMonths).toBeLessThan(r.baseMonths);
  });
  it("zero extra payment matches the base scenario", () => {
    const r = mortgagePayoff({ loan: 200_000, aprPct: 5, years: 30, extraMonthly: 0 });
    expect(r.monthsSaved).toBe(0);
    expect(r.interestSaved).toBeCloseTo(0, 0);
  });
});

describe("downPaymentPlan", () => {
  it("computes required, gap, and months to ready", () => {
    const p = downPaymentPlan({ homePrice: 500_000, downPct: 20, currentlySaved: 20_000, monthlySaving: 1500, apyPct: 4.5 });
    expect(p.required).toBe(100_000);
    expect(p.gap).toBe(80_000);
    expect(p.monthsToReady).toBeGreaterThan(0);
    expect(p.monthsToReady).toBeLessThan(120);
  });
  it("reports 0 months when already funded", () => {
    const p = downPaymentPlan({ homePrice: 100_000, downPct: 20, currentlySaved: 25_000, monthlySaving: 100, apyPct: 4 });
    expect(p.monthsToReady).toBe(0);
  });
  it("computes required monthly to hit 3-year and 5-year targets", () => {
    const p = downPaymentPlan({ homePrice: 300_000, downPct: 20, currentlySaved: 10_000, monthlySaving: 500, apyPct: 4.5 });
    expect(p.perMonthFor3Years).toBeGreaterThan(p.perMonthFor5Years);
  });
});

describe("carAffordability", () => {
  it("enforces the 10% rule", () => {
    const r = carAffordability({
      monthlyTakeHome: 6000, downPayment: 4000, aprPct: 8, years: 4,
      monthlyInsurance: 150, monthlyFuel: 120, monthlyMaintenance: 50,
    });
    expect(r.tenPercentBudget).toBeCloseTo(600, 1);
    expect(r.monthlyTCO).toBeLessThanOrEqual(r.tenPercentBudget + 1);
  });
  it("returns a max car price >= the down payment", () => {
    const r = carAffordability({
      monthlyTakeHome: 8000, downPayment: 10_000, aprPct: 7, years: 4,
      monthlyInsurance: 150, monthlyFuel: 200, monthlyMaintenance: 75,
    });
    expect(r.maxCarPrice).toBeGreaterThanOrEqual(10_000);
  });
});
