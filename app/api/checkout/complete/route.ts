import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { eq } from "drizzle-orm";
import { getStripe } from "@/lib/stripe";
import { getAuth } from "@/lib/auth";
import { getDb, user as userTable } from "@/lib/db";
import { encrypt } from "@/lib/crypto";
import { env, isConfigured } from "@/lib/env";
import { planFromPriceId } from "@/lib/billing";
import type { PlanId } from "@/lib/pricing";

export const runtime = "nodejs";
export const maxDuration = 30;

const SETUP_COOKIE = "capto_setup";

function nameFromEmail(email: string): string {
  const local = email.split("@")[0] || "there";
  const first = local.split(/[._-]+/)[0] || local;
  return first.charAt(0).toUpperCase() + first.slice(1);
}

function isPlan(v: unknown): v is PlanId {
  return v === "free" || v === "pro" || v === "ultra";
}

/**
 * Finalize a pay-first checkout: confirm the Stripe session is paid, then
 * create + sign in the account (or upgrade an existing one). New accounts get a
 * temporary password; the real one is set during onboarding. Email is marked
 * verified because Stripe already confirmed a working address + payment.
 */
export async function POST(req: Request) {
  if (!isConfigured.stripe() || !isConfigured.db() || !isConfigured.auth()) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  const { cs } = (await req.json().catch(() => ({}))) as { cs?: string };
  if (!cs) return NextResponse.json({ error: "Missing checkout session." }, { status: 400 });

  const stripe = getStripe();
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(cs, {
      expand: ["subscription", "line_items.data.price", "customer"],
    });
  } catch {
    return NextResponse.json({ error: "Could not find that checkout." }, { status: 404 });
  }

  const paid = session.status === "complete" || session.payment_status === "paid";
  if (!paid) return NextResponse.json({ error: "Payment not completed." }, { status: 402 });

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

  // Already have an account: upgrade the plan, send them to sign in.
  if (existing) {
    await db
      .update(userTable)
      .set({
        plan,
        stripeCustomerId: customerId || undefined,
        stripeSubscriptionId: subscriptionId || undefined,
        subscriptionStatus: "active",
      })
      .where(eq(userTable.id, existing.id));
    if (subscriptionId) {
      await stripe.subscriptions
        .update(subscriptionId, { metadata: { userId: existing.id, plan } })
        .catch(() => {});
    }
    return NextResponse.json({ status: "existing", email });
  }

  // New account: create + sign in with a temporary password.
  const tempPwd = `Cx_${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, "");
  let setCookies: string[] = [];
  try {
    const authRes = await auth.api.signUpEmail({
      body: { email, name: nameFromEmail(email), password: tempPwd },
      asResponse: true,
    });
    setCookies =
      typeof authRes.headers.getSetCookie === "function" ? authRes.headers.getSetCookie() : [];
  } catch {
    // Race: the account was created by a parallel call. Tell the client to sign in.
    return NextResponse.json({ status: "existing", email });
  }

  const [created] = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(eq(userTable.email, email))
    .limit(1);
  if (!created) return NextResponse.json({ error: "Account setup failed." }, { status: 500 });

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

  const res = NextResponse.json({ status: "created", email, plan, needsPassword: true });
  // Forward better-auth's session cookie(s) so they're logged in.
  for (const c of setCookies) res.headers.append("set-cookie", c);
  // Short-lived, encrypted handle so onboarding can set the real password.
  res.cookies.set(SETUP_COOKIE, encrypt(tempPwd), {
    httpOnly: true,
    sameSite: "lax",
    secure: env.siteUrl.startsWith("https"),
    path: "/",
    maxAge: 60 * 30,
  });
  return res;
}
