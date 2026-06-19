import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { and, eq } from "drizzle-orm";
import { getStripe } from "@/lib/stripe";
import { getAuth } from "@/lib/auth";
import { getDb, user as userTable, account as accountTable } from "@/lib/db";
import { isConfigured } from "@/lib/env";
import { planFromPriceId } from "@/lib/billing";
import type { PlanId } from "@/lib/pricing";

export const runtime = "nodejs";
export const maxDuration = 30;

function nameFromEmail(email: string): string {
  const local = email.split("@")[0] || "there";
  const first = local.split(/[._-]+/)[0] || local;
  return first.charAt(0).toUpperCase() + first.slice(1);
}

function isPlan(v: unknown): v is PlanId {
  return v === "free" || v === "pro" || v === "ultra";
}

/**
 * Finalize a pay-first checkout. Security model:
 *  - Only acts on a genuinely PAID guest subscription session (rejects unpaid
 *    and 100%-off "no_payment_required", wrong flow, or wrong mode).
 *  - NEW email -> create the account (no password yet), verify it (Stripe
 *    confirmed a paying address), sign the caller in, set the plan. The real
 *    password is chosen in onboarding via better-auth setPassword (no password
 *    is ever transported in a cookie).
 *  - EXISTING email -> never mutate that account from this unauthenticated
 *    route; stamp the subscription's metadata.userId so the signature-verified
 *    webhook applies the upgrade, and tell the caller to sign in.
 * This makes the route idempotent: a replay of a new-account checkout finds the
 * now-existing user and falls through to the harmless "existing" path.
 */
export async function POST(req: Request) {
  if (!isConfigured.stripe() || !isConfigured.db() || !isConfigured.auth()) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  const { cs } = (await req.json().catch(() => ({}))) as { cs?: string };
  if (!cs || typeof cs !== "string") {
    return NextResponse.json({ error: "Missing checkout session." }, { status: 400 });
  }

  const stripe = getStripe();
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(cs, {
      expand: ["subscription", "line_items.data.price", "customer"],
    });
  } catch {
    return NextResponse.json({ error: "Could not find that checkout." }, { status: 404 });
  }

  // Strict gates: real money, our guest flow, a subscription. Rejects 100%-off
  // (no_payment_required), unpaid sessions, and non-guest/non-subscription ids.
  if (session.payment_status !== "paid") {
    return NextResponse.json({ error: "Payment not completed." }, { status: 402 });
  }
  if (session.mode !== "subscription" || session.metadata?.flow !== "guest") {
    return NextResponse.json({ error: "Unexpected checkout." }, { status: 400 });
  }

  const email = (session.customer_details?.email || "").toLowerCase().trim();
  if (!email) return NextResponse.json({ error: "No email on the checkout." }, { status: 400 });

  const customerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id || null;
  const subscription = session.subscription as Stripe.Subscription | string | null;
  const subscriptionId = typeof subscription === "string" ? subscription : subscription?.id || null;
  const priceId = session.line_items?.data?.[0]?.price?.id;
  const metaPlan = isPlan(session.metadata?.plan) ? (session.metadata!.plan as PlanId) : "pro";
  const plan: PlanId = planFromPriceId(priceId) !== "free" ? planFromPriceId(priceId) : metaPlan;

  const db = getDb();
  const auth = getAuth();

  const [existing] = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(eq(userTable.email, email))
    .limit(1);

  // Existing account: do NOT touch it from here. Stamp the subscription so the
  // signature-verified webhook upgrades the right user, then send them to sign in.
  if (existing) {
    if (subscriptionId) {
      await stripe.subscriptions
        .update(subscriptionId, { metadata: { userId: existing.id, plan } })
        .catch(() => {});
    }
    return NextResponse.json({ status: "existing", email });
  }

  // New account: create it with a throwaway password to obtain a session, then
  // immediately drop that credential so NO password exists. Onboarding sets the
  // real one via setPassword. This means no password is ever stored in a cookie.
  const throwaway = `Cx_${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, "");
  let setCookies: string[] = [];
  try {
    const authRes = await auth.api.signUpEmail({
      body: { email, name: nameFromEmail(email), password: throwaway },
      asResponse: true,
    });
    setCookies =
      typeof authRes.headers.getSetCookie === "function" ? authRes.headers.getSetCookie() : [];
  } catch {
    // Race: created by a parallel call. Fall through to sign-in.
    return NextResponse.json({ status: "existing", email });
  }

  const [created] = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(eq(userTable.email, email))
    .limit(1);
  if (!created) return NextResponse.json({ error: "Account setup failed." }, { status: 500 });

  // Remove the credential password so the account has none; onboarding will
  // link a fresh one via setPassword (session-gated).
  await db
    .delete(accountTable)
    .where(and(eq(accountTable.userId, created.id), eq(accountTable.providerId, "credential")));

  await db
    .update(userTable)
    .set({
      plan,
      emailVerified: true,
      stripeCustomerId: customerId || undefined,
      stripeSubscriptionId: subscriptionId || undefined,
      subscriptionStatus: "active",
    })
    .where(eq(userTable.id, created.id));

  if (subscriptionId) {
    await stripe.subscriptions
      .update(subscriptionId, { metadata: { userId: created.id, plan } })
      .catch(() => {});
  }

  const res = NextResponse.json({ status: "created", email, plan });
  for (const c of setCookies) res.headers.append("set-cookie", c);
  return res;
}
