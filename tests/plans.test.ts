import { describe, it, expect } from "vitest";
import { planById, planIncludes, planMemberLimit, withinLimit, rank, meetsOrExceeds, NEXT_PLAN } from "@/lib/plans";

describe("plans", () => {
  it("planById returns the matching plan", () => {
    expect(planById("rhythm").name).toBe("Rhythm");
    expect(planById("household_hq").priceMonthly).toBe(20);
  });

  it("planById falls back to Free for an unknown/legacy plan id", () => {
    expect(planById("").id).toBe("free");
    expect(planById("some-old-plan").id).toBe("free");
  });

  it("planIncludes reflects the catalog's included features", () => {
    expect(planIncludes("free", "unlimited_chores")).toBe(false);
    expect(planIncludes("rhythm", "unlimited_chores")).toBe(true);
    expect(planIncludes("rhythm", "loan_interest")).toBe(false);
    expect(planIncludes("household_hq", "loan_interest")).toBe(true);
  });

  it("planMemberLimit matches the original Chore Wars tiers", () => {
    expect(planMemberLimit("free")).toBe(4);
    expect(planMemberLimit("rhythm")).toBe(12);
    expect(planMemberLimit("household_hq")).toBe(30);
  });

  describe("withinLimit", () => {
    it("null limit is always within bounds", () => {
      expect(withinLimit(null, 99999)).toBe(true);
    });
    it("a count under the limit fits, at-limit does not", () => {
      expect(withinLimit(5, 4)).toBe(true);
      expect(withinLimit(5, 5)).toBe(false);
      expect(withinLimit(5, 6)).toBe(false);
    });
  });

  it("rank orders free < rhythm < household_hq", () => {
    expect(rank("free")).toBeLessThan(rank("rhythm"));
    expect(rank("rhythm")).toBeLessThan(rank("household_hq"));
  });

  describe("meetsOrExceeds", () => {
    it("a higher plan meets a lower bar", () => {
      expect(meetsOrExceeds("household_hq", "rhythm")).toBe(true);
      expect(meetsOrExceeds("rhythm", "free")).toBe(true);
    });
    it("a plan meets its own bar", () => {
      expect(meetsOrExceeds("rhythm", "rhythm")).toBe(true);
    });
    it("a lower plan does not meet a higher bar", () => {
      expect(meetsOrExceeds("free", "rhythm")).toBe(false);
      expect(meetsOrExceeds("rhythm", "household_hq")).toBe(false);
    });
  });

  it("NEXT_PLAN points toward an upgrade and stops at the top", () => {
    expect(NEXT_PLAN.free).toBe("rhythm");
    expect(NEXT_PLAN.rhythm).toBe("household_hq");
    expect(NEXT_PLAN.household_hq).toBeNull();
  });
});
