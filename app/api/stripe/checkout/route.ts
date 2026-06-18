import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getCurrentSession } from "@/lib/session";
import { getStripe } from "@/lib/stripe";
import { getDb, user as userTable } from "@/lib/db";
import { env, isConfigured } from "@/lib/env";
import { priceIdFor, currencyFromString, type Interval } from "@/lib/billing";
import type { PlanId } from "@/lib/pricing";

export async function POST(req: Request) {
  if (!isConfigured.stripe()) {
    return NextResponse.json(
      { error: "Stripe is not configured. Set STRIPE_SECRET_KEY and the price IDs." },
      { status: 503 },
    );
  }

  const session = await getCurrentSession();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
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
      { error: `No Stripe price configured for ${plan}/${interval}/${currency}. Add the price ID to .env.` },
      { status: 503 },
    );
  }

  const stripe = getStripe();
  const db = getDb();

  const [row] = await db
    .select({ stripeCustomerId: userTable.stripeCustomerId })
    .from(userTable)
    .where(eq(userTable.id, session.user.id))
    .limit(1);

  let customerId = row?.stripeCustomerId || null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: session.user.email,
      name: session.user.name || undefined,
      metadata: { userId: session.user.id },
    });
    customerId = customer.id;
    await db.update(userTable).set({ stripeCustomerId: customerId }).where(eq(userTable.id, session.user.id));
  }

  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,
    success_url: `${env.siteUrl}/billing?success=1`,
    cancel_url: `${env.siteUrl}/billing?canceled=1`,
    metadata: { userId: session.user.id, plan },
    subscription_data: { metadata: { userId: session.user.id, plan } },
  });

  return NextResponse.json({ url: checkout.url });
}
