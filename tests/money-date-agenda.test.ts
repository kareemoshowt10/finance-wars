import { describe, it, expect } from "vitest";
import { composeAgenda } from "@/lib/moneyDate";

describe("composeAgenda", () => {
  it("returns empty-friendly summary with no inputs", () => {
    const a = composeAgenda({ topSpending: [], goalsProgress: [], pendingReviews: [], missedSprintTargets: [], upcomingBills: [], largeTxs: [], sprintResults: [] });
    expect(a.sections.length).toBe(0);
    expect(a.summary).toMatch(/Nothing/);
  });
  it("includes spending section", () => {
    const a = composeAgenda({
      topSpending: [{ category: "Food", current: 400, prev: 200 }],
      goalsProgress: [], pendingReviews: [], missedSprintTargets: [], upcomingBills: [], largeTxs: [], sprintResults: [],
    });
    expect(a.sections[0].title).toBe("Spending");
    expect(a.sections[0].items[0].body).toMatch(/up 100%/);
  });
  it("composes goals + reviews + bills sections", () => {
    const a = composeAgenda({
      topSpending: [],
      goalsProgress: [{ id: "g1", name: "Tesla", pctChange: 12, currentAmount: 5000, targetAmount: 40000 }],
      pendingReviews: [{ id: "r1", amount: 500, description: "Sofa", requesterName: "Alex" }],
      missedSprintTargets: [],
      upcomingBills: [{ description: "Rent", amount: 1500, date: new Date("2026-06-01") }],
      largeTxs: [], sprintResults: [],
    });
    const titles = a.sections.map((s) => s.title);
    expect(titles).toContain("Goals");
    expect(titles).toContain("Purchases");
    expect(titles).toContain("Bills");
  });
  it("counts items in summary", () => {
    const a = composeAgenda({
      topSpending: [{ category: "Food", current: 100, prev: 100 }, { category: "Gas", current: 80, prev: 60 }],
      goalsProgress: [], pendingReviews: [], missedSprintTargets: [], upcomingBills: [], largeTxs: [], sprintResults: [],
    });
    expect(a.summary).toMatch(/2 items/);
  });
  it("includes sprint sections when provided", () => {
    const a = composeAgenda({
      topSpending: [],
      goalsProgress: [],
      pendingReviews: [],
      missedSprintTargets: [{ duelTitle: "Hawaii", weekNumber: 2, target: 500, actual: 300 }],
      upcomingBills: [],
      largeTxs: [{ description: "Mac", amount: 1800, category: "Shopping" }],
      sprintResults: [{ duelTitle: "Hawaii", weekNumber: 1, winner: "Side A" }],
    });
    const titles = a.sections.map((s) => s.title);
    expect(titles).toEqual(expect.arrayContaining(["Sprints", "Large transactions", "Sprint results"]));
  });
});
