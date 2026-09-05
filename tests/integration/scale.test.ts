import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db, resetDb } from "./setup";
import { makeUser, makeHousehold, makeChore, call, type TestUser } from "./factories";
import { GET as leaderboard } from "@/app/api/households/[hid]/chores/leaderboard/route";
import { GET as daily } from "@/app/api/households/[hid]/daily/route";
import { GET as choresList } from "@/app/api/households/[hid]/chores/route";
import { GET as pulse } from "@/app/api/households/[hid]/pulse/route";
import { getHouseholdStreak } from "@/lib/dailyEngagement";

/**
 * Scale.
 *
 * Everything up to now has been tested with a two-member household and three
 * chores. The streak and leaderboard both scan ChoreCompletion history, so
 * the interesting question is what happens to a twelve-person household two
 * years in — which is a state no test, and no screenshot, has ever produced.
 *
 * The timing assertions are wall-clock budgets, not query counts: they're
 * deliberately loose (seconds, on a laptop-grade Postgres) so they don't flake
 * on a slow CI runner, but an accidental N+1 over 8,000 completions blows
 * through them by orders of magnitude rather than percent.
 */
const MEMBERS = 12;
const CHORES = 10;
const DAYS = 730; // two years
const TODAY = new Date("2027-01-01T12:00:00Z");

let hid: string;
let owner: TestUser;
let members: TestUser[];
let completionCount = 0;

beforeAll(async () => {
  await resetDb();
  owner = await makeUser({ name: "Owner" });
  members = [owner];
  for (let i = 1; i < MEMBERS; i++) members.push(await makeUser({ name: `Member ${i}` }));

  const household = await makeHousehold(owner, members.slice(1), { plan: "household_hq" });
  hid = household.id;

  const chores = [];
  for (let c = 0; c < CHORES; c++) chores.push(await makeChore(hid, owner.id, { name: `Chore ${c}`, crownValue: 10 + c, xpValue: 5 }));

  // Two years of history: every day, a rotating subset of the household logs a
  // rotating subset of the chores. createMany keeps the seed to one round trip
  // per batch rather than 8,000.
  const rows: {
    householdId: string; choreId: string; userId: string; completedAt: Date; crownsAwarded: number; xpAwarded: number;
  }[] = [];
  for (let d = 0; d < DAYS; d++) {
    const day = new Date(TODAY.getTime() - d * 86400000);
    const doersToday = 3 + (d % 4); // 3–6 people a day
    for (let m = 0; m < doersToday; m++) {
      const user = members[(d + m) % MEMBERS];
      const chore = chores[(d + m) % CHORES];
      rows.push({
        householdId: hid, choreId: chore.id, userId: user.id,
        completedAt: new Date(day.getTime() + m * 3600000),
        crownsAwarded: chore.crownValue, xpAwarded: chore.xpValue,
      });
    }
  }
  completionCount = rows.length;
  for (let i = 0; i < rows.length; i += 1000) {
    await db.choreCompletion.createMany({ data: rows.slice(i, i + 1000) });
  }
}, 180000);

afterAll(resetDb);

async function timed<T>(fn: () => Promise<T>): Promise<{ ms: number; value: T }> {
  const started = Date.now();
  const value = await fn();
  return { ms: Date.now() - started, value };
}

describe(`a ${MEMBERS}-member household with two years of history`, () => {
  it("seeded the volume the rest of these tests assume", async () => {
    expect(completionCount).toBeGreaterThan(3000);
    expect(await db.choreCompletion.count({ where: { householdId: hid } })).toBe(completionCount);
  });

  it("computes the household streak correctly across 730 unbroken days", async () => {
    const { ms, value } = await timed(() => getHouseholdStreak(hid, TODAY, "UTC"));
    expect(value.current).toBe(DAYS);
    expect(value.longest).toBe(DAYS);
    expect(ms).toBeLessThan(5000);
  });

  it("still reports the right streak once a day is missing from the middle", async () => {
    const gapDay = new Date(TODAY.getTime() - 10 * 86400000);
    const dayStart = new Date(Date.UTC(gapDay.getUTCFullYear(), gapDay.getUTCMonth(), gapDay.getUTCDate()));
    const dayEnd = new Date(dayStart.getTime() + 86400000);
    const removed = await db.choreCompletion.findMany({
      where: { householdId: hid, completedAt: { gte: dayStart, lt: dayEnd } },
    });
    await db.choreCompletion.deleteMany({ where: { id: { in: removed.map((r) => r.id) } } });

    try {
      const streak = await getHouseholdStreak(hid, TODAY, "UTC");
      expect(streak.current).toBe(10);
      // The record run is everything before the gap.
      expect(streak.longest).toBe(DAYS - 11);
    } finally {
      await db.choreCompletion.createMany({
        data: removed.map(({ id: _id, ...rest }) => rest),
      });
    }
  });

  it("returns the all-time leaderboard within budget and ranks everyone", async () => {
    const { ms, value } = await timed(() =>
      call<{ leaderboard: { userId: string; completions: number; rank: number }[] }>(
        leaderboard, `/api/households/${hid}/chores/leaderboard`, { hid }, { as: owner, query: { range: "all" } }
      )
    );
    expect(value.status).toBe(200);
    expect(value.body.leaderboard).toHaveLength(MEMBERS);

    const totals = value.body.leaderboard.reduce((sum, e) => sum + e.completions, 0);
    expect(totals).toBe(completionCount);
    expect(value.body.leaderboard.map((e) => e.rank)).toEqual([...Array(MEMBERS)].map((_, i) => i + 1));
    expect(ms).toBeLessThan(8000);
  });

  it("keeps the leaderboard sorted by completions, then Crowns", async () => {
    const res = await call<{ leaderboard: { completions: number; crowns: number }[] }>(
      leaderboard, `/api/households/${hid}/chores/leaderboard`, { hid }, { as: owner, query: { range: "all" } }
    );
    const rows = res.body.leaderboard;
    for (let i = 1; i < rows.length; i++) {
      const prev = rows[i - 1], cur = rows[i];
      expect(
        prev.completions > cur.completions || (prev.completions === cur.completions && prev.crowns >= cur.crowns)
      ).toBe(true);
    }
  });

  it("serves the Today panel within budget at this volume", async () => {
    const { ms, value } = await timed(() => call(daily, `/api/households/${hid}/daily`, { hid }, { as: owner }));
    expect(value.status).toBe(200);
    expect(ms).toBeLessThan(8000);
  });

  it("serves the pulse and chores payloads within budget", async () => {
    const p = await timed(() => call(pulse, `/api/households/${hid}/pulse`, { hid }, { as: owner }));
    expect(p.value.status).toBe(200);
    expect(p.ms).toBeLessThan(8000);

    const c = await timed(() => call(choresList, `/api/households/${hid}/chores`, { hid }, { as: owner }));
    expect(c.value.status).toBe(200);
    expect(c.ms).toBeLessThan(8000);
  });

  it("does not ship two years of rows to the client on a chores load", async () => {
    // The view only needs recent history to derive "due today" and streaks;
    // sending 8,000 completions to a phone would be a different kind of bug
    // from a slow query, and timing alone wouldn't catch it.
    const res = await call<{ completions: unknown[] }>(choresList, `/api/households/${hid}/chores`, { hid }, { as: owner });
    expect(res.body.completions.length).toBeLessThan(completionCount / 4);
  });
});
