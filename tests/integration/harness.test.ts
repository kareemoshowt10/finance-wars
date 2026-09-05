import { describe, it, expect, beforeEach } from "vitest";
import { db, resetDb } from "./setup";
import { makeUser, makeHousehold, call } from "./factories";
import { GET as getHousehold, PATCH as patchHousehold } from "@/app/api/households/[hid]/route";

describe("integration harness", () => {
  beforeEach(resetDb);

  it("talks to a real database, not a mock", async () => {
    const user = await makeUser({ name: "Ada" });
    const found = await db.user.findUnique({ where: { id: user.id } });
    expect(found?.name).toBe("Ada");
  });

  it("authenticates a route handler with a real API token", async () => {
    const owner = await makeUser();
    const household = await makeHousehold(owner);
    const res = await call(getHousehold, `/api/households/${household.id}`, { hid: household.id }, { as: owner });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: household.id, name: "Test House" });
  });

  it("rejects an unauthenticated request", async () => {
    const owner = await makeUser();
    const household = await makeHousehold(owner);
    const res = await call(getHousehold, `/api/households/${household.id}`, { hid: household.id });
    expect(res.status).toBe(401);
  });

  it("rejects a revoked token", async () => {
    const owner = await makeUser();
    const household = await makeHousehold(owner);
    await db.apiToken.updateMany({ where: { userId: owner.id }, data: { revokedAt: new Date() } });
    const res = await call(getHousehold, `/api/households/${household.id}`, { hid: household.id }, { as: owner });
    expect(res.status).toBe(401);
  });

  it("persists a mutation through the handler", async () => {
    const owner = await makeUser();
    const household = await makeHousehold(owner);
    const res = await call(patchHousehold, `/api/households/${household.id}`, { hid: household.id }, {
      as: owner, method: "PATCH", body: { timezone: "Asia/Tokyo" },
    });
    expect(res.status).toBe(200);
    const row = await db.household.findUnique({ where: { id: household.id } });
    expect(row?.timezone).toBe("Asia/Tokyo");
  });

  it("truncates between tests — nothing leaks from the cases above", async () => {
    expect(await db.user.count()).toBe(0);
    expect(await db.household.count()).toBe(0);
  });
});
