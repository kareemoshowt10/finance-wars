import { describe, it, expect } from "vitest";
import { generateInviteCode, computeQuestProgress, isQuestComplete } from "@/lib/squad";

describe("squad", () => {
  it("generateInviteCode produces unambiguous uppercase codes of requested length", () => {
    for (let i = 0; i < 50; i++) {
      const c = generateInviteCode(8);
      expect(c).toHaveLength(8);
      expect(c).toMatch(/^[A-Z2-9]+$/);
      expect(c).not.toMatch(/[01ILO]/);
    }
  });

  it("computeQuestProgress sums contributions per user", () => {
    const members = [
      { userId: "u1", user: { name: "Alice" } },
      { userId: "u2", user: { name: "Bob" } },
    ];
    const contributions = [
      { userId: "u1", amount: 200, user: { name: "Alice" } },
      { userId: "u1", amount: 100, user: { name: "Alice" } },
      { userId: "u2", amount: 50, user: { name: "Bob" } },
    ];
    const p = computeQuestProgress(1000, contributions, members);
    expect(p.total).toBe(350);
    expect(p.pct).toBeCloseTo(35);
    expect(p.perUser[0]).toEqual({ userId: "u1", name: "Alice", amount: 300, pct: 30 });
    expect(p.perUser[1].amount).toBe(50);
    expect(p.leader?.userId).toBe("u1");
  });

  it("computeQuestProgress caps total pct at 100", () => {
    const p = computeQuestProgress(100, [{ userId: "u1", amount: 500 }], [{ userId: "u1" }]);
    expect(p.pct).toBe(100);
  });

  it("computeQuestProgress returns null leader when no contributions", () => {
    const p = computeQuestProgress(1000, [], [{ userId: "u1" }, { userId: "u2" }]);
    expect(p.leader).toBeNull();
    expect(p.perUser).toHaveLength(2);
  });

  it("isQuestComplete: COOP needs total >= target", () => {
    const p = computeQuestProgress(1000, [
      { userId: "u1", amount: 600 },
      { userId: "u2", amount: 400 },
    ], [{ userId: "u1" }, { userId: "u2" }]);
    expect(isQuestComplete("COOP", p)).toBe(true);
  });

  it("isQuestComplete: COOP not done if total below target", () => {
    const p = computeQuestProgress(1000, [{ userId: "u1", amount: 999 }], [{ userId: "u1" }]);
    expect(isQuestComplete("COOP", p)).toBe(false);
  });

  it("isQuestComplete: RACE requires one user to hit target solo", () => {
    const p = computeQuestProgress(1000, [
      { userId: "u1", amount: 500 },
      { userId: "u2", amount: 500 },
    ], [{ userId: "u1" }, { userId: "u2" }]);
    expect(isQuestComplete("RACE", p)).toBe(false);

    const p2 = computeQuestProgress(1000, [
      { userId: "u1", amount: 1000 },
      { userId: "u2", amount: 200 },
    ], [{ userId: "u1" }, { userId: "u2" }]);
    expect(isQuestComplete("RACE", p2)).toBe(true);
  });

  it("computeQuestProgress includes members with no contributions", () => {
    const p = computeQuestProgress(500, [{ userId: "u1", amount: 100 }], [
      { userId: "u1" },
      { userId: "u2" },
    ]);
    expect(p.perUser).toHaveLength(2);
    expect(p.perUser.find((u) => u.userId === "u2")?.amount).toBe(0);
  });
});
