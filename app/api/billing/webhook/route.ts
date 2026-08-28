import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { verifyWebhookSignature, planIdForPrice } from "@/lib/billing";

export const dynamic = "force-dynamic";

/**
 * Stripe webhook — keeps Household.plan in sync with the actual
 * subscription. Point this at /api/billing/webhook in the Stripe dashboard
 * once STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET are set; until then Stripe
 * has nothing to call, and upgrades go through lib/billing.ts's dev-mode
 * path instead.
 */
export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = verifyWebhookSignature(body, signature);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const householdId = session.metadata?.householdId;
        const planId = session.metadata?.planId;
        if (householdId && planId && session.subscription) {
          await prisma.household.update({
            where: { id: householdId },
            data: {
              plan: planId,
              stripeSubscriptionId: String(session.subscription),
              stripeCustomerId: session.customer ? String(session.customer) : undefined,
              planUpdatedAt: new Date(),
              planCanceledAt: null,
            },
          });
        }
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const householdId = sub.metadata?.householdId;
        const priceId = sub.items.data[0]?.price.id;
        const resolved = priceId ? planIdForPrice(priceId) : null;
        if (householdId && resolved) {
          await prisma.household.update({
            where: { id: householdId },
            data: {
              plan: resolved,
              stripePriceId: priceId,
              planRenewsAt: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
              planUpdatedAt: new Date(),
            },
          });
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const householdId = sub.metadata?.householdId;
        if (householdId) {
          await prisma.household.update({
            where: { id: householdId },
            data: { plan: "free", stripeSubscriptionId: null, planCanceledAt: new Date(), planUpdatedAt: new Date() },
          });
        }
        break;
      }
    }
  } catch (err) {
    // Stripe retries on non-2xx, so surface failures instead of swallowing them.
    return NextResponse.json({ error: err instanceof Error ? err.message : "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
