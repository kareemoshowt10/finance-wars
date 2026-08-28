import { describe, it, expect } from "vitest";
import { goalProgressPct, isNeglected, rankCompetingGoals, tallyVotes } from "@/lib/householdGoals";

const daysAgo = (n: number, now = new Date(2026, 5, 1)) => new Date(now.getTime() - n * 86400000);

describe("householdGoals", () => {
  it("goalProgressPct is bounded 0..100", () => {
    expect(goalProgressPct(1000, 0)).toBe(0);
    expect(goalProgressPct(1000, 500)).toBe(50);
    expect(goalProgressPct(1000, 5000)).toBe(100);
  });

  it("goalProgressPct treats a zero target as fully funded", () => {
    expect(goalProgressPct(0, 0)).toBe(100);
  });

  describe("isNeglected — the bathroom remodel problem", () => {
    const now = new Date(2026, 5, 1);

    it("flags an ESSENTIAL goal nobody has funded in 21+ days", () => {
      const goal = {
        category: "ESSENTIAL" as const,
        status: "ACTIVE" as const,
        targetAmount: 6000,
        currentAmount: 400,
        lastContributionAt: daysAgo(30, now),
        createdAt: daysAgo(90, now),
      };
      expect(isNeglected(goal, now)).toBe(true);
    });

    it("does not flag an ESSENTIAL goal funded recently", () => {
      const goal = {
        category: "ESSENTIAL" as const,
        status: "ACTIVE" as const,
        targetAmount: 6000,
        currentAmount: 400,
        lastContributionAt: daysAgo(3, now),
        createdAt: daysAgo(90, now),
      };
      expect(isNeglected(goal, now)).toBe(false);
    });

    it("never flags an ELECTIVE goal (the PS5 fund doesn't need a guilt trip)", () => {
      const goal = {
        category: "ELECTIVE" as const,
        status: "ACTIVE" as const,
        targetAmount: 500,
        currentAmount: 50,
        lastContributionAt: daysAgo(60, now),
        createdAt: daysAgo(90, now),
      };
      expect(isNeglected(goal, now)).toBe(false);
    });

    it("does not flag a goal that's already fully funded", () => {
      const goal = {
        category: "ESSENTIAL" as const,
        status: "ACTIVE" as const,
        targetAmount: 1000,
        currentAmount: 1000,
        lastContributionAt: daysAgo(90, now),
        createdAt: daysAgo(200, now),
      };
      expect(isNeglected(goal, now)).toBe(false);
    });

    it("falls back to createdAt when there's never been a contribution", () => {
      const goal = {
        category: "ESSENTIAL" as const,
        status: "ACTIVE" as const,
        targetAmount: 1000,
        currentAmount: 0,
        lastContributionAt: null,
        createdAt: daysAgo(25, now),
      };
      expect(isNeglected(goal, now)).toBe(true);
    });
  });

  describe("rankCompetingGoals — PS5 vs. the above-ground pool", () => {
    it("ranks by votes first", () => {
      const ranked = rankCompetingGoals([
        { id: "ps5", votes: 2, targetAmount: 500, currentAmount: 100 },
        { id: "pool", votes: 3, targetAmount: 2200, currentAmount: 50 },
      ]);
      expect(ranked[0].id).toBe("pool");
    });

    it("breaks a vote tie using progress so far", () => {
      const ranked = rankCompetingGoals([
        { id: "ps5", votes: 2, targetAmount: 500, currentAmount: 400 }, // 80%
        { id: "pool", votes: 2, targetAmount: 2200, currentAmount: 220 }, // 10%
      ]);
      expect(ranked[0].id).toBe("ps5");
    });
  });

  it("tallyVotes counts votes per goal", () => {
    const votes = [{ goalId: "ps5" }, { goalId: "ps5" }, { goalId: "pool" }];
    expect(tallyVotes(votes)).toEqual({ ps5: 2, pool: 1 });
  });
});
