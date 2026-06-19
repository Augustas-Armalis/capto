import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { eq } from "drizzle-orm";
import { getStripe } from "@/lib/stripe";
import { getDb, user as userTable } from "@/lib/db";
import { env, isConfigured } from "@/lib/env";
import { planFromPriceId } from "@/lib/billing";
import type { PlanId } from "@/lib/pricing";

export const runtime = "nodejs";

function isPlan(v: unknown): v is PlanId {
  return v === "free" || v === "pro" || v === "ultra";
}

export async function POST(req: Request) {
  if (!isConfigured.stripe() || !env.stripeWebhookSecret) {
    return NextResponse.json({ error: "Stripe webhook not configured." }, { status: 503 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing stripe-signature." }, { status: 400 });

  const body = await req.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, env.stripeWebhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "bad signature";
    return NextResponse.json({ error: `Webhook signature failed: ${msg}` }, { status: 400 });
  }

  const db = getDb();

  // Guest (pay-first) checkouts have no userId in metadata until /welcome runs;
  // fall back to matching the Stripe customer to a user we already stored.
  const userByCustomer = async (customerId: string | null | undefined): Promise<string | null> => {
    if (!customerId) return null;
    const [row] = await db
      .select({ id: userTable.id })
      .from(userTable)
      .where(eq(userTable.stripeCustomerId, customerId))
      .limit(1);
    return row?.id ?? null;
  };
  const custId = (c: string | { id: string } | null | undefined) =>
    typeof c === "string" ? c : c?.id ?? null;

  switch (event.type) {
    case "checkout.session.completed": {
      const cs = event.data.object as Stripe.Checkout.Session;
      const plan = isPlan(cs.metadata?.plan) ? (cs.metadata!.plan as PlanId) : "pro";
      const userId = cs.metadata?.userId || (await userByCustomer(custId(cs.customer)));
      if (userId && cs.mode === "subscription" && typeof cs.subscription === "string") {
        await db
          .update(userTable)
          .set({ plan, stripeSubscriptionId: cs.subscription, subscriptionStatus: "active" })
          .where(eq(userTable.id, userId));
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.userId || (await userByCustomer(custId(sub.customer)));
      if (userId) {
        const active = sub.status === "active" || sub.status === "trialing";
        // Authoritative plan from the subscribed price; fall back to metadata.
        const priceId = sub.items?.data?.[0]?.price?.id;
        const pricePlan = planFromPriceId(priceId);
        const metaPlan = isPlan(sub.metadata?.plan) ? (sub.metadata!.plan as PlanId) : "pro";
        const plan: PlanId = active ? (pricePlan !== "free" ? pricePlan : metaPlan) : "free";
        await db
          .update(userTable)
          .set({ plan, stripeSubscriptionId: sub.id, subscriptionStatus: sub.status })
          .where(eq(userTable.id, userId));
      }
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.userId || (await userByCustomer(custId(sub.customer)));
      if (userId) {
        await db
          .update(userTable)
          .set({ plan: "free", subscriptionStatus: "canceled" })
          .where(eq(userTable.id, userId));
      }
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
