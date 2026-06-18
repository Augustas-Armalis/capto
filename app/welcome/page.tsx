import type { Metadata } from "next";
import { WelcomeClient } from "./welcome-client";

export const metadata: Metadata = {
  title: "Setting up your account",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ cs?: string }>;
}) {
  const { cs } = await searchParams;
  return <WelcomeClient cs={cs ?? null} />;
}
