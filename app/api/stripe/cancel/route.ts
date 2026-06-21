import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getCurrentSession } from "@/lib/session";
import { getStripe } from "@/lib/stripe";
import { getDb, user as userTable } from "@/lib/db";
import { isConfigured } from "@/lib/env";

export const runtime = "nodejs";

/** Schedule cancellation at the end of the current period (keeps access until then). */
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
    // A schedule-managed subscription (a pending downgrade) can't take
    // cancel_at_period_end directly — release the schedule first.
    const existing = await stripe.subscriptions.retrieve(row.subId);
    const schedId = typeof existing.schedule === "string" ? existing.schedule : existing.schedule?.id || null;
    if (schedId) { try { await stripe.subscriptionSchedules.release(schedId); } catch {} }
    const sub = await stripe.subscriptions.update(row.subId, { cancel_at_period_end: true });
    return NextResponse.json({ ok: true, endsAt: sub.current_period_end });
  } catch {
    return NextResponse.json({ error: "Could not cancel. Try the billing portal." }, { status: 502 });
  }
}
