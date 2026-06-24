import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { SettingsClient } from "./settings-client";
import { getCurrentSession } from "@/lib/session";
import { getDb, user as userTable } from "@/lib/db";
import { isConfigured } from "@/lib/env";
import { isAdmin } from "@/lib/admin";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getCurrentSession();
  let plan: "free" | "pro" | "ultra" = "free";
  let subscriptionStatus: string | null = null;
  let image: string | null = session?.user?.image ?? null;
  let aiProvider = "auto";
  let aiUseOwnKey = false;
  if (isConfigured.db() && session?.user?.id) {
    const db = getDb();
    const [u] = await db
      .select({
        plan: userTable.plan,
        status: userTable.subscriptionStatus,
        image: userTable.image,
        aiProvider: userTable.aiProvider,
        aiUseOwnKey: userTable.aiUseOwnKey,
      })
      .from(userTable)
      .where(eq(userTable.id, session.user.id))
      .limit(1);
    if (u?.plan) plan = u.plan === "friend" ? "ultra" : u.plan; // friend = ultra-level access
    subscriptionStatus = u?.status ?? null;
    image = u?.image ?? image;
    aiProvider = u?.aiProvider ?? "auto";
    aiUseOwnKey = u?.aiUseOwnKey ?? false;
  }
  return (
    <SettingsClient
      name={session?.user?.name || ""}
      email={session?.user?.email || ""}
      image={image}
      plan={plan}
      subscriptionStatus={subscriptionStatus}
      aiProvider={aiProvider}
      aiUseOwnKey={aiUseOwnKey}
      isAdmin={isAdmin(session?.user?.email)}
    />
  );
}
