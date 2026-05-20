import { describe, it, expect } from "vitest";
import { computeAccuracy, rewardForAccuracy, monthKey, nextMonthKey, previousMonthKey } from "@/lib/predictions";

describe("predictions", () => {
  it("computeAccuracy: exact match is 100", () => {
    expect(computeAccuracy(500, 500)).toBe(100);
  });

  it("computeAccuracy: 50% off is 50", () => {
    expect(computeAccuracy(500, 1000)).toBe(50);
    expect(computeAccuracy(1000, 500)).toBe(50);
  });

  it("computeAccuracy: 0 forecast on non-zero actual is 0", () => {
    expect(computeAccuracy(0, 500)).toBe(0);
  });

  it("computeAccuracy: both zero is 100 (nothing happened, called correctly)", () => {
    expect(computeAccuracy(0, 0)).toBe(100);
  });

  it("rewardForAccuracy: tiers payout reasonably", () => {
    expect(rewardForAccuracy(99).xp).toBe(200);
    expect(rewardForAccuracy(90).xp).toBe(100);
    expect(rewardForAccuracy(75).xp).toBe(50);
    expect(rewardForAccuracy(55).xp).toBe(20);
    expect(rewardForAccuracy(20).xp).toBe(5);
    expect(rewardForAccuracy(20).sc).toBe(0);
    expect(rewardForAccuracy(99).sc).toBe(50);
  });

  it("monthKey formats YYYY-MM with leading zero", () => {
    expect(monthKey(new Date(2026, 0, 15))).toBe("2026-01");
    expect(monthKey(new Date(2026, 10, 15))).toBe("2026-11");
  });

  it("nextMonthKey crosses year boundary", () => {
    expect(nextMonthKey(new Date(2026, 11, 15))).toBe("2027-01");
  });

  it("previousMonthKey crosses year boundary", () => {
    expect(previousMonthKey(new Date(2026, 0, 15))).toBe("2025-12");
  });
});
