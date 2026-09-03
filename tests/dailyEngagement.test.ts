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
const householdFindUnique = vi.fn();

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
    household: { findUnique: (...a: unknown[]) => householdFindUnique(...a) },
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
  householdFindUnique.mockReset().mockResolvedValue({ timezone: "UTC" });
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

  describe("timezone awareness", () => {
    it("scopes the household streak to the household's own zone", async () => {
      // Three consecutive LA evenings. In UTC each of these lands on the
      // *following* calendar day, but they're still 3 consecutive local days.
      choreCompletionFindMany.mockResolvedValue([
        { completedAt: new Date("2026-01-06T02:00:00Z") }, // Jan 5, 6pm LA
        { completedAt: new Date("2026-01-07T02:00:00Z") }, // Jan 6, 6pm LA
        { completedAt: new Date("2026-01-08T02:00:00Z") }, // Jan 7, 6pm LA
      ]);
      householdFindUnique.mockResolvedValue({ timezone: "America/Los_Angeles" });

      const streak = await getHouseholdStreak("hh1", new Date("2026-01-08T03:00:00Z"));
      expect(streak).toEqual({ current: 3, longest: 3 });
    });

    it("counts a late-evening local chore as today, not tomorrow", async () => {
      // 2026-01-06T02:00Z is 6pm on Jan 5 in LA. Asked "was there activity
      // today?" at 7pm on Jan 5 local, the answer must be yes — which means
      // the query floor has to be LA midnight (08:00Z), not UTC midnight.
      householdFindUnique.mockResolvedValue({ timezone: "America/Los_Angeles" });
      choreCompletionCount.mockResolvedValue(1);

      await hasHouseholdActivityToday("hh1", new Date("2026-01-06T03:00:00Z"));

      const where = choreCompletionCount.mock.calls[0][0].where;
      expect(where.completedAt.gte.toISOString()).toBe("2026-01-05T08:00:00.000Z");
    });

    it("falls back to UTC when the stored zone is unusable", async () => {
      householdFindUnique.mockResolvedValue({ timezone: "Mars/Olympus" });
      choreCompletionCount.mockResolvedValue(0);

      await hasHouseholdActivityToday("hh1", new Date("2026-01-06T03:00:00Z"));

      const where = choreCompletionCount.mock.calls[0][0].where;
      expect(where.completedAt.gte.toISOString()).toBe("2026-01-06T00:00:00.000Z");
    });

    it("resets the daily bonus at local midnight, so the ref id is zone-scoped", async () => {
      householdFindUnique.mockResolvedValue({ timezone: "America/Los_Angeles" });
      walletEntryFindFirst.mockResolvedValue(null);

      // 6pm Jan 5 in LA — still the 5th locally, already the 6th in UTC.
      await hasBonusToday("u1", "hh1", new Date("2026-01-06T02:00:00Z"));

      expect(walletEntryFindFirst.mock.calls[0][0].where.refId).toBe("hh1:2026-01-05");
    });
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
