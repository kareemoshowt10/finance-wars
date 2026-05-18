import { describe, it, expect, vi, beforeEach } from "vitest";

const notifCreate = vi.fn();
const budgetFind = vi.fn();
const txFindMany = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    notification: { create: (...a: unknown[]) => notifCreate(...a) },
    budget: { findUnique: (...a: unknown[]) => budgetFind(...a) },
    transaction: { findMany: (...a: unknown[]) => txFindMany(...a) },
  },
}));

import { checkBudgetThresholds, checkGoalMilestones } from "@/lib/notifications";

beforeEach(() => {
  notifCreate.mockReset();
  budgetFind.mockReset();
  txFindMany.mockReset();
});

describe("notifications", () => {
  it("dedupes via unique key (returns false on conflict)", async () => {
    budgetFind.mockResolvedValue({ limit: 100, category: "Food" });
    txFindMany.mockResolvedValue([{ amount: 90 }]);
    notifCreate.mockRejectedValueOnce(new Error("unique"));
    await checkBudgetThresholds("u", "Food");
    expect(notifCreate).toHaveBeenCalled();
  });

  it("emits warning at >=80% and exceeded at >=100%", async () => {
    budgetFind.mockResolvedValue({ limit: 100, category: "Food" });
    txFindMany.mockResolvedValue([{ amount: 85 }]);
    notifCreate.mockResolvedValue({});
    await checkBudgetThresholds("u", "Food");
    expect(notifCreate.mock.calls[0][0].data.kind).toBe("BUDGET_WARNING");

    notifCreate.mockClear();
    txFindMany.mockResolvedValue([{ amount: 120 }]);
    await checkBudgetThresholds("u", "Food");
    expect(notifCreate.mock.calls[0][0].data.kind).toBe("BUDGET_EXCEEDED");
  });

  it("fires milestone when crossing threshold but not when already crossed", async () => {
    notifCreate.mockResolvedValue({});
    await checkGoalMilestones("u", "g1", 200, 600, 1000, "Trip");
    const kinds = notifCreate.mock.calls.map((c) => c[0].data.kind);
    expect(kinds).toContain("GOAL_MILESTONE");

    notifCreate.mockClear();
    await checkGoalMilestones("u", "g1", 600, 700, 1000, "Trip");
    expect(notifCreate).not.toHaveBeenCalled();
  });

  it("does nothing when budget is missing", async () => {
    budgetFind.mockResolvedValue(null);
    await checkBudgetThresholds("u", "Food");
    expect(notifCreate).not.toHaveBeenCalled();
  });
});
