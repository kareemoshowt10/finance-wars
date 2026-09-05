import { describe, it, expect, beforeEach } from "vitest";
import { db, resetDb } from "./setup";
import { makeUser, makeHousehold, makeChore, makeGoal, call, type TestUser } from "./factories";
import { POST as complete } from "@/app/api/households/[hid]/chores/[choreId]/complete/route";
import { POST as cheer } from "@/app/api/households/[hid]/cheers/route";
import { POST as contribute } from "@/app/api/households/[hid]/goals/[goalId]/contribute/route";
import { POST as payLoan } from "@/app/api/households/[hid]/loans/[loanId]/payments/route";
import { makeLoan } from "./factories";

/**
 * Concurrency.
 *
 * A household is a multiplayer app: two people log the dishes at the same
 * moment, someone double-taps a button the optimistic UI has already flipped
 * to "Done", a phone retries a request the server already handled. None of
 * that is exotic, and none of it had a test.
 *
 * These run requests genuinely in parallel via Promise.all rather than
 * awaiting in sequence, so interleaving is real.
 */
describe("simultaneous chore completions", () => {
  let a: TestUser, b: TestUser, hid: string, choreId: string;

  beforeEach(async () => {
    await resetDb();
    a = await makeUser({ name: "A" });
    b = await makeUser({ name: "B" });
    hid = (await makeHousehold(a, [b])).id;
    choreId = (await makeChore(hid, a.id, { crownValue: 10, xpValue: 5 })).id;
  });

  it("two members completing the same chore both get credited", async () => {
    const [ra, rb] = await Promise.all([
      call(complete, `/api/households/${hid}/chores/${choreId}/complete`, { hid, choreId }, { as: a, body: {} }),
      call(complete, `/api/households/${hid}/chores/${choreId}/complete`, { hid, choreId }, { as: b, body: {} }),
    ]);
    expect(ra.status).toBe(200);
    expect(rb.status).toBe(200);

    const completions = await db.choreCompletion.findMany({ where: { choreId } });
    expect(completions).toHaveLength(2);
    expect(new Set(completions.map((c) => c.userId))).toEqual(new Set([a.id, b.id]));

    // Crowns are per-person, not split or double-counted.
    for (const user of [a, b]) {
      const earned = await db.walletEntry.aggregate({
        where: { userId: user.id, reason: "CHORE_COMPLETED" }, _sum: { delta: true },
      });
      expect(earned._sum.delta).toBe(10);
    }
  });

  it("a double-tap records both completions without corrupting the totals", async () => {
    // The chores view is optimistic, so a fast second tap is plausible. The
    // product treats repeat completions as legitimate ("Done again"), so the
    // contract is that totals stay consistent — not that the second is
    // rejected.
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        call(complete, `/api/households/${hid}/chores/${choreId}/complete`, { hid, choreId }, { as: a, body: {} })
      )
    );
    expect(results.every((r) => r.status === 200)).toBe(true);

    const count = await db.choreCompletion.count({ where: { choreId, userId: a.id } });
    expect(count).toBe(5);

    const earned = await db.walletEntry.aggregate({
      where: { userId: a.id, reason: "CHORE_COMPLETED" }, _sum: { delta: true },
    });
    expect(earned._sum.delta).toBe(50);

    const choreXp = await db.choreCompletion.aggregate({
      where: { choreId, userId: a.id }, _sum: { xpAwarded: true },
    });
    expect(choreXp._sum.xpAwarded).toBe(25);

    // Total XP also includes achievement unlocks, so it can only be higher —
    // never lower, which would mean a completion's XP went missing.
    const user = await db.user.findUnique({ where: { id: a.id } });
    expect(user!.xp).toBeGreaterThanOrEqual(25);
  });

  it("awards the daily bonus at most once even when the last objective lands twice", async () => {
    const goal = await makeGoal(hid, a.id);
    // Clear two of the three objectives, then race the third.
    await call(complete, `/api/households/${hid}/chores/${choreId}/complete`, { hid, choreId }, { as: a, body: {} });
    await call(contribute, `/api/households/${hid}/goals/${goal.id}/contribute`, { hid, goalId: goal.id }, {
      as: a, body: { source: "CASH", amount: 10 },
    });

    await Promise.all([
      call(cheer, `/api/households/${hid}/cheers`, { hid }, { as: a, body: { toUserId: b.id, emoji: "👏" } }),
      call(cheer, `/api/households/${hid}/cheers`, { hid }, { as: a, body: { toUserId: b.id, emoji: "🔥" } }),
    ]);

    const bonuses = await db.walletEntry.findMany({ where: { userId: a.id, reason: "DAILY_BONUS" } });
    expect(bonuses.length).toBeLessThanOrEqual(1);

    const notes = await db.notification.findMany({ where: { userId: a.id, kind: "DAILY_OBJECTIVES_COMPLETE" } });
    expect(notes.length).toBeLessThanOrEqual(1);
  });
});

describe("simultaneous money writes", () => {
  let lender: TestUser, borrower: TestUser, hid: string;

  beforeEach(async () => {
    await resetDb();
    lender = await makeUser();
    borrower = await makeUser();
    hid = (await makeHousehold(lender, [borrower], { plan: "household_hq" })).id;
  });

  it("parallel goal contributions all land in the total", async () => {
    const goal = await makeGoal(hid, lender.id, { targetAmount: 10000 });
    const amounts = [10, 20, 30, 40, 50];

    await Promise.all(
      amounts.map((amount) =>
        call(contribute, `/api/households/${hid}/goals/${goal.id}/contribute`, { hid, goalId: goal.id }, {
          as: lender, body: { source: "CASH", amount },
        })
      )
    );

    const rows = await db.householdGoalContribution.findMany({ where: { goalId: goal.id } });
    expect(rows).toHaveLength(amounts.length);
    expect(rows.reduce((s, r) => s + r.amount, 0)).toBe(150);

    // The stored total must match the sum of its parts. A read-modify-write
    // instead of an atomic increment would lose contributions here.
    const after = await db.householdGoal.findUnique({ where: { id: goal.id } });
    expect(after?.currentAmount).toBe(150);
  });

  it("parallel loan payments never drive the balance below zero", async () => {
    const loan = await makeLoan(hid, lender.id, borrower.id, { principal: 100 });

    await Promise.all(
      [60, 60, 60].map((amount) =>
        call(payLoan, `/api/households/${hid}/loans/${loan.id}/payments`, { hid, loanId: loan.id }, {
          as: borrower, body: { amount },
        })
      )
    );

    const after = await db.loan.findUnique({ where: { id: loan.id } });
    expect(after!.balanceRemaining).toBeGreaterThanOrEqual(0);
    expect(after!.balanceRemaining).toBeLessThanOrEqual(100);
  });
});

describe("notification dedup under repeat delivery", () => {
  it("the keyed unique constraint holds when the same nudge is sent twice at once", async () => {
    await resetDb();
    const user = await makeUser();
    const payload = {
      userId: user.id, kind: "HOUSEHOLD_STREAK_AT_RISK", title: "streak at risk",
      body: "do a chore", link: "/dashboard/household", key: "streak-risk:h1:2026-09-03",
    };

    const results = await Promise.allSettled([
      db.notification.create({ data: payload }),
      db.notification.create({ data: payload }),
      db.notification.create({ data: payload }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await db.notification.count({ where: { userId: user.id } })).toBe(1);
  });
});
