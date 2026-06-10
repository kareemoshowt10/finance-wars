import { describe, it, expect } from "vitest";
import {
  pickTheme, isRaidEligible, daysRemaining, raidPace, stageFor, buildBoss,
} from "@/lib/goalRaid";
import { victoryBonus } from "@/lib/goalRaidLifecycle";

const inDays = (d: number) => new Date(Date.now() + d * 86_400_000);

describe("goalRaid", () => {
  it("picks themes by goal name keywords", () => {
    expect(pickTheme("Pay off credit card")).toBe("WARLORD");
    expect(pickTheme("House down payment")).toBe("TITAN");
    expect(pickTheme("Trip to Japan")).toBe("KRAKEN");
    expect(pickTheme("Emergency fund")).toBe("VAULT");
    expect(pickTheme("Something random")).toBe("DRAGON");
  });

  it("gates eligibility on timeframe and target", () => {
    expect(isRaidEligible(inDays(60), 1000)).toBe(true);
    expect(isRaidEligible(inDays(200), 1000)).toBe(false); // too far out
    expect(isRaidEligible(inDays(60), 100)).toBe(false); // too small
    expect(isRaidEligible(inDays(-5), 1000)).toBe(false); // past deadline
  });

  it("computes days remaining (never negative)", () => {
    expect(daysRemaining(inDays(10))).toBeGreaterThanOrEqual(9);
    expect(daysRemaining(inDays(-10))).toBe(0);
  });

  it("computes pace to win", () => {
    const p = raidPace(1000, 200, inDays(70));
    expect(p.remaining).toBe(800);
    expect(p.perWeek).toBeGreaterThan(0);
    expect(p.days).toBeGreaterThan(0);
  });

  it("advances narrative stage with progress", () => {
    expect(stageFor("DRAGON", 0).index).toBe(0);
    expect(stageFor("DRAGON", 30).index).toBe(1);
    expect(stageFor("DRAGON", 55).index).toBe(2);
    expect(stageFor("DRAGON", 80).index).toBe(3);
    expect(stageFor("DRAGON", 100).index).toBe(4);
  });

  it("builds a boss with name, title, and lore", () => {
    const boss = buildBoss("Trip to Japan", "KRAKEN", 5000, inDays(90));
    expect(boss.bossName).toBeTruthy();
    expect(boss.bossTitle).toContain("Deep");
    expect(boss.lore).toContain("Trip to Japan");
    expect(boss.lore).toContain("$5,000");
  });

  it("scales victory bonus by how early the raid is cleared", () => {
    expect(victoryBonus(45)).toBe(25); // a month+ early
    expect(victoryBonus(30)).toBe(25);
    expect(victoryBonus(14)).toBe(15); // a week+ early
    expect(victoryBonus(7)).toBe(15);
    expect(victoryBonus(2)).toBe(10);  // just in time
    expect(victoryBonus(0)).toBe(10);
  });
});
