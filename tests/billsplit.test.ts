import { describe, it, expect } from "vitest";
import { computeShares, suggestSettlement, type Member } from "@/lib/billsplit";

const A = "userA";
const B = "userB";
const C = "userC";
const TWO: Member[] = [{ userId: A }, { userId: B }];
const THREE: Member[] = [{ userId: A }, { userId: B }, { userId: C }];

describe("computeShares — EQUAL", () => {
  it("splits evenly between two members", () => {
    const s = computeShares("EQUAL", {}, TWO);
    expect(s.find((x) => x.userId === A)!.share).toBeCloseTo(0.5);
    expect(s.find((x) => x.userId === B)!.share).toBeCloseTo(0.5);
  });
  it("splits evenly between three members", () => {
    const s = computeShares("EQUAL", {}, THREE);
    for (const m of s) expect(m.share).toBeCloseTo(1 / 3, 5);
  });
});

describe("computeShares — PERCENT / FIXED", () => {
  it("PERCENT honors configured weights and normalizes", () => {
    const s = computeShares("PERCENT", { [A]: 60, [B]: 40 }, TWO);
    expect(s.find((x) => x.userId === A)!.share).toBeCloseTo(0.6);
    expect(s.find((x) => x.userId === B)!.share).toBeCloseTo(0.4);
  });
  it("FIXED with $60/$40 yields 60/40 shares", () => {
    const s = computeShares("FIXED", { [A]: 60, [B]: 40 }, TWO);
    expect(s.find((x) => x.userId === A)!.share).toBeCloseTo(0.6);
    expect(s.find((x) => x.userId === B)!.share).toBeCloseTo(0.4);
  });
  it("PERCENT falls back to equal when all weights zero", () => {
    const s = computeShares("PERCENT", { [A]: 0, [B]: 0 }, TWO);
    expect(s.find((x) => x.userId === A)!.share).toBeCloseTo(0.5);
  });
});

describe("computeShares — INCOME_RATIO", () => {
  it("splits proportional to income", () => {
    const s = computeShares("INCOME_RATIO", {}, TWO, { [A]: 6000, [B]: 4000 });
    expect(s.find((x) => x.userId === A)!.share).toBeCloseTo(0.6);
    expect(s.find((x) => x.userId === B)!.share).toBeCloseTo(0.4);
  });
  it("falls back to equal when all incomes zero", () => {
    const s = computeShares("INCOME_RATIO", {}, TWO, { [A]: 0, [B]: 0 });
    expect(s.find((x) => x.userId === A)!.share).toBeCloseTo(0.5);
  });
  it("falls back to equal when incomes missing", () => {
    const s = computeShares("INCOME_RATIO", {}, TWO);
    expect(s.find((x) => x.userId === A)!.share).toBeCloseTo(0.5);
  });
});

describe("suggestSettlement", () => {
  it("returns null when balances are square", () => {
    const r = suggestSettlement([{ userId: A, net: 0 }, { userId: B, net: 0 }]);
    expect(r).toBeNull();
  });
  it("returns null with single member", () => {
    const r = suggestSettlement([{ userId: A, net: 100 }]);
    expect(r).toBeNull();
  });
  it("identifies debtor → creditor in 2-person case", () => {
    const r = suggestSettlement([{ userId: A, net: 340 }, { userId: B, net: -340 }]);
    expect(r).toEqual({ from: B, to: A, amount: 340 });
  });
  it("returns the largest debtor-creditor pair in 3-person case", () => {
    const r = suggestSettlement([
      { userId: A, net: 500 },
      { userId: B, net: -200 },
      { userId: C, net: -300 },
    ]);
    expect(r).not.toBeNull();
    expect(r!.from).toBe(C);
    expect(r!.to).toBe(A);
    expect(r!.amount).toBe(300);
  });
  it("ignores tiny rounding noise (< $0.01)", () => {
    const r = suggestSettlement([{ userId: A, net: 0.001 }, { userId: B, net: -0.001 }]);
    expect(r).toBeNull();
  });
  it("rounds the suggested amount to cents", () => {
    const r = suggestSettlement([{ userId: A, net: 12.345 }, { userId: B, net: -12.345 }]);
    expect(r!.amount).toBe(12.35);
  });
});
