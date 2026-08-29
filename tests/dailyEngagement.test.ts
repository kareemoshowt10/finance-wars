import { describe, it, expect, vi, beforeEach } from "vitest";

const choreCompletionFindMany = vi.fn();
const choreCompletionCount = vi.fn();
const contributionCount = vi.fn();
const voteCount = vi.fn();
const cheerCount = vi.fn();
const walletEntryFindFirst = vi.fn();
const walletEntryCount = vi.fn();
const walletEntryCreate = vi.fn();
const userUpdate = vi.fn();
const notificationCreate = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    choreCompletion: {
      findMany: (...a: unknown[]) => choreCompletionFindMany(...a),
      count: (...a: unknown[]) => choreCompletionCount(...a),
    },
    householdGoalContribution: { count: (...a: unknown[]) => contributionCount(...a) },
    householdGoalVote: { count: (...a: unknown[]) => voteCount(...a) },
    householdCheer: { count: (...a: unknown[]) => cheerCount(...a) },
    walletEntry: {
      findFirst: (...a: unknown[]) => walletEntryFindFirst(...a),
      count: (...a: unknown[]) => walletEntryCount(...a),
      create: (...a: unknown[]) => walletEntryCreate(...a),
    },
    user: { update: (...a: unknown[]) => userUpdate(...a) },
    notification: { create: (...a: unknown[]) => notificationCreate(...a) },
  },
}));

vi.mock("@/lib/achievements/engine", () => ({ evaluate: vi.fn() }));

import {
  getHouseholdStreak,
  hasHouseholdActivityToday,
  getDailyObjectiveStatuses,
  hasBonusToday,
  maybeAwardDailyBonus,
} from "@/lib/dailyEngagement";

beforeEach(() => {
  choreCompletionFindMany.mockReset();
  choreCompletionCount.mockReset();
  contributionCount.mockReset();
  voteCount.mockReset();
  cheerCount.mockReset();
  walletEntryFindFirst.mockReset();
  walletEntryCount.mockReset();
  walletEntryCreate.mockReset().mockResolvedValue({ id: "w1" });
  userUpdate.mockReset().mockResolvedValue({});
  notificationCreate.mockReset().mockResolvedValue({});
});

const day = (n: number) => new Date(2026, 0, n, 12, 0, 0);

describe("dailyEngagement", () => {
  it("getHouseholdStreak derives current + longest from ChoreCompletion history", async () => {
    choreCompletionFindMany.mockResolvedValue([{ completedAt: day(1) }, { completedAt: day(2) }, { completedAt: day(3) }]);
    const streak = await getHouseholdStreak("hh1", day(3));
    expect(streak).toEqual({ current: 3, longest: 3 });
  });

  it("hasHouseholdActivityToday reflects whether any chore was logged today", async () => {
    choreCompletionCount.mockResolvedValue(0);
    expect(await hasHouseholdActivityToday("hh1")).toBe(false);
    choreCompletionCount.mockResolvedValue(2);
    expect(await hasHouseholdActivityToday("hh1")).toBe(true);
  });

  it("getDailyObjectiveStatuses combines contribution + vote counts into a single 'goal_checkin'", async () => {
    choreCompletionCount.mockResolvedValue(1);
    contributionCount.mockResolvedValue(0);
    voteCount.mockResolvedValue(1);
    cheerCount.mockResolvedValue(0);
    const statuses = await getDailyObjectiveStatuses("hh1", "u1");
    expect(statuses.find((s) => s.id === "chore")?.done).toBe(true);
    expect(statuses.find((s) => s.id === "goal_checkin")?.done).toBe(true);
    expect(statuses.find((s) => s.id === "cheer")?.done).toBe(false);
  });

  it("hasBonusToday checks for an existing DAILY_BONUS wallet entry", async () => {
    walletEntryFindFirst.mockResolvedValue(null);
    expect(await hasBonusToday("u1", "hh1")).toBe(false);
    walletEntryFindFirst.mockResolvedValue({ id: "w1" });
    expect(await hasBonusToday("u1", "hh1")).toBe(true);
  });

  describe("maybeAwardDailyBonus", () => {
    it("does nothing if the bonus was already claimed today", async () => {
      walletEntryFindFirst.mockResolvedValue({ id: "already" });
      const result = await maybeAwardDailyBonus("hh1", "u1");
      expect(result).toBe(false);
      expect(walletEntryCreate).not.toHaveBeenCalled();
    });

    it("does nothing if objectives aren't all done yet", async () => {
      walletEntryFindFirst.mockResolvedValue(null);
      choreCompletionCount.mockResolvedValue(1);
      contributionCount.mockResolvedValue(0);
      voteCount.mockResolvedValue(0);
      cheerCount.mockResolvedValue(0); // cheer objective incomplete
      const result = await maybeAwardDailyBonus("hh1", "u1");
      expect(result).toBe(false);
      expect(walletEntryCreate).not.toHaveBeenCalled();
    });

    it("awards Crowns + XP and notifies once all three objectives are done", async () => {
      walletEntryFindFirst.mockResolvedValue(null);
      choreCompletionCount.mockResolvedValue(1);
      contributionCount.mockResolvedValue(1);
      voteCount.mockResolvedValue(0);
      cheerCount.mockResolvedValue(1);
      walletEntryCount.mockResolvedValue(1);

      const result = await maybeAwardDailyBonus("hh1", "u1");
      expect(result).toBe(true);
      expect(walletEntryCreate).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ userId: "u1", currency: "CROWNS", reason: "DAILY_BONUS" }) })
      );
      expect(userUpdate).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "u1" } }));
      expect(notificationCreate).toHaveBeenCalled();
    });
  });
});
