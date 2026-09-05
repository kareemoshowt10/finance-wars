import { describe, it, expect, beforeEach } from "vitest";
import { db, resetDb } from "./setup";
import { makeUser, makeHousehold, makeLoan, makeGoal, call, type TestUser } from "./factories";
import { POST as createLoan, GET as listLoans } from "@/app/api/households/[hid]/loans/route";
import { POST as payLoan } from "@/app/api/households/[hid]/loans/[loanId]/payments/route";
import { POST as contribute } from "@/app/api/households/[hid]/goals/[goalId]/contribute/route";
import { accrueLoanById, accrueAllActiveLoans } from "@/lib/loanAccrual";

/**
 * The money paths. Every assertion here reads the database back rather than
 * trusting the response body — a route that returns the right JSON while
 * writing the wrong row is the failure mode that costs real money.
 */
describe("money: loans", () => {
  let lender: TestUser, borrower: TestUser, hid: string;

  beforeEach(async () => {
    await resetDb();
    lender = await makeUser({ name: "Lender" });
    borrower = await makeUser({ name: "Borrower" });
    hid = (await makeHousehold(lender, [borrower])).id;
  });

  it("issues a loan whose balance starts at the principal", async () => {
    const res = await call(createLoan, `/api/households/${hid}/loans`, { hid }, {
      as: lender,
      body: { borrowerUserId: borrower.id, principal: 250, purpose: "New bike", interestRateApr: 0 },
    });
    expect(res.status).toBe(200);

    const loans = await db.loan.findMany({ where: { householdId: hid } });
    expect(loans).toHaveLength(1);
    expect(loans[0]).toMatchObject({
      principal: 250,
      balanceRemaining: 250,
      lenderUserId: lender.id,
      borrowerUserId: borrower.id,
      status: "ACTIVE",
    });
  });

  it("refuses a loan to yourself", async () => {
    const res = await call(createLoan, `/api/households/${hid}/loans`, { hid }, {
      as: lender,
      body: { borrowerUserId: lender.id, principal: 100, purpose: "Self" },
    });
    expect(res.status).toBe(400);
    expect(await db.loan.count()).toBe(0);
  });

  it("refuses a loan to someone outside the household", async () => {
    const stranger = await makeUser();
    const res = await call(createLoan, `/api/households/${hid}/loans`, { hid }, {
      as: lender,
      body: { borrowerUserId: stranger.id, principal: 100, purpose: "Outsider" },
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(await db.loan.count()).toBe(0);
  });

  it("refuses a negative or zero principal", async () => {
    for (const principal of [0, -50]) {
      const res = await call(createLoan, `/api/households/${hid}/loans`, { hid }, {
        as: lender, body: { borrowerUserId: borrower.id, principal, purpose: "Bad" },
      });
      expect(res.status).toBe(400);
    }
    expect(await db.loan.count()).toBe(0);
  });

  it("draws the balance down as payments land", async () => {
    const loan = await makeLoan(hid, lender.id, borrower.id, { principal: 100 });

    const first = await call(payLoan, `/api/households/${hid}/loans/${loan.id}/payments`, { hid, loanId: loan.id }, {
      as: borrower, body: { amount: 40 },
    });
    expect(first.status).toBe(200);
    expect((await db.loan.findUnique({ where: { id: loan.id } }))?.balanceRemaining).toBe(60);

    await call(payLoan, `/api/households/${hid}/loans/${loan.id}/payments`, { hid, loanId: loan.id }, {
      as: borrower, body: { amount: 25 },
    });
    const after = await db.loan.findUnique({ where: { id: loan.id } });
    expect(after?.balanceRemaining).toBe(35);
    expect(after?.status).toBe("ACTIVE");
    expect(await db.loanPayment.count({ where: { loanId: loan.id } })).toBe(2);
  });

  it("closes the loan on the final payment and never goes negative", async () => {
    const loan = await makeLoan(hid, lender.id, borrower.id, { principal: 100 });
    const res = await call<{ overpaid: number; paidOff: boolean; newBalance: number }>(
      payLoan, `/api/households/${hid}/loans/${loan.id}/payments`, { hid, loanId: loan.id },
      { as: borrower, body: { amount: 130 } }
    );
    expect(res.status).toBe(200);
    expect(res.body.paidOff).toBe(true);
    expect(res.body.overpaid).toBe(30);

    const after = await db.loan.findUnique({ where: { id: loan.id } });
    expect(after?.balanceRemaining).toBe(0);
    expect(after?.status).toBe("PAID");
  });

  it("refuses further payments once a loan is paid off", async () => {
    const loan = await makeLoan(hid, lender.id, borrower.id, { principal: 50 });
    await call(payLoan, `/api/households/${hid}/loans/${loan.id}/payments`, { hid, loanId: loan.id }, { as: borrower, body: { amount: 50 } });

    const res = await call(payLoan, `/api/households/${hid}/loans/${loan.id}/payments`, { hid, loanId: loan.id }, { as: borrower, body: { amount: 10 } });
    expect(res.status).toBe(400);
    expect(await db.loanPayment.count({ where: { loanId: loan.id } })).toBe(1);
  });

  it("refuses a payment against a loan belonging to another household", async () => {
    const other = await makeUser();
    const otherHid = (await makeHousehold(other)).id;
    const loan = await makeLoan(hid, lender.id, borrower.id, { principal: 100 });

    const res = await call(payLoan, `/api/households/${otherHid}/loans/${loan.id}/payments`, { hid: otherHid, loanId: loan.id }, {
      as: other, body: { amount: 10 },
    });
    expect(res.status).toBe(404);
    expect((await db.loan.findUnique({ where: { id: loan.id } }))?.balanceRemaining).toBe(100);
  });

  it("notifies the lender when the balance clears", async () => {
    const loan = await makeLoan(hid, lender.id, borrower.id, { principal: 20 });
    await call(payLoan, `/api/households/${hid}/loans/${loan.id}/payments`, { hid, loanId: loan.id }, { as: borrower, body: { amount: 20 } });
    const notes = await db.notification.findMany({ where: { userId: lender.id, kind: "LOAN" } });
    expect(notes).toHaveLength(1);
    expect(notes[0].title).toContain("paid off");
  });
});

describe("money: loan interest accrual", () => {
  let lender: TestUser, borrower: TestUser, hid: string;

  beforeEach(async () => {
    await resetDb();
    lender = await makeUser();
    borrower = await makeUser();
    hid = (await makeHousehold(lender, [borrower])).id;
  });

  it("adds a month of interest at the stated APR", async () => {
    const loan = await makeLoan(hid, lender.id, borrower.id, {
      principal: 1200, interestRateApr: 12, lastAccruedAt: new Date("2026-01-01T00:00:00Z"),
    });
    await accrueLoanById(loan.id, new Date("2026-02-15T00:00:00Z"));

    // 12% APR = 1% a month on 1200 = 12.
    const after = await db.loan.findUnique({ where: { id: loan.id } });
    expect(after?.balanceRemaining).toBeCloseTo(1212, 2);
  });

  it("is a no-op when run twice in the same month — the bug that would double-charge", async () => {
    const loan = await makeLoan(hid, lender.id, borrower.id, {
      principal: 1200, interestRateApr: 12, lastAccruedAt: new Date("2026-01-01T00:00:00Z"),
    });
    const now = new Date("2026-02-15T00:00:00Z");
    await accrueLoanById(loan.id, now);
    const once = (await db.loan.findUnique({ where: { id: loan.id } }))?.balanceRemaining;

    await accrueLoanById(loan.id, now);
    await accrueLoanById(loan.id, new Date("2026-02-27T00:00:00Z"));
    const thrice = (await db.loan.findUnique({ where: { id: loan.id } }))?.balanceRemaining;

    expect(thrice).toBe(once);
  });

  it("leaves 0% loans alone", async () => {
    const loan = await makeLoan(hid, lender.id, borrower.id, {
      principal: 500, interestRateApr: 0, lastAccruedAt: new Date("2026-01-01T00:00:00Z"),
    });
    await accrueLoanById(loan.id, new Date("2026-06-01T00:00:00Z"));
    expect((await db.loan.findUnique({ where: { id: loan.id } }))?.balanceRemaining).toBe(500);
  });

  it("never accrues against a paid-off loan", async () => {
    const loan = await makeLoan(hid, lender.id, borrower.id, {
      principal: 100, interestRateApr: 24, lastAccruedAt: new Date("2026-01-01T00:00:00Z"),
    });
    await db.loan.update({ where: { id: loan.id }, data: { status: "PAID", balanceRemaining: 0 } });
    await accrueLoanById(loan.id, new Date("2026-06-01T00:00:00Z"));
    const after = await db.loan.findUnique({ where: { id: loan.id } });
    expect(after?.balanceRemaining).toBe(0);
  });

  it("the monthly cron only touches interest-bearing active loans", async () => {
    const anchor = new Date("2026-01-01T00:00:00Z");
    await makeLoan(hid, lender.id, borrower.id, { principal: 100, interestRateApr: 12, lastAccruedAt: anchor });
    await makeLoan(hid, lender.id, borrower.id, { principal: 100, interestRateApr: 0, lastAccruedAt: anchor });
    const paid = await makeLoan(hid, lender.id, borrower.id, { principal: 100, interestRateApr: 12, lastAccruedAt: anchor });
    await db.loan.update({ where: { id: paid.id }, data: { status: "PAID" } });

    const result = await accrueAllActiveLoans(new Date("2026-02-10T00:00:00Z"));
    expect(result.processed).toBe(1);

    const balances = (await db.loan.findMany({ orderBy: { createdAt: "asc" } })).map((l) => l.balanceRemaining);
    expect(balances).toEqual([101, 100, 100]);
  });
});

describe("money: goal contributions", () => {
  let owner: TestUser, hid: string;

  beforeEach(async () => {
    await resetDb();
    owner = await makeUser();
    hid = (await makeHousehold(owner)).id;
  });

  it("adds cash to the goal's running total", async () => {
    const goal = await makeGoal(hid, owner.id, { targetAmount: 1000 });
    const res = await call(contribute, `/api/households/${hid}/goals/${goal.id}/contribute`, { hid, goalId: goal.id }, {
      as: owner, body: { source: "CASH", amount: 250 },
    });
    expect(res.status).toBe(200);

    const after = await db.householdGoal.findUnique({ where: { id: goal.id } });
    expect(after?.currentAmount).toBe(250);
    expect(await db.householdGoalContribution.count({ where: { goalId: goal.id } })).toBe(1);
  });

  it("accumulates across contributors", async () => {
    const second = await makeUser();
    await db.householdMember.create({ data: { householdId: hid, userId: second.id, role: "MEMBER", accepted: true, joinedAt: new Date() } });
    const goal = await makeGoal(hid, owner.id, { targetAmount: 1000 });

    await call(contribute, `/api/households/${hid}/goals/${goal.id}/contribute`, { hid, goalId: goal.id }, { as: owner, body: { source: "CASH", amount: 100 } });
    await call(contribute, `/api/households/${hid}/goals/${goal.id}/contribute`, { hid, goalId: goal.id }, { as: second, body: { source: "CASH", amount: 150 } });

    expect((await db.householdGoal.findUnique({ where: { id: goal.id } }))?.currentAmount).toBe(250);
  });

  it("refuses a zero or negative contribution", async () => {
    const goal = await makeGoal(hid, owner.id);
    for (const amount of [0, -10]) {
      const res = await call(contribute, `/api/households/${hid}/goals/${goal.id}/contribute`, { hid, goalId: goal.id }, {
        as: owner, body: { source: "CASH", amount },
      });
      expect(res.status).toBe(400);
    }
    expect((await db.householdGoal.findUnique({ where: { id: goal.id } }))?.currentAmount).toBe(0);
  });

  it("refuses a contribution from a non-member", async () => {
    const stranger = await makeUser();
    const goal = await makeGoal(hid, owner.id);
    const res = await call(contribute, `/api/households/${hid}/goals/${goal.id}/contribute`, { hid, goalId: goal.id }, {
      as: stranger, body: { source: "CASH", amount: 50 },
    });
    expect(res.status).toBe(403);
    expect((await db.householdGoal.findUnique({ where: { id: goal.id } }))?.currentAmount).toBe(0);
  });
});
