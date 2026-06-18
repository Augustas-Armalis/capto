import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { env, isConfigured } from "@/lib/env";
import { priceIdFor, currencyFromString, type Interval } from "@/lib/billing";
import type { PlanId } from "@/lib/pricing";

export const runtime = "nodejs";

/**
 * Pay-first checkout. No account required: the visitor goes straight to Stripe
 * Checkout, which collects their email + card. On success we land on /welcome,
 * which creates and signs them into the account. This is what "click Get Pro,
 * pay instantly, then set up" runs on.
 */
export async function POST(req: Request) {
  if (!isConfigured.stripe()) {
    return NextResponse.json({ error: "Payments are not configured yet." }, { status: 503 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    plan?: PlanId;
    interval?: Interval;
    currency?: string;
  };
  const plan: PlanId = body.plan === "ultra" ? "ultra" : "pro";
  const interval: Interval = body.interval === "annual" ? "annual" : "monthly";
  const currency = currencyFromString(body.currency);

  const priceId = priceIdFor(plan, interval, currency);
  if (!priceId) {
    return NextResponse.json(
      { error: `No price configured for ${plan}/${interval}/${currency}.` },
      { status: 503 },
    );
  }

  const stripe = getStripe();
  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    success_url: `${env.siteUrl}/welcome?cs={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.siteUrl}/pricing?canceled=1`,
    metadata: { plan, flow: "guest" },
    subscription_data: { metadata: { plan, flow: "guest" } },
  });

  return NextResponse.json({ url: checkout.url });
}
