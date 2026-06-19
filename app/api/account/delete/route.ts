import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getCurrentSession } from "@/lib/session";
import { getDb, user as userTable } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { isConfigured } from "@/lib/env";

export const runtime = "nodejs";

/**
 * Permanently delete the signed-in user. Cancels any live Stripe subscription
 * first (best effort), then deletes the user row — which cascades to sessions,
 * credential accounts, projects, stored API keys, and codes via onDelete:cascade.
 */
export async function POST() {
  if (!isConfigured.db()) return NextResponse.json({ error: "Not configured." }, { status: 503 });
  const session = await getCurrentSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const db = getDb();
  const [row] = await db
    .select({ subId: userTable.stripeSubscriptionId })
    .from(userTable)
    .where(eq(userTable.id, session.user.id))
    .limit(1);

  if (row?.subId && isConfigured.stripe()) {
    try {
      await getStripe().subscriptions.cancel(row.subId);
    } catch {
      /* best effort — proceed with deletion regardless */
    }
  }

  await db.delete(userTable).where(eq(userTable.id, session.user.id));
  // Clear the session cookie so the client is logged out immediately.
  const res = NextResponse.json({ ok: true });
  res.cookies.set("better-auth.session_token", "", { path: "/", maxAge: 0 });
  res.cookies.set("__Secure-better-auth.session_token", "", { path: "/", maxAge: 0 });
  return res;
}
