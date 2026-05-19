import { describe, it, expect } from "vitest";
import { combinedPoints, sprintHit, progressPct, perPlayerBreakdown, defaultSprintTarget } from "@/lib/duels/coop";

const P1 = "p1";
const P2 = "p2";

describe("coop scoring", () => {
  it("combinedPoints sums both players' contributions", () => {
    expect(combinedPoints([
      { playerId: P1, amount: 50 },
      { playerId: P2, amount: 75 },
    ])).toBe(125);
  });
  it("ignores PENDING / CONCEDED contributions", () => {
    expect(combinedPoints([
      { playerId: P1, amount: 100 },
      { playerId: P2, amount: 50, disputeStatus: "PENDING" },
      { playerId: P2, amount: 50, disputeStatus: "CONCEDED" },
    ])).toBe(100);
  });
  it("sprintHit true when combined >= target", () => {
    expect(sprintHit([
      { playerId: P1, amount: 600 },
      { playerId: P2, amount: 400 },
    ], 1000)).toBe(true);
    expect(sprintHit([
      { playerId: P1, amount: 600 },
      { playerId: P2, amount: 300 },
    ], 1000)).toBe(false);
  });
  it("progressPct caps at 100%", () => {
    expect(progressPct([{ playerId: P1, amount: 2000 }], 1000)).toBe(100);
    expect(progressPct([{ playerId: P1, amount: 250 }], 1000)).toBe(25);
  });
  it("perPlayerBreakdown returns per-player totals", () => {
    const out = perPlayerBreakdown([
      { playerId: P1, amount: 30 },
      { playerId: P1, amount: 20 },
      { playerId: P2, amount: 40 },
    ]);
    expect(out[P1]).toBe(50);
    expect(out[P2]).toBe(40);
  });
  it("defaultSprintTarget divides goal across sprints", () => {
    expect(defaultSprintTarget(20000, 6)).toBeCloseTo(3333.33, 2);
    expect(defaultSprintTarget(1000, 0)).toBe(1000);
  });
});
