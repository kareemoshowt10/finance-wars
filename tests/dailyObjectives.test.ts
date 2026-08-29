import { describe, it, expect } from "vitest";
import { buildObjectiveStatuses, allObjectivesDone, dateKey, DAILY_OBJECTIVES } from "@/lib/dailyObjectives";

describe("dailyObjectives", () => {
  it("buildObjectiveStatuses maps each activity flag to its objective", () => {
    const statuses = buildObjectiveStatuses({ choreDone: true, goalCheckin: false, cheered: true });
    expect(statuses).toHaveLength(DAILY_OBJECTIVES.length);
    expect(statuses.find((s) => s.id === "chore")?.done).toBe(true);
    expect(statuses.find((s) => s.id === "goal_checkin")?.done).toBe(false);
    expect(statuses.find((s) => s.id === "cheer")?.done).toBe(true);
  });

  describe("allObjectivesDone", () => {
    it("is true only when every objective is done", () => {
      const all = buildObjectiveStatuses({ choreDone: true, goalCheckin: true, cheered: true });
      expect(allObjectivesDone(all)).toBe(true);
    });

    it("is false if even one is missing", () => {
      const partial = buildObjectiveStatuses({ choreDone: true, goalCheckin: true, cheered: false });
      expect(allObjectivesDone(partial)).toBe(false);
    });

    it("is false for an empty list", () => {
      expect(allObjectivesDone([])).toBe(false);
    });
  });

  it("dateKey formats as YYYY-MM-DD, stable within the same day", () => {
    const morning = new Date(2026, 0, 15, 3, 0, 0);
    expect(dateKey(morning)).toBe("2026-01-15");
  });
});
