import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getCurrentSession } from "@/lib/session";
import { getStripe } from "@/lib/stripe";
import { getDb, user as userTable } from "@/lib/db";
import { isConfigured } from "@/lib/env";
import { priceIdFor, type Interval, type Currency } from "@/lib/billing";
import type { PlanId } from "@/lib/pricing";

export const runtime = "nodejs";

// "friend" is admin-comped and never sold, so it never reaches this Stripe route;
// it's listed only to satisfy the exhaustive PlanId map.
const RANK: Record<PlanId, number> = { free: 0, pro: 1, ultra: 2, friend: 2 };

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

  try {
    const stripe = getStripe();
    const sub = await stripe.subscriptions.retrieve(row.subId);
    const scheduleId = typeof sub.schedule === "string" ? sub.schedule : sub.schedule?.id || null;
    // Detach any pending schedule (a previously-scheduled downgrade), leaving the
    // subscription on its current price. Used to retarget or to "keep" the plan.
    const releaseSchedule = async () => {
      if (scheduleId) { try { await stripe.subscriptionSchedules.release(scheduleId); } catch {} }
    };

    // Re-selecting the current plan = "keep it / undo any pending change".
    if (target === current) {
      await releaseSchedule();
      if (sub.cancel_at_period_end) {
        try { await stripe.subscriptions.update(row.subId, { cancel_at_period_end: false }); } catch {}
      }
      return NextResponse.json({ ok: true, effective: "kept" });
    }

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
      await releaseSchedule();
      await stripe.subscriptions.update(row.subId, {
        items: [{ id: item.id, price: targetPrice }],
        proration_behavior: "create_prorations",
        cancel_at_period_end: false,
      });
      await db.update(userTable).set({ plan: target }).where(eq(userTable.id, session.user.id));
      return NextResponse.json({ ok: true, effective: "now" });
    }

    // Downgrade → schedule the lower plan to start at the current period end.
    // Release any existing schedule first, then build a fresh two-phase one so a
    // re-targeted downgrade replaces the previous one cleanly.
    await releaseSchedule();
    const created = await stripe.subscriptionSchedules.create({ from_subscription: row.subId });
    const phase0 = created.phases[0];
    await stripe.subscriptionSchedules.update(created.id, {
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
