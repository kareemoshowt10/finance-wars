import { describe, it, expect, beforeEach, beforeAll, afterAll } from "vitest";
import Stripe from "stripe";
import { db, resetDb } from "./setup";
import { makeUser, makeHousehold, buildRequest, call, type TestUser } from "./factories";

/**
 * The Stripe webhook is the only thing keeping Household.plan honest once
 * money is real: if it silently breaks, cancellations stop downgrading and
 * failed payments keep serving paid features indefinitely. It had no tests.
 *
 * Signatures are generated with Stripe's own
 * `webhooks.generateTestHeaderString`, so verification runs through the real
 * library rather than a stub — a payload signed with the wrong secret has to
 * actually fail.
 */
const WEBHOOK_SECRET = "whsec_test_secret_for_integration";
const PRICE_RHYTHM = "price_rhythm_test";
const PRICE_HQ = "price_hq_test";

const stripe = new Stripe("sk_test_dummy_key_for_signing");

function signedRequest(event: Record<string, unknown>, secret = WEBHOOK_SECRET) {
  const payload = JSON.stringify(event);
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret });
  return { payload, signature };
}

/** Route modules read env at call time, so these can be set per-suite. */
let priorEnv: Record<string, string | undefined>;
beforeAll(() => {
  priorEnv = {
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    STRIPE_PRICE_RHYTHM: process.env.STRIPE_PRICE_RHYTHM,
    STRIPE_PRICE_HOUSEHOLD_HQ: process.env.STRIPE_PRICE_HOUSEHOLD_HQ,
  };
  process.env.STRIPE_SECRET_KEY = "sk_test_dummy_key_for_signing";
  process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET;
  process.env.STRIPE_PRICE_RHYTHM = PRICE_RHYTHM;
  process.env.STRIPE_PRICE_HOUSEHOLD_HQ = PRICE_HQ;
});
afterAll(() => {
  for (const [k, v] of Object.entries(priorEnv)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

async function postWebhook(event: Record<string, unknown>, secret = WEBHOOK_SECRET) {
  const { POST } = await import("@/app/api/billing/webhook/route");
  const { payload, signature } = signedRequest(event, secret);
  const req = buildRequest("/api/billing/webhook", {
    method: "POST", rawBody: payload, headers: { "stripe-signature": signature },
  });
  const res = await POST(req);
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : {} };
}

describe("stripe webhook", () => {
  let owner: TestUser, hid: string;

  beforeEach(async () => {
    await resetDb();
    owner = await makeUser();
    hid = (await makeHousehold(owner, [], { plan: "free" })).id;
  });

  it("rejects a request with no signature header", async () => {
    const { POST } = await import("@/app/api/billing/webhook/route");
    const res = await POST(buildRequest("/api/billing/webhook", { method: "POST", rawBody: "{}" }));
    expect(res.status).toBe(400);
  });

  it("rejects a payload signed with the wrong secret", async () => {
    const res = await postWebhook(
      { id: "evt_1", type: "checkout.session.completed", data: { object: {} } },
      "whsec_a_different_secret"
    );
    expect(res.status).toBe(400);
    expect((await db.household.findUnique({ where: { id: hid } }))?.plan).toBe("free");
  });

  it("rejects a tampered payload — the signature must cover the body", async () => {
    const { signature } = signedRequest({ id: "evt_1", type: "checkout.session.completed", data: { object: {} } });
    const { POST } = await import("@/app/api/billing/webhook/route");
    const res = await POST(buildRequest("/api/billing/webhook", {
      method: "POST",
      rawBody: JSON.stringify({ id: "evt_1", type: "customer.subscription.deleted", data: { object: { metadata: { householdId: "x" } } } }),
      headers: { "stripe-signature": signature },
    }));
    expect(res.status).toBe(400);
  });

  it("upgrades the household on checkout.session.completed", async () => {
    const res = await postWebhook({
      id: "evt_checkout",
      type: "checkout.session.completed",
      data: { object: { id: "cs_1", subscription: "sub_123", customer: "cus_456", metadata: { householdId: hid, planId: "rhythm" } } },
    });
    expect(res.status).toBe(200);

    const hh = await db.household.findUnique({ where: { id: hid } });
    expect(hh).toMatchObject({
      plan: "rhythm",
      stripeSubscriptionId: "sub_123",
      stripeCustomerId: "cus_456",
      planCanceledAt: null,
    });
    expect(hh?.planUpdatedAt).toBeInstanceOf(Date);
  });

  it("ignores a checkout for an unknown household rather than 500ing", async () => {
    const res = await postWebhook({
      id: "evt_unknown",
      type: "checkout.session.completed",
      data: { object: { id: "cs_2", subscription: "sub_x", metadata: { planId: "rhythm" } } },
    });
    expect(res.status).toBe(200);
    expect((await db.household.findUnique({ where: { id: hid } }))?.plan).toBe("free");
  });

  it("moves the plan and renewal date on customer.subscription.updated", async () => {
    const periodEnd = Math.floor(new Date("2027-01-15T00:00:00Z").getTime() / 1000);
    const res = await postWebhook({
      id: "evt_updated",
      type: "customer.subscription.updated",
      data: { object: { id: "sub_123", metadata: { householdId: hid }, current_period_end: periodEnd, items: { data: [{ price: { id: PRICE_HQ } }] } } },
    });
    expect(res.status).toBe(200);

    const hh = await db.household.findUnique({ where: { id: hid } });
    expect(hh?.plan).toBe("household_hq");
    expect(hh?.stripePriceId).toBe(PRICE_HQ);
    expect(hh?.planRenewsAt?.toISOString()).toBe("2027-01-15T00:00:00.000Z");
  });

  it("leaves the plan alone for a price id it doesn't recognise", async () => {
    await db.household.update({ where: { id: hid }, data: { plan: "rhythm" } });
    const res = await postWebhook({
      id: "evt_unknown_price",
      type: "customer.subscription.updated",
      data: { object: { id: "sub_123", metadata: { householdId: hid }, items: { data: [{ price: { id: "price_someone_elses" } }] } } },
    });
    expect(res.status).toBe(200);
    expect((await db.household.findUnique({ where: { id: hid } }))?.plan).toBe("rhythm");
  });

  it("downgrades to free on customer.subscription.deleted", async () => {
    await db.household.update({ where: { id: hid }, data: { plan: "household_hq", stripeSubscriptionId: "sub_123" } });
    const res = await postWebhook({
      id: "evt_deleted",
      type: "customer.subscription.deleted",
      data: { object: { id: "sub_123", metadata: { householdId: hid } } },
    });
    expect(res.status).toBe(200);

    const hh = await db.household.findUnique({ where: { id: hid } });
    expect(hh?.plan).toBe("free");
    expect(hh?.stripeSubscriptionId).toBeNull();
    expect(hh?.planCanceledAt).toBeInstanceOf(Date);
  });

  it("acknowledges event types it doesn't handle", async () => {
    const res = await postWebhook({ id: "evt_other", type: "invoice.paid", data: { object: {} } });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ received: true });
  });

  it("returns 5xx when the database write fails, so Stripe retries", async () => {
    // A subscription update naming a household that was deleted between the
    // checkout and the webhook: prisma.update throws, and swallowing it would
    // silently drop a real plan change.
    const res = await postWebhook({
      id: "evt_missing_household",
      type: "customer.subscription.deleted",
      data: { object: { id: "sub_x", metadata: { householdId: "cl_household_that_never_existed" } } },
    });
    expect(res.status).toBe(500);
  });
});

