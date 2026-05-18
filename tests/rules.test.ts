import { describe, it, expect, vi, beforeEach } from "vitest";

const findManyMock = vi.fn();
const txFindManyMock = vi.fn();
const txUpdateMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    rule: { findMany: (...args: unknown[]) => findManyMock(...args) },
    transaction: {
      findMany: (...args: unknown[]) => txFindManyMock(...args),
      update: (...args: unknown[]) => txUpdateMock(...args),
    },
  },
}));

import { applyRules, applyRulesToAll } from "@/lib/rules";

beforeEach(() => {
  findManyMock.mockReset();
  txFindManyMock.mockReset();
  txUpdateMock.mockReset();
});

describe("applyRules", () => {
  it("returns null when no rules match", async () => {
    findManyMock.mockResolvedValue([]);
    const m = await applyRules("u", { description: "Coffee" });
    expect(m).toBeNull();
  });

  it("matches case-insensitively on substring", async () => {
    findManyMock.mockResolvedValue([
      { id: "r1", pattern: "SPOTIFY", categoryOut: "Subscriptions", autoTag: null, accountId: null },
    ]);
    const m = await applyRules("u", { description: "spotify premium" });
    expect(m).not.toBeNull();
    expect(m!.category).toBe("Subscriptions");
  });

  it("picks the first rule (highest priority via orderBy)", async () => {
    findManyMock.mockResolvedValue([
      { id: "r1", pattern: "uber", categoryOut: "Transport", autoTag: null, accountId: null },
      { id: "r2", pattern: "uber", categoryOut: "Food", autoTag: null, accountId: null },
    ]);
    const m = await applyRules("u", { description: "Uber Eats" });
    expect(m!.category).toBe("Transport");
  });

  it("respects accountId scope", async () => {
    findManyMock.mockResolvedValue([
      { id: "r1", pattern: "rent", categoryOut: "Rent", autoTag: null, accountId: "acct-other" },
    ]);
    const m = await applyRules("u", { description: "Rent payment", accountId: "acct-mine" });
    expect(m).toBeNull();
  });

  it("backfills transactions when category differs", async () => {
    findManyMock.mockResolvedValue([
      { id: "r1", pattern: "spotify", categoryOut: "Subscriptions", autoTag: null, accountId: null },
    ]);
    txFindManyMock.mockResolvedValue([
      { id: "t1", description: "Spotify", category: "Other", accountId: "a" },
      { id: "t2", description: "Coffee", category: "Food", accountId: "a" },
    ]);
    txUpdateMock.mockResolvedValue({});
    const res = await applyRulesToAll("u");
    expect(res.updated).toBe(1);
    expect(res.total).toBe(2);
  });
});
