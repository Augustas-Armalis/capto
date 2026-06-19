import type { Metadata } from "next";
import { and, eq } from "drizzle-orm";
import { OnboardingClient } from "./onboarding-client";
import { getCurrentSession } from "@/lib/session";
import { getDb, account as accountTable, user as userTable } from "@/lib/db";
import { isConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Welcome to Capto" };
export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const session = await getCurrentSession();
  const firstName = session?.user?.name?.split(" ")[0] || "there";

  // Pay-first accounts are created without a credential password; offer to set
  // one. Detected by the absence of a credential account row (self-healing:
  // shows until a password is set, even across sessions).
  let needsPassword = false;
  let needsEmailVerify = false;
  if (isConfigured.db() && session?.user?.id) {
    const db = getDb();
    const [cred] = await db
      .select({ id: accountTable.id })
      .from(accountTable)
      .where(
        and(eq(accountTable.userId, session.user.id), eq(accountTable.providerId, "credential")),
      )
      .limit(1);
    needsPassword = !cred;

    // Require email verification only when an email provider is configured.
    if (isConfigured.email()) {
      const [u] = await db
        .select({ verified: userTable.emailVerified })
        .from(userTable)
        .where(eq(userTable.id, session.user.id))
        .limit(1);
      needsEmailVerify = !!u && !u.verified;
    }
  }

  return (
    <OnboardingClient
      firstName={firstName}
      needsPassword={needsPassword}
      needsEmailVerify={needsEmailVerify}
    />
  );
}
