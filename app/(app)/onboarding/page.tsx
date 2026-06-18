import type { Metadata } from "next";
import { cookies } from "next/headers";
import { OnboardingClient } from "./onboarding-client";
import { getCurrentSession } from "@/lib/session";

export const metadata: Metadata = { title: "Welcome to Capto" };
export const dynamic = "force-dynamic";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const [session, { welcome }, jar] = await Promise.all([
    getCurrentSession(),
    searchParams,
    cookies(),
  ]);
  const firstName = session?.user?.name?.split(" ")[0] || "there";
  // Pay-first arrivals carry the short-lived setup cookie; offer to set a password.
  const needsPassword = welcome === "1" && !!jar.get("capto_setup");
  return <OnboardingClient firstName={firstName} needsPassword={needsPassword} />;
}
