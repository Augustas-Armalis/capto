import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { SettingsClient } from "./settings-client";
import { getCurrentSession } from "@/lib/session";
import { getDb, user as userTable } from "@/lib/db";
import { isConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getCurrentSession();
  let plan: "free" | "pro" | "ultra" = "free";
  let subscriptionStatus: string | null = null;
  if (isConfigured.db() && session?.user?.id) {
    const db = getDb();
    const [u] = await db
      .select({ plan: userTable.plan, status: userTable.subscriptionStatus })
      .from(userTable)
      .where(eq(userTable.id, session.user.id))
      .limit(1);
    if (u?.plan) plan = u.plan;
    subscriptionStatus = u?.status ?? null;
  }
  return (
    <SettingsClient
      name={session?.user?.name || ""}
      email={session?.user?.email || ""}
      plan={plan}
      subscriptionStatus={subscriptionStatus}
    />
  );
}
