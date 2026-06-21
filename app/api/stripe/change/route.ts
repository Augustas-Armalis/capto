import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getCurrentSession } from "@/lib/session";
import { getStripe } from "@/lib/stripe";
import { getDb, user as userTable } from "@/lib/db";
import { isConfigured } from "@/lib/env";
import { priceIdFor, type Interval, type Currency } from "@/lib/billing";
import type { PlanId } from "@/lib/pricing";

export const runtime = "nodejs";

const RANK: Record<PlanId, number> = { free: 0, pro: 1, ultra: 2 };

/**
 * Change an EXISTING paid subscription between paid plans, in-place — never a
 * second subscription (that's what the checkout route would do for new subs).
 *  - Upgrade (Pro → Ultra): switch the price now, prorated.
 *  - Downgrade (Ultra → Pro): schedule the switch for the END of the current
 *    period via a subscription schedule, so the user keeps Ultra until it's paid
 *    through, then rolls to Pro automatically. The webhook flips the stored plan.
 * Downgrading to Free is "cancel at period end" — handled by /api/stripe/cancel.
 */
export async function POST(req: Request) {
  if (!isConfigured.stripe() || !isConfigured.db())
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  const session = await getCurrentSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { plan?: PlanId };
  const target: PlanId = body.plan === "ultra" ? "ultra" : "pro";

  const db = getDb();
  const [row] = await db
    .select({ subId: userTable.stripeSubscriptionId, plan: userTable.plan })
    .from(userTable)
    .where(eq(userTable.id, session.user.id))
    .limit(1);

  const current = (row?.plan || "free") as PlanId;
  if (!row?.subId) {
    return NextResponse.json({ error: "No active subscription — use checkout." }, { status: 400 });
  }
  if (target === current) return NextResponse.json({ ok: true, effective: "none" });

  try {
    const stripe = getStripe();
    const sub = await stripe.subscriptions.retrieve(row.subId);
    const item = sub.items.data[0];
    if (!item) return NextResponse.json({ error: "Subscription has no items." }, { status: 400 });

    // Keep the user's existing billing cadence + currency when switching plans.
    const interval: Interval = item.price.recurring?.interval === "year" ? "annual" : "monthly";
    const currency: Currency = item.price.currency === "usd" ? "usd" : "eur";
    const targetPrice = priceIdFor(target, interval, currency);
    if (!targetPrice) {
      return NextResponse.json({ error: `No Stripe price for ${target}/${interval}/${currency}.` }, { status: 503 });
    }

    if (RANK[target] > RANK[current]) {
      // Upgrade now, prorated; clear any pending cancellation/schedule.
      if (sub.schedule) {
        try { await stripe.subscriptionSchedules.release(typeof sub.schedule === "string" ? sub.schedule : sub.schedule.id); } catch {}
      }
      await stripe.subscriptions.update(row.subId, {
        items: [{ id: item.id, price: targetPrice }],
        proration_behavior: "create_prorations",
        cancel_at_period_end: false,
      });
      await db.update(userTable).set({ plan: target }).where(eq(userTable.id, session.user.id));
      return NextResponse.json({ ok: true, effective: "now" });
    }

    // Downgrade → schedule the lower plan to start at the current period end.
    let scheduleId = typeof sub.schedule === "string" ? sub.schedule : sub.schedule?.id || null;
    if (!scheduleId) {
      const created = await stripe.subscriptionSchedules.create({ from_subscription: row.subId });
      scheduleId = created.id;
    }
    const schedule = await stripe.subscriptionSchedules.retrieve(scheduleId);
    const phase0 = schedule.phases[0];
    await stripe.subscriptionSchedules.update(scheduleId, {
      end_behavior: "release",
      phases: [
        {
          items: [{ price: item.price.id, quantity: 1 }],
          start_date: phase0.start_date,
          end_date: phase0.end_date,
        },
        { items: [{ price: targetPrice, quantity: 1 }] },
      ],
    });
    return NextResponse.json({ ok: true, effective: "period_end", at: phase0.end_date });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not change plan.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
