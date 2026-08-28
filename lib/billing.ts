import Stripe from "stripe";
import { prisma } from "./prisma";
import { PlanId, planById } from "./plans";

/**
 * Billing integration for Household plans.
 *
 * Real money only moves once STRIPE_SECRET_KEY is set (a real Stripe
 * account + price IDs for Rhythm/Household HQ). Until then, `isConfigured()`
 * is false and every call here falls back to a "dev mode" upgrade — it sets
 * `Household.plan` directly, no checkout, no charge — so the whole plan/
 * paywall flow is testable end-to-end before a Stripe account exists.
 *
 * To go live: set STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, and
 * STRIPE_PRICE_RHYTHM / STRIPE_PRICE_HOUSEHOLD_HQ (price ids from the
 * Stripe dashboard), then point Stripe's webhook at /api/billing/webhook.
 */

let _stripe: Stripe | null = null;

export function isConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

function stripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not set");
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return _stripe;
}

const PRICE_ENV: Record<"rhythm" | "household_hq", string> = {
  rhythm: "STRIPE_PRICE_RHYTHM",
  household_hq: "STRIPE_PRICE_HOUSEHOLD_HQ",
};

function priceIdFor(planId: "rhythm" | "household_hq"): string {
  const id = process.env[PRICE_ENV[planId]];
  if (!id) throw new Error(`${PRICE_ENV[planId]} is not set`);
  return id;
}

export type CheckoutResult = { url: string } | { devMode: true; plan: PlanId };

/**
 * Start (or fast-path, in dev mode) an upgrade to a paid plan. `appUrl` is
 * the origin to build Stripe's success/cancel redirect from.
 */
export async function startUpgrade(
  householdId: string,
  planId: "rhythm" | "household_hq",
  userEmail: string,
  appUrl: string
): Promise<CheckoutResult> {
  if (!isConfigured()) {
    // Dev mode: no Stripe account yet. Upgrade immediately so the rest of
    // the paywall (limits lifting, UI unlocking) is fully testable.
    await prisma.household.update({
      where: { id: householdId },
      data: { plan: planId, planUpdatedAt: new Date(), planRenewsAt: null, planCanceledAt: null },
    });
    return { devMode: true, plan: planId };
  }

  const household = await prisma.household.findUnique({ where: { id: householdId } });
  if (!household) throw new Error("Household not found");

  let customerId = household.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe().customers.create({ email: userEmail, metadata: { householdId } });
    customerId = customer.id;
    await prisma.household.update({ where: { id: householdId }, data: { stripeCustomerId: customerId } });
  }

  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceIdFor(planId), quantity: 1 }],
    success_url: `${appUrl}/dashboard/billing?upgraded=1`,
    cancel_url: `${appUrl}/dashboard/billing`,
    metadata: { householdId, planId },
    subscription_data: { metadata: { householdId, planId } },
  });

  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return { url: session.url };
}

/** Downgrade to Free. In dev mode this is immediate; live, it cancels the Stripe subscription. */
export async function downgradeToFree(householdId: string): Promise<void> {
  const household = await prisma.household.findUnique({ where: { id: householdId } });
  if (!household) throw new Error("Household not found");

  if (isConfigured() && household.stripeSubscriptionId) {
    await stripe().subscriptions.cancel(household.stripeSubscriptionId);
  }
  await prisma.household.update({
    where: { id: householdId },
    data: { plan: "free", planUpdatedAt: new Date(), planCanceledAt: new Date(), stripeSubscriptionId: null },
  });
}

/** Link into Stripe's hosted billing portal (manage payment method, cancel, invoices). Live only. */
export async function createPortalSession(householdId: string, appUrl: string): Promise<string> {
  if (!isConfigured()) throw new Error("Billing is not configured yet — there's no real subscription to manage.");
  const household = await prisma.household.findUnique({ where: { id: householdId } });
  if (!household?.stripeCustomerId) throw new Error("No billing account on file for this household");

  const session = await stripe().billingPortal.sessions.create({
    customer: household.stripeCustomerId,
    return_url: `${appUrl}/dashboard/billing`,
  });
  return session.url;
}

export function verifyWebhookSignature(payload: string | Buffer, signature: string): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");
  return stripe().webhooks.constructEvent(payload, signature, secret);
}

/** Resolve a Stripe price id back to one of our plan ids, for webhook handling. */
export function planIdForPrice(priceId: string): PlanId | null {
  if (priceId === process.env.STRIPE_PRICE_RHYTHM) return "rhythm";
  if (priceId === process.env.STRIPE_PRICE_HOUSEHOLD_HQ) return "household_hq";
  return null;
}

export { planById };
