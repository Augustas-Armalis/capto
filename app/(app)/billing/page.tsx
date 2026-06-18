import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { BillingClient } from "./billing-client";
import { getCurrentSession } from "@/lib/session";
import { getDb, user as userTable } from "@/lib/db";
import { isConfigured } from "@/lib/env";
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
  if (session?.user?.id && isConfigured.db()) {
    const db = getDb();
    const [row] = await db
      .select({ plan: userTable.plan })
      .from(userTable)
      .where(eq(userTable.id, session.user.id))
      .limit(1);
    plan = (row?.plan as PlanId) ?? "free";
  }

  const upgrade = sp.upgrade === "pro" || sp.upgrade === "ultra" ? (sp.upgrade as PlanId) : null;
  const interval = sp.interval === "annual" ? "annual" : "monthly";

  return (
    <BillingClient
      plan={plan}
      autoUpgrade={upgrade}
      autoInterval={interval}
      stripeReady={isConfigured.stripe()}
    />
  );
}
