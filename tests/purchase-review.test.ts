import { describe, it, expect } from "vitest";
import { evaluateReviewRequired, isExpired } from "@/lib/purchaseReview";

describe("evaluateReviewRequired", () => {
  const pact = { bigPurchaseThreshold: 300 };
  it("returns false when no household", () => {
    expect(evaluateReviewRequired({ type: "expense", amount: 500, category: "X" }, { pact, hasHousehold: false })).toBe(false);
  });
  it("returns false for income", () => {
    expect(evaluateReviewRequired({ type: "income", amount: 5000, category: "Salary" }, { pact, hasHousehold: true })).toBe(false);
  });
  it("returns false under threshold", () => {
    expect(evaluateReviewRequired({ type: "expense", amount: 200, category: "Shopping" }, { pact, hasHousehold: true })).toBe(false);
  });
  it("returns true at/over threshold", () => {
    expect(evaluateReviewRequired({ type: "expense", amount: 300, category: "Shopping" }, { pact, hasHousehold: true })).toBe(true);
    expect(evaluateReviewRequired({ type: "expense", amount: 9000, category: "Travel" }, { pact, hasHousehold: true })).toBe(true);
  });
  it("returns false when category is muted", () => {
    expect(evaluateReviewRequired({ type: "expense", amount: 500, category: "Groceries" }, { pact, hasHousehold: true, mutedCategories: ["Groceries"] })).toBe(false);
  });
  it("returns false when no pact", () => {
    expect(evaluateReviewRequired({ type: "expense", amount: 1000, category: "X" }, { pact: null, hasHousehold: true })).toBe(false);
  });
});

describe("isExpired", () => {
  it("detects expired pending reviews", () => {
    expect(isExpired({ status: "PENDING", expiresAt: new Date(Date.now() - 1000) })).toBe(true);
  });
  it("ignores non-pending", () => {
    expect(isExpired({ status: "APPROVED", expiresAt: new Date(Date.now() - 1000) })).toBe(false);
  });
  it("future expiry not expired", () => {
    expect(isExpired({ status: "PENDING", expiresAt: new Date(Date.now() + 100000) })).toBe(false);
  });
});
