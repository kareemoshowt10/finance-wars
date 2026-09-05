import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { db, resetDb } from "./setup";
import { makeUser, makeHousehold, makeChore, makeLoan, makeGoal, call, type TestUser } from "./factories";

/**
 * The permission sweep.
 *
 * Every household route is a door into someone's finances, and the guard is
 * two lines (`resolveRequestUser` then `assertMember`) copy-pasted 40 times —
 * exactly the shape where one route quietly ships without them. This walks
 * the whole surface and asserts the same three things everywhere: an
 * anonymous caller gets 401, a signed-in non-member gets 403, and nobody can
 * reach another household's rows by swapping an id.
 *
 * Routes are listed explicitly rather than globbed so that adding a route
 * without adding it here is a visible omission in review, not a silent gap.
 */

type Route = {
  name: string;
  load: () => Promise<Record<string, unknown>>;
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: (ids: Ids) => string;
  params: (ids: Ids) => Record<string, string>;
  body?: (ids: Ids) => unknown;
  /** Routes reachable by design to non-members (invite acceptance, etc). */
  skipMemberCheck?: boolean;
};

type Ids = { hid: string; choreId: string; loanId: string; goalId: string; otherUserId: string };

const ROUTES: Route[] = [
  { name: "GET /households/[hid]", load: () => import("@/app/api/households/[hid]/route"), method: "GET",
    path: (i) => `/api/households/${i.hid}`, params: (i) => ({ hid: i.hid }) },
  { name: "PATCH /households/[hid]", load: () => import("@/app/api/households/[hid]/route"), method: "PATCH",
    path: (i) => `/api/households/${i.hid}`, params: (i) => ({ hid: i.hid }), body: () => ({ name: "Renamed" }) },
  { name: "GET /chores", load: () => import("@/app/api/households/[hid]/chores/route"), method: "GET",
    path: (i) => `/api/households/${i.hid}/chores`, params: (i) => ({ hid: i.hid }) },
  { name: "POST /chores", load: () => import("@/app/api/households/[hid]/chores/route"), method: "POST",
    path: (i) => `/api/households/${i.hid}/chores`, params: (i) => ({ hid: i.hid }), body: () => ({ name: "Sweep" }) },
  { name: "PATCH /chores/[choreId]", load: () => import("@/app/api/households/[hid]/chores/[choreId]/route"), method: "PATCH",
    path: (i) => `/api/households/${i.hid}/chores/${i.choreId}`, params: (i) => ({ hid: i.hid, choreId: i.choreId }), body: () => ({ name: "Renamed" }) },
  { name: "POST /chores/[choreId]/complete", load: () => import("@/app/api/households/[hid]/chores/[choreId]/complete/route"), method: "POST",
    path: (i) => `/api/households/${i.hid}/chores/${i.choreId}/complete`, params: (i) => ({ hid: i.hid, choreId: i.choreId }), body: () => ({}) },
  { name: "GET /chores/leaderboard", load: () => import("@/app/api/households/[hid]/chores/leaderboard/route"), method: "GET",
    path: (i) => `/api/households/${i.hid}/chores/leaderboard`, params: (i) => ({ hid: i.hid }) },
  { name: "GET /loans", load: () => import("@/app/api/households/[hid]/loans/route"), method: "GET",
    path: (i) => `/api/households/${i.hid}/loans`, params: (i) => ({ hid: i.hid }) },
  { name: "POST /loans", load: () => import("@/app/api/households/[hid]/loans/route"), method: "POST",
    path: (i) => `/api/households/${i.hid}/loans`, params: (i) => ({ hid: i.hid }),
    body: (i) => ({ borrowerUserId: i.otherUserId, principal: 10, purpose: "x" }) },
  { name: "GET /loans/[loanId]", load: () => import("@/app/api/households/[hid]/loans/[loanId]/route"), method: "GET",
    path: (i) => `/api/households/${i.hid}/loans/${i.loanId}`, params: (i) => ({ hid: i.hid, loanId: i.loanId }) },
  { name: "POST /loans/[loanId]/payments", load: () => import("@/app/api/households/[hid]/loans/[loanId]/payments/route"), method: "POST",
    path: (i) => `/api/households/${i.hid}/loans/${i.loanId}/payments`, params: (i) => ({ hid: i.hid, loanId: i.loanId }), body: () => ({ amount: 5 }) },
  { name: "GET /goals", load: () => import("@/app/api/households/[hid]/goals/route"), method: "GET",
    path: (i) => `/api/households/${i.hid}/goals`, params: (i) => ({ hid: i.hid }) },
  { name: "POST /goals", load: () => import("@/app/api/households/[hid]/goals/route"), method: "POST",
    path: (i) => `/api/households/${i.hid}/goals`, params: (i) => ({ hid: i.hid }), body: () => ({ name: "PS5", targetAmount: 500 }) },
  { name: "GET /goals/[goalId]", load: () => import("@/app/api/households/[hid]/goals/[goalId]/route"), method: "GET",
    path: (i) => `/api/households/${i.hid}/goals/${i.goalId}`, params: (i) => ({ hid: i.hid, goalId: i.goalId }) },
  { name: "POST /goals/[goalId]/contribute", load: () => import("@/app/api/households/[hid]/goals/[goalId]/contribute/route"), method: "POST",
    path: (i) => `/api/households/${i.hid}/goals/${i.goalId}/contribute`, params: (i) => ({ hid: i.hid, goalId: i.goalId }), body: () => ({ source: "CASH", amount: 5 }) },
  { name: "POST /goals/[goalId]/vote", load: () => import("@/app/api/households/[hid]/goals/[goalId]/vote/route"), method: "POST",
    path: (i) => `/api/households/${i.hid}/goals/${i.goalId}/vote`, params: (i) => ({ hid: i.hid, goalId: i.goalId }), body: () => ({ vote: "YES" }) },
  { name: "GET /daily", load: () => import("@/app/api/households/[hid]/daily/route"), method: "GET",
    path: (i) => `/api/households/${i.hid}/daily`, params: (i) => ({ hid: i.hid }) },
  { name: "GET /pulse", load: () => import("@/app/api/households/[hid]/pulse/route"), method: "GET",
    path: (i) => `/api/households/${i.hid}/pulse`, params: (i) => ({ hid: i.hid }) },
  { name: "GET /cheers", load: () => import("@/app/api/households/[hid]/cheers/route"), method: "GET",
    path: (i) => `/api/households/${i.hid}/cheers`, params: (i) => ({ hid: i.hid }) },
  { name: "POST /cheers", load: () => import("@/app/api/households/[hid]/cheers/route"), method: "POST",
    path: (i) => `/api/households/${i.hid}/cheers`, params: (i) => ({ hid: i.hid }), body: (i) => ({ toUserId: i.otherUserId, emoji: "👏" }) },
  { name: "GET /plan", load: () => import("@/app/api/households/[hid]/plan/route"), method: "GET",
    path: (i) => `/api/households/${i.hid}/plan`, params: (i) => ({ hid: i.hid }) },
  { name: "GET /ledger", load: () => import("@/app/api/households/[hid]/ledger/route"), method: "GET",
    path: (i) => `/api/households/${i.hid}/ledger`, params: (i) => ({ hid: i.hid }) },
  { name: "GET /allowance", load: () => import("@/app/api/households/[hid]/allowance/route"), method: "GET",
    path: (i) => `/api/households/${i.hid}/allowance`, params: (i) => ({ hid: i.hid }) },
  { name: "GET /bills", load: () => import("@/app/api/households/[hid]/bills/route"), method: "GET",
    path: (i) => `/api/households/${i.hid}/bills`, params: (i) => ({ hid: i.hid }) },
  { name: "POST /bills", load: () => import("@/app/api/households/[hid]/bills/route"), method: "POST",
    path: (i) => `/api/households/${i.hid}/bills`, params: (i) => ({ hid: i.hid }), body: () => ({ name: "Power", amount: 80, dueDay: 1 }) },
  { name: "GET /money-dates", load: () => import("@/app/api/households/[hid]/money-dates/route"), method: "GET",
    path: (i) => `/api/households/${i.hid}/money-dates`, params: (i) => ({ hid: i.hid }) },
  { name: "GET /pact", load: () => import("@/app/api/households/[hid]/pact/route"), method: "GET",
    path: (i) => `/api/households/${i.hid}/pact`, params: (i) => ({ hid: i.hid }) },
  { name: "POST /pact/sign", load: () => import("@/app/api/households/[hid]/pact/sign/route"), method: "POST",
    path: (i) => `/api/households/${i.hid}/pact/sign`, params: (i) => ({ hid: i.hid }), body: () => ({}) },
  { name: "GET /purchase-reviews", load: () => import("@/app/api/households/[hid]/purchase-reviews/route"), method: "GET",
    path: (i) => `/api/households/${i.hid}/purchase-reviews`, params: (i) => ({ hid: i.hid }) },
  { name: "GET /shared-view", load: () => import("@/app/api/households/[hid]/shared-view/route"), method: "GET",
    path: (i) => `/api/households/${i.hid}/shared-view`, params: (i) => ({ hid: i.hid }) },
  { name: "POST /settle", load: () => import("@/app/api/households/[hid]/settle/route"), method: "POST",
    path: (i) => `/api/households/${i.hid}/settle`, params: (i) => ({ hid: i.hid }), body: () => ({}) },
  { name: "POST /invite", load: () => import("@/app/api/households/[hid]/invite/route"), method: "POST",
    path: (i) => `/api/households/${i.hid}/invite`, params: (i) => ({ hid: i.hid }), body: () => ({ email: "someone@example.test" }) },
  { name: "POST /billing/checkout", load: () => import("@/app/api/households/[hid]/billing/checkout/route"), method: "POST",
    path: (i) => `/api/households/${i.hid}/billing/checkout`, params: (i) => ({ hid: i.hid }), body: () => ({ planId: "rhythm" }) },
  { name: "POST /billing/downgrade", load: () => import("@/app/api/households/[hid]/billing/downgrade/route"), method: "POST",
    path: (i) => `/api/households/${i.hid}/billing/downgrade`, params: (i) => ({ hid: i.hid }), body: () => ({}) },
];

