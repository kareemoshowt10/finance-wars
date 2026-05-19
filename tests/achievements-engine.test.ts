import { describe, it, expect, vi, beforeEach } from "vitest";

const userAchievementCreate = vi.fn();
const userAchievementFindUnique = vi.fn();
const userUpdate = vi.fn();
const notificationCreate = vi.fn();
const txCount = vi.fn();
const accountFindMany = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    userAchievement: {
      create: (...a: unknown[]) => userAchievementCreate(...a),
      findUnique: (...a: unknown[]) => userAchievementFindUnique(...a),
    },
    user: { update: (...a: unknown[]) => userUpdate(...a) },
    notification: { create: (...a: unknown[]) => notificationCreate(...a) },
    transaction: { count: (...a: unknown[]) => txCount(...a) },
    account: { findMany: (...a: unknown[]) => accountFindMany(...a) },
  },
}));

import { evaluate } from "@/lib/achievements/engine";
import { levelFromXp } from "@/lib/achievements/catalog";

beforeEach(() => {
  userAchievementCreate.mockReset();
  userAchievementFindUnique.mockReset();
  userUpdate.mockReset();
  notificationCreate.mockReset();
  txCount.mockReset();
  accountFindMany.mockReset();
  userAchievementCreate.mockResolvedValue({});
  userUpdate.mockResolvedValue({});
  notificationCreate.mockResolvedValue({});
});

describe("achievement engine", () => {
  it("unlocks first-account on first account creation", async () => {
    userAchievementFindUnique.mockResolvedValue(null);
    accountFindMany.mockResolvedValue([{ type: "checking" }]);
    await evaluate("u1", { type: "account-created" });
    const slugs = userAchievementCreate.mock.calls.map((c) => (c[0] as { data: { achievementSlug: string } }).data.achievementSlug);
    expect(slugs).toContain("first-account");
  });

  it("is idempotent — does not unlock the same achievement twice", async () => {
    userAchievementFindUnique.mockResolvedValue({ completed: true, achievementSlug: "first-account" });
    accountFindMany.mockResolvedValue([{ type: "checking" }]);
    await evaluate("u1", { type: "account-created" });
    expect(userAchievementCreate).not.toHaveBeenCalled();
  });

  it("unlocks ten-tx when count is exactly 10", async () => {
    userAchievementFindUnique.mockResolvedValue(null);
    txCount.mockResolvedValue(10);
    await evaluate("u1", { type: "tx-created" });
    const slugs = userAchievementCreate.mock.calls.map((c) => (c[0] as { data: { achievementSlug: string } }).data.achievementSlug);
    expect(slugs).toContain("ten-tx");
    expect(slugs).toContain("first-transaction");
  });

  it("login streak unlocks streak-7 at 7, streak-30 at 30", async () => {
    userAchievementFindUnique.mockResolvedValue(null);
    await evaluate("u1", { type: "login-streak", streak: 7 });
    let slugs = userAchievementCreate.mock.calls.map((c) => (c[0] as { data: { achievementSlug: string } }).data.achievementSlug);
    expect(slugs).toContain("streak-7");
    expect(slugs).not.toContain("streak-30");

    userAchievementCreate.mockClear();
    await evaluate("u1", { type: "login-streak", streak: 30 });
    slugs = userAchievementCreate.mock.calls.map((c) => (c[0] as { data: { achievementSlug: string } }).data.achievementSlug);
    expect(slugs).toContain("streak-7");
    expect(slugs).toContain("streak-30");
  });

  it("level math: floor(sqrt(xp/100))", () => {
    expect(levelFromXp(0).level).toBe(0);
    expect(levelFromXp(99).level).toBe(0);
    expect(levelFromXp(100).level).toBe(1);
    expect(levelFromXp(400).level).toBe(2);
    expect(levelFromXp(900).level).toBe(3);
    expect(levelFromXp(10_000).level).toBe(10);
  });

  it("level caps at 50", () => {
    const huge = levelFromXp(10_000_000);
    expect(huge.level).toBe(50);
    expect(huge.capped).toBe(true);
  });
});
