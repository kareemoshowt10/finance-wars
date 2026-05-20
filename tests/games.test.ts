import { describe, it, expect } from "vitest";
import { scoreSamePage, scoreBudgetBid, scoreWorstCase, normalizeBudgetBid, SAME_PAGE_QUESTIONS, BUDGET_BID_CATEGORIES, WORST_CASE_SCENARIOS } from "@/lib/games";

describe("games scoring", () => {
  it("Same Page: 100% alignment when identical answers", () => {
    const a: Record<string, string> = {};
    const b: Record<string, string> = {};
    for (const q of SAME_PAGE_QUESTIONS) { a[q.id] = q.choices[0]; b[q.id] = q.choices[0]; }
    const r = scoreSamePage(a, b);
    expect(r.alignment).toBe(100);
    expect(r.matches).toBe(r.total);
  });

  it("Same Page: 0% alignment when all different", () => {
    const a: Record<string, string> = {};
    const b: Record<string, string> = {};
    for (const q of SAME_PAGE_QUESTIONS) { a[q.id] = q.choices[0]; b[q.id] = q.choices[1]; }
    expect(scoreSamePage(a, b).alignment).toBe(0);
  });

  it("Same Page: partial alignment computes correctly", () => {
    const ids = SAME_PAGE_QUESTIONS.map((q) => q.id);
    const a: Record<string, string> = {}; const b: Record<string, string> = {};
    a[ids[0]] = "x"; b[ids[0]] = "x";
    a[ids[1]] = "y"; b[ids[1]] = "z";
    a[ids[2]] = "p"; b[ids[2]] = "p";
    a[ids[3]] = "q"; b[ids[3]] = "q";
    a[ids[4]] = "r"; b[ids[4]] = "s";
    expect(scoreSamePage(a, b).alignment).toBe(60);
  });

  it("normalizeBudgetBid rescales to 500 when sum != 500", () => {
    const out = normalizeBudgetBid({ Savings: 200, Travel: 200, "Dining out": 200, "Home upgrade": 200, Donations: 200 });
    const sum = BUDGET_BID_CATEGORIES.reduce((s, c) => s + out[c], 0);
    expect(sum).toBe(500);
  });

  it("normalizeBudgetBid clamps negatives to 0", () => {
    const out = normalizeBudgetBid({ Savings: -100, Travel: 500, "Dining out": 0, "Home upgrade": 0, Donations: 0 });
    expect(out.Savings).toBe(0);
    expect(out.Travel).toBe(500);
  });

  it("Budget Bid: identical allocations = 100% alignment", () => {
    const a = normalizeBudgetBid({ Savings: 250, Travel: 100, "Dining out": 50, "Home upgrade": 50, Donations: 50 });
    const b = normalizeBudgetBid({ Savings: 250, Travel: 100, "Dining out": 50, "Home upgrade": 50, Donations: 50 });
    expect(scoreBudgetBid(a, b).alignment).toBe(100);
  });

  it("Budget Bid: opposite allocations = 0% overlap", () => {
    const a = normalizeBudgetBid({ Savings: 500, Travel: 0, "Dining out": 0, "Home upgrade": 0, Donations: 0 });
    const b = normalizeBudgetBid({ Savings: 0, Travel: 500, "Dining out": 0, "Home upgrade": 0, Donations: 0 });
    expect(scoreBudgetBid(a, b).alignment).toBe(0);
  });

  it("Worst Case: matches per scenario", () => {
    const a: Record<string, string> = {};
    const b: Record<string, string> = {};
    for (const s of WORST_CASE_SCENARIOS) { a[s.id] = s.choices[0]; b[s.id] = s.choices[0]; }
    expect(scoreWorstCase(a, b).alignment).toBe(100);
    b[WORST_CASE_SCENARIOS[0].id] = WORST_CASE_SCENARIOS[0].choices[1];
    const r = scoreWorstCase(a, b);
    expect(r.matches).toBe(WORST_CASE_SCENARIOS.length - 1);
  });
});
