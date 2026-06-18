import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { SignInForm } from "@/components/auth/signin-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Capto.",
};

export default function SignInPage() {
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
