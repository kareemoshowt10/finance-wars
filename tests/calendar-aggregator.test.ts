import { describe, it, expect } from "vitest";
import { aggregateMonth, projectRecurringIntoRange, monthBounds } from "@/lib/calendar/aggregate";

describe("calendar aggregator", () => {
  it("aggregates transactions inside the month only", () => {
    const result = aggregateMonth({
      month: "2026-03",
      transactions: [
        { id: "t1", amount: 10, type: "expense", description: "Coffee", date: new Date("2026-03-05T12:00:00Z") },
        { id: "t2", amount: 100, type: "income", description: "Bonus", date: new Date("2026-02-28T12:00:00Z") },
        { id: "t3", amount: 50, type: "expense", description: "Lunch", date: new Date("2026-03-30T12:00:00Z") },
      ],
      recurring: [],
      sprints: [],
      duels: [],
      goals: [],
    });
    const txs = result.filter((e) => e.kind === "tx");
    expect(txs.length).toBe(2);
    expect(txs.find((e) => e.id === "t2")).toBeUndefined();
  });

  it("projects MONTHLY recurring forward across boundary", () => {
    const dates = projectRecurringIntoRange(
      { id: "r", amount: 50, type: "expense", description: "Gym", category: "Health", frequency: "MONTHLY", nextRunDate: new Date("2026-01-15"), active: true },
      new Date("2026-04-01"), new Date("2026-05-01"),
    );
    expect(dates.length).toBe(1);
    expect(dates[0].getMonth()).toBe(3); // April
  });

  it("projects WEEKLY recurring multiple times", () => {
    const dates = projectRecurringIntoRange(
      { id: "r", amount: 10, type: "expense", description: "Subway", category: "Transport", frequency: "WEEKLY", nextRunDate: new Date("2026-03-02"), active: true },
      new Date("2026-03-01"), new Date("2026-04-01"),
    );
    expect(dates.length).toBeGreaterThanOrEqual(4);
  });

  it("skips inactive recurring", () => {
    const dates = projectRecurringIntoRange(
      { id: "r", amount: 10, type: "expense", description: "Old", category: "Other", frequency: "MONTHLY", nextRunDate: new Date("2026-03-15"), active: false },
      new Date("2026-03-01"), new Date("2026-04-01"),
    );
    expect(dates.length).toBe(0);
  });

  it("includes sprint open + close + duel end + goal deadline", () => {
    const out = aggregateMonth({
      month: "2026-03",
      transactions: [],
      recurring: [],
      sprints: [{ id: "s1", duelId: "d1", startDate: new Date("2026-03-01"), endDate: new Date("2026-03-08"), weekNumber: 1 }],
      duels: [{ id: "d1", title: "Hawaii", endDate: new Date("2026-03-31") }],
      goals: [{ id: "g1", name: "Emergency", deadline: new Date("2026-03-20") }],
    });
    expect(out.some((e) => e.kind === "sprintOpen")).toBe(true);
    expect(out.some((e) => e.kind === "sprintClose")).toBe(true);
    expect(out.some((e) => e.kind === "duelEnd")).toBe(true);
    expect(out.some((e) => e.kind === "goalDeadline")).toBe(true);
  });

  it("monthBounds returns correct start/end", () => {
    const { start, end } = monthBounds("2026-03");
    expect(start.getMonth()).toBe(2);
    expect(end.getMonth()).toBe(3);
  });
});
