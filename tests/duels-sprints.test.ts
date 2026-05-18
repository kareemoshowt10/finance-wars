import { describe, it, expect, vi } from "vitest";

// Mock prisma so importing the engine module doesn't error.
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { determineSprintWinner, determineDuelWinner, calcStakeTransfer } from "@/lib/duels/sprints";

describe("determineSprintWinner", () => {
  it("clear winner", () => {
    expect(determineSprintWinner({ a: 100, b: 50 })).toEqual({ winnerId: "a", tie: false });
  });
  it("tie", () => {
    expect(determineSprintWinner({ a: 80, b: 80 })).toEqual({ winnerId: null, tie: true });
  });
  it("zeros yield no winner", () => {
    expect(determineSprintWinner({ a: 0, b: 0 })).toEqual({ winnerId: null, tie: false });
  });
});

describe("determineDuelWinner", () => {
  it("most sprints wins", () => {
    const r = determineDuelWinner([
      { id: "a", sprintsWon: 3, totalPoints: 100, longestStreakDays: 2 },
      { id: "b", sprintsWon: 2, totalPoints: 500, longestStreakDays: 10 },
    ]);
    expect(r).toEqual({ winnerId: "a", joint: false });
  });
  it("tiebreaker by totalPoints", () => {
    const r = determineDuelWinner([
      { id: "a", sprintsWon: 2, totalPoints: 100, longestStreakDays: 5 },
      { id: "b", sprintsWon: 2, totalPoints: 200, longestStreakDays: 1 },
    ]);
    expect(r.winnerId).toBe("b");
  });
  it("fully equal is joint", () => {
    const r = determineDuelWinner([
      { id: "a", sprintsWon: 2, totalPoints: 100, longestStreakDays: 5 },
      { id: "b", sprintsWon: 2, totalPoints: 100, longestStreakDays: 5 },
    ]);
    expect(r).toEqual({ winnerId: null, joint: true });
  });
});

describe("calcStakeTransfer (insufficient-funds path)", () => {
  it("forfeits when balance is zero", () => {
    expect(calcStakeTransfer({ loserBalance: 0, stakeAmount: 200, stakePercentCap: 10 })).toEqual({ transfer: 0, forfeited: true });
  });
  it("caps to percent of balance", () => {
    // 10% of 1000 = 100 → cap below stakeAmount 200
    expect(calcStakeTransfer({ loserBalance: 1000, stakeAmount: 200, stakePercentCap: 10 })).toEqual({ transfer: 100, forfeited: false });
  });
  it("uses full stake when within cap", () => {
    expect(calcStakeTransfer({ loserBalance: 10_000, stakeAmount: 200, stakePercentCap: 10 })).toEqual({ transfer: 200, forfeited: false });
  });
});
