import { describe, it, expect, vi, beforeEach } from "vitest";

let store: Record<string, { symbol: string; price: number; asOf: Date } | null> = {};

const findUnique = vi.fn(({ where }: { where: { symbol: string } }) => Promise.resolve(store[where.symbol] || null));
const upsert = vi.fn(({ where, create, update }: { where: { symbol: string }; create: { symbol: string; price: number; asOf: Date }; update: { price: number; asOf: Date } }) => {
  const existing = store[where.symbol];
  const merged = existing ? { ...existing, ...update } : create;
  store[where.symbol] = merged;
  return Promise.resolve(merged);
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    priceQuote: {
      findUnique: (...a: unknown[]) => findUnique(...(a as [{ where: { symbol: string } }])),
      upsert: (...a: unknown[]) => upsert(...(a as [{ where: { symbol: string }; create: { symbol: string; price: number; asOf: Date }; update: { price: number; asOf: Date } }])),
    },
  },
}));

import { getQuote } from "@/lib/prices";

beforeEach(() => {
  store = {};
  findUnique.mockClear();
  upsert.mockClear();
});

describe("prices", () => {
  it("returns deterministic per-day price for a symbol", async () => {
    const a = await getQuote("AAPL");
    store = {};
    const b = await getQuote("AAPL");
    expect(a.price).toBe(b.price);
  });

  it("different symbols give different prices", async () => {
    const a = await getQuote("AAPL");
    store = {};
    const b = await getQuote("TSLA");
    expect(a.price).not.toBe(b.price);
  });

  it("hits cache when asOf within 1h (no upsert)", async () => {
    store["AAPL"] = { symbol: "AAPL", price: 123.45, asOf: new Date() };
    await getQuote("AAPL");
    expect(upsert).not.toHaveBeenCalled();
  });

  it("refreshes when older than 1h", async () => {
    const old = new Date(Date.now() - 2 * 3600_000);
    store["AAPL"] = { symbol: "AAPL", price: 1, asOf: old };
    await getQuote("AAPL");
    expect(upsert).toHaveBeenCalled();
  });
});
