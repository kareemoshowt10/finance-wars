import { describe, it, expect } from "vitest";
import { simulatePayoff } from "@/lib/payoffSim";

const boss = (accountId: string, name: string, hp: number, apr: number, dps30: number) => ({
  accountId,
  name,
  hp,
  apr,
  dps30,
});

describe("simulatePayoff", () => {
  it("returns zero payoff for no debts", () => {
    const r = simulatePayoff({ bosses: [], extraMonthly: 100, strategy: "avalanche" });
    expect(r.payoffMonths).toBe(0);
    expect(r.totalInterest).toBe(0);
    expect(r.defeatOrder).toEqual([]);
  });

  it("ignores zero-balance bosses", () => {
    const r = simulatePayoff({
      bosses: [boss("a", "Paid", 0, 20, 50)],
      extraMonthly: 100,
      strategy: "avalanche",
    });
    expect(r.payoffMonths).toBe(0);
  });

  it("pays off a zero-interest debt in expected months", () => {
    const r = simulatePayoff({
      bosses: [boss("a", "Loan", 1000, 0, 100)],
      extraMonthly: 0,
      strategy: "avalanche",
    });
    expect(r.payoffMonths).toBe(10);
    expect(r.totalInterest).toBe(0);
    expect(r.defeatOrder[0]?.month).toBe(10);
  });

  it("accrues interest on an interest-bearing debt", () => {
    const r = simulatePayoff({
      bosses: [boss("a", "Card", 1000, 24, 100)],
      extraMonthly: 0,
      strategy: "avalanche",
    });
    expect(r.totalInterest).toBeGreaterThan(0);
    expect(r.payoffMonths!).toBeGreaterThan(10);
  });

  it("extra payment shortens payoff and reduces interest", () => {
    const base = simulatePayoff({
      bosses: [boss("a", "Card", 5000, 24, 250)],
      extraMonthly: 0,
      strategy: "avalanche",
    });
    const boosted = simulatePayoff({
      bosses: [boss("a", "Card", 5000, 24, 250)],
      extraMonthly: 200,
      strategy: "avalanche",
    });
    expect(boosted.payoffMonths!).toBeLessThan(base.payoffMonths!);
    expect(boosted.totalInterest).toBeLessThan(base.totalInterest);
  });

  it("avalanche targets the highest APR first", () => {
    const r = simulatePayoff({
      bosses: [
        boss("low", "Low APR", 2000, 5, 50),
        boss("high", "High APR", 2000, 25, 50),
      ],
      extraMonthly: 500,
      strategy: "avalanche",
    });
    expect(r.defeatOrder[0].accountId).toBe("high");
  });

  it("snowball targets the smallest balance first", () => {
    const r = simulatePayoff({
      bosses: [
        boss("big", "Big", 5000, 10, 50),
        boss("small", "Small", 800, 10, 50),
      ],
      extraMonthly: 300,
      strategy: "snowball",
    });
    expect(r.defeatOrder[0].accountId).toBe("small");
  });

  it("respects horizon cap and returns null when unpayable in window", () => {
    const r = simulatePayoff({
      bosses: [boss("a", "Whale", 100000, 30, 10)],
      extraMonthly: 0,
      strategy: "avalanche",
      horizonMonths: 12,
    });
    expect(r.payoffMonths).toBeNull();
    expect(r.months).toHaveLength(12);
  });
});
