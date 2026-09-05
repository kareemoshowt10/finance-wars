import { describe, it, expect, beforeEach } from "vitest";
import { db, resetDb } from "./setup";
import { makeUser, makeHousehold, makeChore, makeLoan, makeGoal, buildRequest, call, type TestUser } from "./factories";
import { POST as createChore } from "@/app/api/households/[hid]/chores/route";
import { POST as createLoan } from "@/app/api/households/[hid]/loans/route";
import { POST as createGoal } from "@/app/api/households/[hid]/goals/route";
import { POST as invite } from "@/app/api/households/[hid]/invite/route";
import { PATCH as patchHousehold } from "@/app/api/households/[hid]/route";

/**
 * Bad input should come back as something the client can show, never a 500
 * that pages someone at 3am. And plan limits are the paywall: if they're off
 * by one in either direction, the app either leaks paid features or blocks a
 * customer who's within their allowance.
 *
 * Note the codebase has two validation conventions — 41 routes go through
 * lib/validate's parseBody (422 + per-field messages) and 28 use a bare
 * safeParse (400, no detail). Both are defensible; being both is not, since a
 * client can't write one error handler. Rather than bake the split in, these
 * tests assert the contract that actually matters: a validation-class 4xx and
 * no write. Unifying the two is filed as a follow-up in HANDOFF.md.
 */
const REJECTED = [400, 422];
describe("input validation", () => {
  let owner: TestUser, other: TestUser, hid: string;

  beforeEach(async () => {
    await resetDb();
    owner = await makeUser();
    other = await makeUser();
    hid = (await makeHousehold(owner, [other])).id;
  });

  it("survives a body that isn't JSON at all", async () => {
    const res = await call(createChore, `/api/households/${hid}/chores`, { hid }, {
      as: owner, method: "POST", rawBody: "this is not json{{{",
    });
    expect(res.status).toBe(400);
  });

  it("survives an empty body", async () => {
    const res = await call(createChore, `/api/households/${hid}/chores`, { hid }, { as: owner, method: "POST", rawBody: "" });
    expect(res.status).toBe(400);
  });

  it("rejects a missing required field rather than writing a half row", async () => {
    const res = await call(createChore, `/api/households/${hid}/chores`, { hid }, { as: owner, body: { emoji: "🧹" } });
    expect(res.status).toBe(400);
    expect(await db.chore.count()).toBe(0);
  });

  it("rejects an over-long name at the schema boundary", async () => {
    const ok = await call(createChore, `/api/households/${hid}/chores`, { hid }, { as: owner, body: { name: "a".repeat(80) } });
    expect(ok.status).toBe(200);
    const tooLong = await call(createChore, `/api/households/${hid}/chores`, { hid }, { as: owner, body: { name: "a".repeat(81) } });
    expect(tooLong.status).toBe(400);
  });

  it("rejects out-of-range chore rewards", async () => {
    for (const body of [{ name: "x", crownValue: 0 }, { name: "x", crownValue: 1001 }, { name: "x", xpValue: -1 }]) {
      const res = await call(createChore, `/api/households/${hid}/chores`, { hid }, { as: owner, body });
      expect(res.status).toBe(400);
    }
  });

  it("rejects an unknown enum value instead of storing it", async () => {
    const res = await call(createChore, `/api/households/${hid}/chores`, { hid }, {
      as: owner, body: { name: "x", frequency: "FORTNIGHTLY" },
    });
    expect(res.status).toBe(400);
    expect(await db.chore.count()).toBe(0);
  });

  it("rejects an APR outside 0–100", async () => {
    for (const rate of [-1, 101]) {
      const res = await call(createLoan, `/api/households/${hid}/loans`, { hid }, {
        as: owner, body: { borrowerUserId: other.id, principal: 100, purpose: "x", interestRateApr: rate },
      });
      expect(res.status).toBe(400);
    }
    expect(await db.loan.count()).toBe(0);
  });

  it("rejects a malformed email on invite", async () => {
    const res = await call(invite, `/api/households/${hid}/invite`, { hid }, { as: owner, body: { email: "not-an-email" } });
    expect(REJECTED).toContain(res.status);
    expect(await db.householdMember.count({ where: { householdId: hid } })).toBe(2);
  });

  it("no validation failure anywhere becomes a 500", async () => {
    const junk = { name: 12345, principal: "abc", targetAmount: {}, email: [], frequency: null };
    const attempts = await Promise.all([
      call(createChore, `/api/households/${hid}/chores`, { hid }, { as: owner, body: junk }),
      call(createLoan, `/api/households/${hid}/loans`, { hid }, { as: owner, body: junk }),
      call(createGoal, `/api/households/${hid}/goals`, { hid }, { as: owner, body: junk }),
      call(invite, `/api/households/${hid}/invite`, { hid }, { as: owner, body: junk }),
      call(patchHousehold, `/api/households/${hid}`, { hid }, { as: owner, method: "PATCH", body: junk }),
    ]);
    for (const res of attempts) {
      expect(res.status).toBeLessThan(500);
      expect(REJECTED).toContain(res.status);
    }
  });

  it("rejects an unrecognised timezone", async () => {
    const res = await call(patchHousehold, `/api/households/${hid}`, { hid }, {
      as: owner, method: "PATCH", body: { timezone: "Mars/Olympus_Mons" },
    });
    expect(res.status).toBe(400);
    expect((await db.household.findUnique({ where: { id: hid } }))?.timezone).toBe("UTC");
  });

  it("accepts a real timezone", async () => {
    const res = await call(patchHousehold, `/api/households/${hid}`, { hid }, {
      as: owner, method: "PATCH", body: { timezone: "America/Los_Angeles" },
    });
    expect(res.status).toBe(200);
    expect((await db.household.findUnique({ where: { id: hid } }))?.timezone).toBe("America/Los_Angeles");
  });

  it("rejects a goal with a non-positive target", async () => {
    for (const targetAmount of [0, -100]) {
      const res = await call(createGoal, `/api/households/${hid}/goals`, { hid }, { as: owner, body: { name: "x", targetAmount } });
      expect(res.status).toBe(400);
    }
    expect(await db.householdGoal.count()).toBe(0);
  });

  it("ignores fields the schema doesn't declare rather than trusting them", async () => {
    const res = await call(patchHousehold, `/api/households/${hid}`, { hid }, {
      as: owner, method: "PATCH", body: { name: "Legit", plan: "household_hq", createdById: other.id },
    });
    expect(res.status).toBe(200);
    const hh = await db.household.findUnique({ where: { id: hid } });
    expect(hh?.name).toBe("Legit");
    // The paywall is not a request parameter.
    expect(hh?.plan).toBe("free");
    expect(hh?.createdById).toBe(owner.id);
  });
});

