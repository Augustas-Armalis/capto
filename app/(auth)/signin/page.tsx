import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { SignInForm } from "@/components/auth/signin-form";
import { getCurrentSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Capto.",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function SignInPage() {
  // Already signed in? Skip straight into the app (auto-login feel).
  const session = await getCurrentSession();
  if (session?.user) redirect("/dashboard");
  return (
    <AuthCard
      title="Welcome back."
      subtitle="Sign in to keep editing your captions where you left off."
      footer={
        <>
          New here?{" "}
          <Link href="/signup" className="font-semibold text-[var(--color-fg)] hover:text-[var(--color-brand)]">
            Create an account →
          </Link>
        </>
      }
    >
      <Suspense fallback={<div className="h-48" />}>
        <SignInForm />
      </Suspense>
    </AuthCard>
  );
}