async function invoke(route: Route, ids: Ids, as: TestUser | null) {
  const mod = await route.load();
  const handler = mod[route.method] as Parameters<typeof call>[0];
  if (typeof handler !== "function") throw new Error(`${route.name}: no ${route.method} export`);
  return call(handler, route.path(ids), route.params(ids), {
    as, method: route.method, body: route.body ? route.body(ids) : undefined,
  });
}

describe("permission boundaries across every household route", () => {
  let member: TestUser, stranger: TestUser, ids: Ids;

  beforeAll(async () => {
    await resetDb();
    member = await makeUser({ name: "Member" });
    const second = await makeUser({ name: "Second" });
    stranger = await makeUser({ name: "Stranger" });
    // The stranger has a household of their own, so they're a legitimate user
    // — just not of this one.
    await makeHousehold(stranger);

    const household = await makeHousehold(member, [second]);
    ids = {
      hid: household.id,
      choreId: (await makeChore(household.id, member.id)).id,
      loanId: (await makeLoan(household.id, member.id, second.id, { principal: 100 })).id,
      goalId: (await makeGoal(household.id, member.id)).id,
      otherUserId: second.id,
    };
  });

  it.each(ROUTES.map((r) => [r.name, r] as const))("%s rejects an anonymous caller with 401", async (_name, route) => {
    const res = await invoke(route, ids, null);
    expect(res.status).toBe(401);
  });

  it.each(ROUTES.filter((r) => !r.skipMemberCheck).map((r) => [r.name, r] as const))(
    "%s rejects a signed-in non-member with 403",
    async (_name, route) => {
      const res = await invoke(route, ids, stranger);
      expect(res.status).toBe(403);
    }
  );

  it("a non-member's reads and writes leave no trace in the household", async () => {
    const before = {
      chores: await db.chore.count({ where: { householdId: ids.hid } }),
      loans: await db.loan.count({ where: { householdId: ids.hid } }),
      goals: await db.householdGoal.count({ where: { householdId: ids.hid } }),
      completions: await db.choreCompletion.count({ where: { householdId: ids.hid } }),
      cheers: await db.householdCheer.count({ where: { householdId: ids.hid } }),
      members: await db.householdMember.count({ where: { householdId: ids.hid } }),
    };
    for (const route of ROUTES) await invoke(route, ids, stranger).catch(() => null);
    const after = {
      chores: await db.chore.count({ where: { householdId: ids.hid } }),
      loans: await db.loan.count({ where: { householdId: ids.hid } }),
      goals: await db.householdGoal.count({ where: { householdId: ids.hid } }),
      completions: await db.choreCompletion.count({ where: { householdId: ids.hid } }),
      cheers: await db.householdCheer.count({ where: { householdId: ids.hid } }),
      members: await db.householdMember.count({ where: { householdId: ids.hid } }),
    };
    expect(after).toEqual(before);
  });

  it("the household's own plan is untouched by a stranger's checkout attempt", async () => {
    expect((await db.household.findUnique({ where: { id: ids.hid } }))?.plan).toBe("free");
  });
});

