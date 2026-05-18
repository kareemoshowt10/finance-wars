import { describe, it, expect } from "vitest";
import { scoreContribution, round2 } from "@/lib/duels/scoring";

describe("duels scoring", () => {
  it("0-day streak gives no bonus", () => {
    expect(scoreContribution({ amount: 100, streakDays: 0, hitTarget: false, themeMultiplier: 1 })).toBe(100);
  });
  it("1-day streak adds 5%", () => {
    expect(scoreContribution({ amount: 100, streakDays: 1, hitTarget: false, themeMultiplier: 1 })).toBe(105);
  });
  it("5-day streak adds 25%", () => {
    expect(scoreContribution({ amount: 100, streakDays: 5, hitTarget: false, themeMultiplier: 1 })).toBe(125);
  });
  it("10-day streak adds 50%", () => {
    expect(scoreContribution({ amount: 100, streakDays: 10, hitTarget: false, themeMultiplier: 1 })).toBe(150);
  });
  it("15-day streak caps at 50%", () => {
    expect(scoreContribution({ amount: 100, streakDays: 15, hitTarget: false, themeMultiplier: 1 })).toBe(150);
  });
  it("target bonus is 1.2x", () => {
    expect(scoreContribution({ amount: 100, streakDays: 0, hitTarget: true, themeMultiplier: 1 })).toBe(120);
  });
  it("theme multiplier compounds", () => {
    expect(scoreContribution({ amount: 100, streakDays: 0, hitTarget: false, themeMultiplier: 2 })).toBe(200);
  });
  it("combined: streak 10 + target + 1.5x theme", () => {
    // 100 * 1.5 * 1.2 * 1.5 = 270
    expect(scoreContribution({ amount: 100, streakDays: 10, hitTarget: true, themeMultiplier: 1.5 })).toBe(270);
  });
  it("round2", () => {
    expect(round2(1.2345)).toBe(1.23);
    expect(round2(1.235)).toBeCloseTo(1.24, 5);
  });
});
