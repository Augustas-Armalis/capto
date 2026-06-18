import type { Metadata } from "next";
import { OnboardingClient } from "./onboarding-client";
import { getCurrentSession } from "@/lib/session";

export const metadata: Metadata = { title: "Welcome to Capto" };

export default async function OnboardingPage() {
  const session = await getCurrentSession();
  const firstName = session?.user?.name?.split(" ")[0] || "there";
  return <OnboardingClient firstName={firstName} />;
}
