import { describe, it, expect } from "vitest";
import {
  dayKey,
  hourInZone,
  addDays,
  weekdayOf,
  weekStartKey,
  daysBetween,
  startOfDayInstant,
  startOfToday,
  isValidTimeZone,
} from "@/lib/time";

describe("time", () => {
  describe("dayKey", () => {
    it("puts one instant on different calendar days depending on the zone", () => {
      // 2026-03-10T02:00Z — still the evening of the 9th in Los Angeles.
      const d = new Date("2026-03-10T02:00:00Z");
      expect(dayKey(d, "UTC")).toBe("2026-03-10");
      expect(dayKey(d, "America/Los_Angeles")).toBe("2026-03-09");
      expect(dayKey(d, "Asia/Tokyo")).toBe("2026-03-10");
    });

    it("this is the whole point: a 5pm-local chore counts as today, not tomorrow", () => {
      // 2026-01-05 17:00 in LA is 2026-01-06 01:00 UTC. Server-local (UTC)
      // bucketing would file it under the 6th; the household's zone says the 5th.
      const evening = new Date("2026-01-06T01:00:00Z");
      expect(dayKey(evening, "UTC")).toBe("2026-01-06");
      expect(dayKey(evening, "America/Los_Angeles")).toBe("2026-01-05");
    });

    it("falls back to UTC for an unrecognised zone instead of throwing", () => {
      const d = new Date("2026-03-10T02:00:00Z");
      expect(dayKey(d, "Not/AZone")).toBe("2026-03-10");
    });
  });

  it("hourInZone reads the local wall clock", () => {
    const d = new Date("2026-01-06T01:00:00Z");
    expect(hourInZone(d, "UTC")).toBe(1);
    expect(hourInZone(d, "America/Los_Angeles")).toBe(17);
  });

  describe("addDays", () => {
    it("steps whole calendar days", () => {
      expect(addDays("2026-01-05", 1)).toBe("2026-01-06");
      expect(addDays("2026-01-05", -1)).toBe("2026-01-04");
    });

    it("crosses month and year boundaries", () => {
      expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
      expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
      expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
    });

    it("handles a leap day", () => {
      expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
      expect(addDays("2028-02-29", 1)).toBe("2028-03-01");
    });

    it("steps cleanly across a US spring-forward date (the 23-hour day)", () => {
      // A naive "subtract 86400000ms from local midnight" would land back on
      // the 8th here; calendar stepping does not.
      expect(addDays("2026-03-08", 1)).toBe("2026-03-09");
      expect(addDays("2026-03-09", -1)).toBe("2026-03-08");
    });
  });

  it("weekdayOf / weekStartKey resolve the containing week", () => {
    expect(weekdayOf("2026-01-08")).toBe(4); // Thursday
    expect(weekStartKey("2026-01-08")).toBe("2026-01-04"); // the Sunday before
    expect(weekStartKey("2026-01-04")).toBe("2026-01-04"); // already Sunday
  });

  it("daysBetween counts whole days, including across DST", () => {
    expect(daysBetween("2026-01-05", "2026-01-08")).toBe(3);
    expect(daysBetween("2026-01-08", "2026-01-05")).toBe(-3);
    expect(daysBetween("2026-03-07", "2026-03-10")).toBe(3);
  });

  describe("startOfDayInstant", () => {
    it("resolves local midnight to the right UTC instant (standard time)", () => {
      // LA is UTC-8 in January.
      expect(startOfDayInstant("2026-01-05", "America/Los_Angeles").toISOString()).toBe("2026-01-05T08:00:00.000Z");
    });

    it("resolves local midnight during daylight saving (UTC-7)", () => {
      expect(startOfDayInstant("2026-07-05", "America/Los_Angeles").toISOString()).toBe("2026-07-05T07:00:00.000Z");
    });

    it("resolves the day DST starts, where local midnight is still standard time", () => {
      // US DST starts 2026-03-08; midnight that day is still UTC-8.
      expect(startOfDayInstant("2026-03-08", "America/Los_Angeles").toISOString()).toBe("2026-03-08T08:00:00.000Z");
      // The next day is fully on DST.
      expect(startOfDayInstant("2026-03-09", "America/Los_Angeles").toISOString()).toBe("2026-03-09T07:00:00.000Z");
    });

    it("works for zones ahead of UTC", () => {
      expect(startOfDayInstant("2026-01-05", "Asia/Tokyo").toISOString()).toBe("2026-01-04T15:00:00.000Z");
    });

    it("is a no-op offset for UTC itself", () => {
      expect(startOfDayInstant("2026-01-05", "UTC").toISOString()).toBe("2026-01-05T00:00:00.000Z");
    });
  });

  it("startOfToday brackets the instant it was given", () => {
    const now = new Date("2026-01-06T01:00:00Z"); // 5pm Jan 5 in LA
    const start = startOfToday(now, "America/Los_Angeles");
    expect(start.toISOString()).toBe("2026-01-05T08:00:00.000Z");
    expect(start.getTime()).toBeLessThanOrEqual(now.getTime());
  });

  it("isValidTimeZone accepts IANA zones and rejects junk", () => {
    expect(isValidTimeZone("America/New_York")).toBe(true);
    expect(isValidTimeZone("UTC")).toBe(true);
    expect(isValidTimeZone("Mars/Olympus")).toBe(false);
  });
});
