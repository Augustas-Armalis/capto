import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { BillingClient } from "./billing-client";
import { getCurrentSession } from "@/lib/session";
import { getDb, user as userTable } from "@/lib/db";
import { isConfigured } from "@/lib/env";
import { getStripe } from "@/lib/stripe";
import { planFromPriceId } from "@/lib/billing";
import type { PlanId } from "@/lib/pricing";

export const metadata: Metadata = { title: "Billing" };

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ upgrade?: string; interval?: string }>;
}) {
  const sp = await searchParams;
  const session = await getCurrentSession();

  let plan: PlanId = "free";
  let subId: string | null = null;
  if (session?.user?.id && isConfigured.db()) {
    const db = getDb();
    const [row] = await db
      .select({ plan: userTable.plan, subId: userTable.stripeSubscriptionId })
      .from(userTable)
      .where(eq(userTable.id, session.user.id))
      .limit(1);
    plan = (row?.plan as PlanId) ?? "free";
    subId = row?.subId ?? null;
  }

  // Detect a pending change so the UI can show it + let the user undo it: a
  // cancel-at-period-end (→ Free) or a scheduled downgrade (→ lower plan).
  let pendingPlan: PlanId | null = null;
  let pendingAt: number | null = null;
  if (plan !== "free" && subId && isConfigured.stripe()) {
    try {
      const sub = await getStripe().subscriptions.retrieve(subId, { expand: ["schedule"] });
      if (sub.cancel_at_period_end) {
        pendingPlan = "free";
        pendingAt = sub.current_period_end ?? null;
      } else if (sub.schedule && typeof sub.schedule !== "string" && sub.schedule.phases?.[1]) {
        const next = sub.schedule.phases[1].items?.[0]?.price;
        const pid = typeof next === "string" ? next : (next as { id?: string } | undefined)?.id;
        pendingPlan = planFromPriceId(pid);
        pendingAt = sub.schedule.phases[0].end_date ?? null;
      }
    } catch {
      // non-fatal — billing page still renders without the pending banner
    }
  }

  const upgrade = sp.upgrade === "pro" || sp.upgrade === "ultra" ? (sp.upgrade as PlanId) : null;
  const interval = sp.interval === "annual" ? "annual" : "monthly";

  return (
    <BillingClient
      plan={plan}
      autoUpgrade={upgrade}
      autoInterval={interval}
      stripeReady={isConfigured.stripe()}
      pendingPlan={pendingPlan}
      pendingAt={pendingAt}
    />
  );
}
