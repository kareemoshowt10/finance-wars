import { describe, it, expect, vi, beforeEach } from "vitest";

const memberFindMany = vi.fn();
const accountFindMany = vi.fn();
const shareFindMany = vi.fn();
const txFindMany = vi.fn();
const goalFindMany = vi.fn();
const reviewCount = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    householdMember: { findMany: (...a: unknown[]) => memberFindMany(...a) },
    account: { findMany: (...a: unknown[]) => accountFindMany(...a) },
    accountShare: { findMany: (...a: unknown[]) => shareFindMany(...a) },
    transaction: { findMany: (...a: unknown[]) => txFindMany(...a) },
    goal: { findMany: (...a: unknown[]) => goalFindMany(...a) },
    purchaseReview: { count: (...a: unknown[]) => reviewCount(...a) },
  },
}));

import { getSharedView } from "@/lib/sharing";

beforeEach(() => {
  memberFindMany.mockReset();
  accountFindMany.mockReset();
  shareFindMany.mockReset();
  txFindMany.mockReset();
  goalFindMany.mockReset();
  reviewCount.mockReset();

  memberFindMany.mockResolvedValue([
    { userId: "u1", user: { id: "u1", name: "Alex", email: "a@x.com" } },
    { userId: "u2", user: { id: "u2", name: "Sam", email: "s@x.com" } },
  ]);
  goalFindMany.mockResolvedValue([]);
  reviewCount.mockResolvedValue(0);
  txFindMany.mockResolvedValue([]);
});

describe("getSharedView", () => {
  it("self always sees own accounts as FULL", async () => {
    accountFindMany.mockResolvedValue([
      { id: "a1", userId: "u1", name: "Checking", type: "checking", balance: 100 },
    ]);
    shareFindMany.mockResolvedValue([]);
    const v = await getSharedView("u1", "h1");
    expect(v.accounts).toHaveLength(1);
    expect(v.accounts[0].level).toBe("FULL");
    expect(v.accounts[0].isSelf).toBe(true);
  });

  it("HIDDEN accounts of partner are omitted", async () => {
    accountFindMany.mockResolvedValue([
      { id: "a2", userId: "u2", name: "Partner Secret", type: "checking", balance: 999 },
    ]);
    shareFindMany.mockResolvedValue([{ accountId: "a2", level: "HIDDEN" }]);
    const v = await getSharedView("u1", "h1");
    expect(v.accounts).toHaveLength(0);
  });

  it("BALANCE shows partner balance only, no transactions", async () => {
    accountFindMany.mockResolvedValue([
      { id: "a2", userId: "u2", name: "Partner Checking", type: "checking", balance: 500 },
    ]);
    shareFindMany.mockResolvedValue([{ accountId: "a2", level: "BALANCE" }]);
    const v = await getSharedView("u1", "h1");
    expect(v.accounts).toHaveLength(1);
    expect(v.accounts[0].level).toBe("BALANCE");
    // No transactions exposed when no FULL acct ids
    expect(v.transactions).toHaveLength(0);
  });

  it("FULL exposes partner transactions", async () => {
    accountFindMany.mockResolvedValue([
      { id: "a2", userId: "u2", name: "Joint", type: "checking", balance: 200 },
    ]);
    shareFindMany.mockResolvedValue([{ accountId: "a2", level: "FULL" }]);
    txFindMany.mockResolvedValue([{
      id: "t1", accountId: "a2", amount: 50, type: "expense", category: "Food",
      description: "Dinner", date: new Date(), userId: "u2", pending: false,
    }]);
    const v = await getSharedView("u1", "h1");
    expect(v.accounts[0].level).toBe("FULL");
    expect(txFindMany).toHaveBeenCalled();
  });

  it("computes net worth (credit subtracts)", async () => {
    accountFindMany.mockResolvedValue([
      { id: "a1", userId: "u1", name: "C", type: "checking", balance: 1000 },
      { id: "a2", userId: "u1", name: "Cr", type: "credit", balance: 200 },
    ]);
    shareFindMany.mockResolvedValue([]);
    const v = await getSharedView("u1", "h1");
    expect(v.netWorth).toBe(800);
  });

  it("savings rate uses month-window income/spend", async () => {
    accountFindMany.mockResolvedValue([
      { id: "a1", userId: "u1", name: "C", type: "checking", balance: 100 },
    ]);
    shareFindMany.mockResolvedValue([]);
    // First call returns the recent 200 (transactions display). Second call returns month txs.
    txFindMany.mockResolvedValueOnce([]).mockResolvedValueOnce([
      { id: "t1", accountId: "a1", amount: 1000, type: "income", category: "Salary", description: "", date: new Date(), userId: "u1", pending: false },
      { id: "t2", accountId: "a1", amount: 600, type: "expense", category: "Food", description: "", date: new Date(), userId: "u1", pending: false },
    ]);
    const v = await getSharedView("u1", "h1");
    expect(v.monthIncome).toBe(1000);
    expect(v.monthSpend).toBe(600);
    expect(v.savingsRate).toBe(40);
  });
});
