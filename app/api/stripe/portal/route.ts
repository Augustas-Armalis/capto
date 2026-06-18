import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getCurrentSession } from "@/lib/session";
import { getStripe } from "@/lib/stripe";
import { getDb, user as userTable } from "@/lib/db";
import { env, isConfigured } from "@/lib/env";

export async function POST() {
  if (!isConfigured.stripe()) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 });
  }

  const session = await getCurrentSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const db = getDb();
  const [row] = await db
    .select({ stripeCustomerId: userTable.stripeCustomerId })
    .from(userTable)
    .where(eq(userTable.id, session.user.id))
    .limit(1);

  if (!row?.stripeCustomerId) {
    return NextResponse.json({ error: "No subscription to manage yet." }, { status: 400 });
  }

  const stripe = getStripe();
  const portal = await stripe.billingPortal.sessions.create({
    customer: row.stripeCustomerId,
    return_url: `${env.siteUrl}/billing`,
  });

  return NextResponse.json({ url: portal.url });
}
