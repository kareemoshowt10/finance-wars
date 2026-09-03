import { describe, it, expect } from "vitest";
import {
  computeStreak,
  buildLeaderboard,
  mostFrequentDoer,
  isChoreDue,
  longestStreakEver,
  applyCompletionToLeaderboard,
} from "@/lib/chores";

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

  describe("longestStreakEver — the household's all-time record", () => {
    it("finds the longest run even if it's not the most recent one", () => {
      // 1-2-3 (run of 3), gap, 10-11 (run of 2)
      const dates = [day(1), day(2), day(3), day(10), day(11)];
      expect(longestStreakEver(dates)).toBe(3);
    });

    it("is stable even after the streak has since broken", () => {
      const dates = [day(1), day(2), day(3), day(4), day(5), day(20)];
      expect(longestStreakEver(dates)).toBe(5);
    });

    it("ignores duplicate completions on the same day", () => {
      const dates = [day(1), new Date(2026, 0, 1, 20, 0, 0), day(2)];
      expect(longestStreakEver(dates)).toBe(2);
    });

    it("is 0 for no history and 1 for a single day", () => {
      expect(longestStreakEver([])).toBe(0);
      expect(longestStreakEver([day(5)])).toBe(1);
    });
  });
  describe("applyCompletionToLeaderboard — the optimistic bump", () => {
    const board = [
      { userId: "a", name: "Ada", completions: 5, crowns: 50, xp: 25, rank: 1 },
      { userId: "b", name: "Ben", completions: 4, crowns: 40, xp: 20, rank: 2 },
    ];

    it("adds the completion to the right member and leaves the others alone", () => {
      const next = applyCompletionToLeaderboard(board, "b", "Ben", 10, 5);
      expect(next.find((e) => e.userId === "b")).toMatchObject({ completions: 5, crowns: 50, xp: 25 });
      expect(next.find((e) => e.userId === "a")).toMatchObject({ completions: 5, crowns: 50, xp: 25 });
    });

    it("re-ranks the same way buildLeaderboard does", () => {
      // Ben ties Ada on completions (5) but the tie-break is Crowns, and a
      // 20-Crown chore puts him ahead.
      const next = applyCompletionToLeaderboard(board, "b", "Ben", 20, 5);
      expect(next.map((e) => e.userId)).toEqual(["b", "a"]);
      expect(next.map((e) => e.rank)).toEqual([1, 2]);
    });

    it("agrees with a full rebuild over the same completions", () => {
      const members = [
        { userId: "a", name: "Ada" },
        { userId: "b", name: "Ben" },
      ];
      const history = [
        { userId: "a", crownsAwarded: 10, xpAwarded: 5, completedAt: day(1) },
        { userId: "b", crownsAwarded: 30, xpAwarded: 5, completedAt: day(1) },
      ];
      const rebuilt = buildLeaderboard([...history, { userId: "a", crownsAwarded: 40, xpAwarded: 9, completedAt: day(2) }], members);
      const bumped = applyCompletionToLeaderboard(buildLeaderboard(history, members), "a", "Ada", 40, 9);
      expect(bumped).toEqual(rebuilt);
    });

    it("seats a member who has no row on the board yet", () => {
      const next = applyCompletionToLeaderboard(board, "c", "Cy", 10, 5);
      expect(next).toHaveLength(3);
      expect(next.find((e) => e.userId === "c")).toMatchObject({ name: "Cy", completions: 1, crowns: 10, xp: 5, rank: 3 });
    });

    it("does not mutate the board it was handed", () => {
      const snapshot = JSON.parse(JSON.stringify(board));
      applyCompletionToLeaderboard(board, "b", "Ben", 10, 5);
      expect(board).toEqual(snapshot);
    });
  });
});
