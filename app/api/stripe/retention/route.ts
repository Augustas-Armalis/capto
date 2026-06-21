import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getCurrentSession } from "@/lib/session";
import { getStripe } from "@/lib/stripe";
import { getDb, user as userTable } from "@/lib/db";
import { isConfigured } from "@/lib/env";

export const runtime = "nodejs";

const COUPON_ID = "capto-stay-50";

async function ensureCoupon(stripe: ReturnType<typeof getStripe>) {
  try {
    return (await stripe.coupons.retrieve(COUPON_ID)).id;
  } catch {
    try {
      const c = await stripe.coupons.create({
        id: COUPON_ID,
        percent_off: 50,
        duration: "once",
        name: "Capto — 50% off, stay with us",
      });
      return c.id;
    } catch {
      // Race: created in parallel.
      return COUPON_ID;
    }
  }
}

/**
 * Retention offer: apply a one-time 50%-off coupon to the user's subscription
 * (next invoice) and clear any pending cancellation, so they stay.
 */
export async function POST() {
  if (!isConfigured.stripe() || !isConfigured.db())
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  const session = await getCurrentSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const db = getDb();
  const [row] = await db
    .select({ subId: userTable.stripeSubscriptionId })
    .from(userTable)
    .where(eq(userTable.id, session.user.id))
    .limit(1);
  if (!row?.subId) return NextResponse.json({ error: "No active subscription." }, { status: 400 });

  try {
    const stripe = getStripe();
    const coupon = await ensureCoupon(stripe);
    // "Stay" must also cancel any pending DOWNGRADE schedule, otherwise the user
    // would still be silently moved to the lower plan at period end.
    const existing = await stripe.subscriptions.retrieve(row.subId);
    const schedId = typeof existing.schedule === "string" ? existing.schedule : existing.schedule?.id || null;
    if (schedId) { try { await stripe.subscriptionSchedules.release(schedId); } catch {} }
    await stripe.subscriptions.update(row.subId, {
      cancel_at_period_end: false,
      discounts: [{ coupon }],
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not apply the offer. Try again." }, { status: 502 });
  }
}