describe("plan limits at the boundary", () => {
  let owner: TestUser, other: TestUser, hid: string;

  beforeEach(async () => {
    await resetDb();
    owner = await makeUser();
    other = await makeUser();
    hid = (await makeHousehold(owner, [other], { plan: "free" })).id;
  });

  it("free allows exactly 5 chores and refuses the 6th", async () => {
    for (let i = 0; i < 5; i++) await makeChore(hid, owner.id, { name: `Chore ${i}` });
    const res = await call<{ error?: string }>(createChore, `/api/households/${hid}/chores`, { hid }, { as: owner, body: { name: "Sixth" } });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(await db.chore.count({ where: { householdId: hid, active: true } })).toBe(5);
  });

  it("an archived chore frees a slot", async () => {
    const chores = [];
    for (let i = 0; i < 5; i++) chores.push(await makeChore(hid, owner.id, { name: `Chore ${i}` }));
    await db.chore.update({ where: { id: chores[0].id }, data: { active: false } });

    const res = await call(createChore, `/api/households/${hid}/chores`, { hid }, { as: owner, body: { name: "Replacement" } });
    expect(res.status).toBe(200);
  });

  it("upgrading lifts the chore ceiling", async () => {
    for (let i = 0; i < 5; i++) await makeChore(hid, owner.id, { name: `Chore ${i}` });
    await db.household.update({ where: { id: hid }, data: { plan: "rhythm" } });

    const res = await call(createChore, `/api/households/${hid}/chores`, { hid }, { as: owner, body: { name: "Sixth" } });
    expect(res.status).toBe(200);
    expect(await db.chore.count({ where: { householdId: hid, active: true } })).toBe(6);
  });

  it("free allows exactly 1 active loan and refuses the 2nd", async () => {
    await makeLoan(hid, owner.id, other.id, { principal: 100 });
    const res = await call(createLoan, `/api/households/${hid}/loans`, { hid }, {
      as: owner, body: { borrowerUserId: other.id, principal: 50, purpose: "Second" },
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(await db.loan.count({ where: { householdId: hid } })).toBe(1);
  });

  it("a paid-off loan frees the slot", async () => {
    const loan = await makeLoan(hid, owner.id, other.id, { principal: 100 });
    await db.loan.update({ where: { id: loan.id }, data: { status: "PAID", balanceRemaining: 0 } });

    const res = await call(createLoan, `/api/households/${hid}/loans`, { hid }, {
      as: owner, body: { borrowerUserId: other.id, principal: 50, purpose: "Next" },
    });
    expect(res.status).toBe(200);
  });

  it("free refuses an interest-bearing loan; Household HQ allows it", async () => {
    const withInterest = { borrowerUserId: other.id, principal: 100, purpose: "x", interestRateApr: 5 };

    const denied = await call(createLoan, `/api/households/${hid}/loans`, { hid }, { as: owner, body: withInterest });
    expect(denied.status).toBeGreaterThanOrEqual(400);

    await db.household.update({ where: { id: hid }, data: { plan: "household_hq" } });
    const allowed = await call(createLoan, `/api/households/${hid}/loans`, { hid }, { as: owner, body: withInterest });
    expect(allowed.status).toBe(200);
    expect((await db.loan.findFirst({ where: { householdId: hid } }))?.interestRateApr).toBe(5);
  });

  it("free allows exactly 1 active goal and refuses the 2nd", async () => {
    await makeGoal(hid, owner.id);
    const res = await call(createGoal, `/api/households/${hid}/goals`, { hid }, { as: owner, body: { name: "Second", targetAmount: 100 } });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(await db.householdGoal.count({ where: { householdId: hid, status: "ACTIVE" } })).toBe(1);
  });

  it("free allows 4 members and refuses the 5th invite", async () => {
    for (let i = 0; i < 2; i++) {
      const u = await makeUser();
      await db.householdMember.create({ data: { householdId: hid, userId: u.id, role: "MEMBER", accepted: true, joinedAt: new Date() } });
    }
    expect(await db.householdMember.count({ where: { householdId: hid, accepted: true } })).toBe(4);

    const res = await call(invite, `/api/households/${hid}/invite`, { hid }, { as: owner, body: { email: "fifth@example.test" } });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(await db.householdMember.count({ where: { householdId: hid } })).toBe(4);
  });
});
