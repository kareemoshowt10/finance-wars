import { describe, it, expect } from "vitest";
import { computeStreak, buildLeaderboard, mostFrequentDoer, isChoreDue } from "@/lib/chores";

const day = (n: number) => new Date(2026, 0, n, 9, 0, 0);

describe("chores", () => {
  it("computeStreak counts consecutive days ending today", () => {
    const completions = [day(1), day(2), day(3)];
    expect(computeStreak(completions, "DAILY", day(3))).toBe(3);
  });

  it("computeStreak stays alive if today hasn't been logged yet", () => {
    const completions = [day(1), day(2), day(3)];
    // "now" is the morning of day 4 — yesterday's streak should still count.
    expect(computeStreak(completions, "DAILY", new Date(2026, 0, 4, 6, 0, 0))).toBe(3);
  });

  it("computeStreak resets after a skipped day", () => {
    const completions = [day(1), day(2), day(5)];
    expect(computeStreak(completions, "DAILY", day(5))).toBe(1);
  });

  it("computeStreak is 0 for ONEOFF chores and empty history", () => {
    expect(computeStreak([day(1)], "ONEOFF", day(1))).toBe(0);
    expect(computeStreak([], "DAILY", day(1))).toBe(0);
  });

  it("buildLeaderboard aggregates completions, crowns and xp per member and ranks them", () => {
    const members = [
      { userId: "u1", name: "Alex" },
      { userId: "u2", name: "Sam" },
    ];
    const completions = [
      { userId: "u1", crownsAwarded: 10, xpAwarded: 5, completedAt: day(1) },
      { userId: "u1", crownsAwarded: 10, xpAwarded: 5, completedAt: day(2) },
      { userId: "u2", crownsAwarded: 8, xpAwarded: 4, completedAt: day(1) },
    ];
    const board = buildLeaderboard(completions, members);
    expect(board[0]).toMatchObject({ userId: "u1", completions: 2, crowns: 20, xp: 10, rank: 1 });
    expect(board[1]).toMatchObject({ userId: "u2", completions: 1, crowns: 8, xp: 4, rank: 2 });
  });

  it("buildLeaderboard includes members with zero completions", () => {
    const board = buildLeaderboard([], [{ userId: "u1", name: "Alex" }, { userId: "u2", name: "Sam" }]);
    expect(board).toHaveLength(2);
    expect(board.every((b) => b.completions === 0)).toBe(true);
  });

  it("mostFrequentDoer answers 'who does the dishes most'", () => {
    const completions = [
      { choreId: "dishes", userId: "u1" },
      { choreId: "dishes", userId: "u1" },
      { choreId: "dishes", userId: "u2" },
      { choreId: "trash", userId: "u2" },
    ];
    const ranked = mostFrequentDoer(completions, "dishes");
    expect(ranked[0]).toEqual({ userId: "u1", count: 2 });
    expect(ranked[1]).toEqual({ userId: "u2", count: 1 });
  });

  it("isChoreDue is true when never completed", () => {
    expect(isChoreDue("DAILY", null, day(5))).toBe(true);
  });

  it("isChoreDue is false for a DAILY chore already done today", () => {
    expect(isChoreDue("DAILY", day(5), new Date(2026, 0, 5, 20, 0, 0))).toBe(false);
  });

  it("isChoreDue is true for a DAILY chore done yesterday", () => {
    expect(isChoreDue("DAILY", day(4), day(5))).toBe(true);
  });

  it("isChoreDue for ONEOFF is only true before it's ever been done", () => {
    expect(isChoreDue("ONEOFF", null)).toBe(true);
    expect(isChoreDue("ONEOFF", day(1))).toBe(false);
  });
});