describe("cross-household id confusion", () => {
  let alice: TestUser, bob: TestUser, aliceHid: string, bobHid: string;

  beforeEach(async () => {
    await resetDb();
    alice = await makeUser({ name: "Alice" });
    bob = await makeUser({ name: "Bob" });
    aliceHid = (await makeHousehold(alice)).id;
    bobHid = (await makeHousehold(bob)).id;
  });

  it("a chore id from another household can't be completed through your own", async () => {
    const aliceChore = await makeChore(aliceHid, alice.id);
    const { POST } = await import("@/app/api/households/[hid]/chores/[choreId]/complete/route");
    const res = await call(POST, `/api/households/${bobHid}/chores/${aliceChore.id}/complete`, { hid: bobHid, choreId: aliceChore.id }, {
      as: bob, body: {},
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(await db.choreCompletion.count()).toBe(0);
  });

  it("a goal id from another household can't be funded through your own", async () => {
    const aliceGoal = await makeGoal(aliceHid, alice.id);
    const { POST } = await import("@/app/api/households/[hid]/goals/[goalId]/contribute/route");
    const res = await call(POST, `/api/households/${bobHid}/goals/${aliceGoal.id}/contribute`, { hid: bobHid, goalId: aliceGoal.id }, {
      as: bob, body: { source: "CASH", amount: 100 },
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect((await db.householdGoal.findUnique({ where: { id: aliceGoal.id } }))?.currentAmount).toBe(0);
  });

  it("a loan id from another household can't be paid through your own", async () => {
    const other = await makeUser();
    await db.householdMember.create({ data: { householdId: aliceHid, userId: other.id, role: "MEMBER", accepted: true, joinedAt: new Date() } });
    const aliceLoan = await makeLoan(aliceHid, alice.id, other.id, { principal: 100 });
    const { POST } = await import("@/app/api/households/[hid]/loans/[loanId]/payments/route");
    const res = await call(POST, `/api/households/${bobHid}/loans/${aliceLoan.id}/payments`, { hid: bobHid, loanId: aliceLoan.id }, {
      as: bob, body: { amount: 50 },
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect((await db.loan.findUnique({ where: { id: aliceLoan.id } }))?.balanceRemaining).toBe(100);
  });
});