describe("billing: dev-mode fallback", () => {
  let owner: TestUser, hid: string;

  beforeEach(async () => {
    await resetDb();
    owner = await makeUser();
    hid = (await makeHousehold(owner, [], { plan: "free" })).id;
  });

  it("upgrades instantly and charges nothing when Stripe is unconfigured", async () => {
    const key = process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_SECRET_KEY;
    try {
      const { POST } = await import("@/app/api/households/[hid]/billing/checkout/route");
      const res = await call<{ devMode?: boolean; url?: string }>(
        POST, `/api/households/${hid}/billing/checkout`, { hid }, { as: owner, body: { planId: "rhythm" } }
      );
      expect(res.status).toBe(200);
      expect(res.body.devMode).toBe(true);
      expect(res.body.url).toBeUndefined();
      expect((await db.household.findUnique({ where: { id: hid } }))?.plan).toBe("rhythm");
    } finally {
      if (key) process.env.STRIPE_SECRET_KEY = key;
    }
  });

  it("refuses to open a billing portal when there is no real subscription", async () => {
    const key = process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_SECRET_KEY;
    try {
      const { POST } = await import("@/app/api/households/[hid]/billing/portal/route");
      const res = await call(POST, `/api/households/${hid}/billing/portal`, { hid }, { as: owner, method: "POST" });
      expect(res.status).toBeGreaterThanOrEqual(400);
    } finally {
      if (key) process.env.STRIPE_SECRET_KEY = key;
    }
  });
});
