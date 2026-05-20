import { describe, it, expect, vi, beforeEach } from "vitest";

const create = vi.fn();
const aggregate = vi.fn();
const groupBy = vi.fn();
const findMany = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    walletEntry: {
      create: (...a: unknown[]) => create(...a),
      aggregate: (...a: unknown[]) => aggregate(...a),
      groupBy: (...a: unknown[]) => groupBy(...a),
      findMany: (...a: unknown[]) => findMany(...a),
    },
  },
}));

import { award, getBalance, getBalances, computeKarma, spend, REWARDS } from "@/lib/wallet";

beforeEach(() => {
  create.mockReset();
  aggregate.mockReset();
  groupBy.mockReset();
  findMany.mockReset();
});

describe("wallet", () => {
  it("award writes a wallet entry with trunc'd delta", async () => {
    create.mockResolvedValue({ id: "w1" });
    await award({ userId: "u1", currency: "TP", delta: 25.7, reason: "CONFESSION_HONEST" });
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: "u1", currency: "TP", delta: 25, reason: "CONFESSION_HONEST" }),
    });
  });

  it("award returns null and no-ops when delta is 0", async () => {
    const result = await award({ userId: "u1", currency: "TP", delta: 0, reason: "PARTNER_VERIFY" });
    expect(result).toBeNull();
    expect(create).not.toHaveBeenCalled();
  });

  it("getBalance sums deltas for a currency", async () => {
    aggregate.mockResolvedValue({ _sum: { delta: 47 } });
    const b = await getBalance("u1", "TP");
    expect(b).toBe(47);
  });

  it("getBalance returns 0 when no entries", async () => {
    aggregate.mockResolvedValue({ _sum: { delta: null } });
    const b = await getBalance("u1", "SC");
    expect(b).toBe(0);
  });

  it("getBalances groups currencies and derives KARMA", async () => {
    groupBy.mockResolvedValue([
      { currency: "TP", _sum: { delta: 100 } },
      { currency: "SC", _sum: { delta: 50 } },
      { currency: "SHARD", _sum: { delta: 10 } },
    ]);
    const b = await getBalances("u1");
    expect(b.TP).toBe(100);
    expect(b.SC).toBe(50);
    expect(b.SHARD).toBe(10);
    expect(b.KARMA).toBe(computeKarma(b));
    expect(b.KARMA).toBe(175); // 100*1.5 + 50*0.5
  });

  it("computeKarma floors at 0 even with negative TP", () => {
    const k = computeKarma({ TP: -100, SC: 0, SHARD: 0, KARMA: 0 });
    expect(k).toBe(0);
  });

  it("spend rejects when balance is insufficient", async () => {
    aggregate.mockResolvedValue({ _sum: { delta: 5 } });
    await expect(spend("u1", "TP", 50, { refType: "x", refId: "y" })).rejects.toThrow("INSUFFICIENT_BALANCE");
    expect(create).not.toHaveBeenCalled();
  });

  it("spend writes a negative entry when balance is sufficient", async () => {
    aggregate.mockResolvedValue({ _sum: { delta: 100 } });
    create.mockResolvedValue({ id: "w2" });
    await spend("u1", "TP", 30, { refType: "MarketplaceItem", refId: "i1" });
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({ delta: -30, reason: "MARKETPLACE_SPEND", currency: "TP" }),
    });
  });

  it("spend rejects zero or negative cost", async () => {
    await expect(spend("u1", "TP", 0, { refType: "x", refId: "y" })).rejects.toThrow("Cost must be positive");
    await expect(spend("u1", "TP", -5, { refType: "x", refId: "y" })).rejects.toThrow("Cost must be positive");
  });

  it("REWARDS constants are sane and non-negative for positive actions", () => {
    expect(REWARDS.CONFESSION_HONEST).toBeGreaterThan(0);
    expect(REWARDS.PARTNER_VERIFY).toBeGreaterThan(0);
    expect(REWARDS.PACT_KEPT).toBeGreaterThan(0);
    expect(REWARDS.PACT_BROKEN).toBeLessThan(0);
    expect(REWARDS.REFERRAL).toBeGreaterThan(REWARDS.CHEER_GIVEN);
  });
});
