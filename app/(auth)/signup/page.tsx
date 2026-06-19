import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { SignUpForm } from "@/components/auth/signup-form";

export const metadata: Metadata = {
  title: "Create your account",
  description: "Start captioning your videos with Capto, free.",
  robots: { index: false },
};

export default function SignUpPage() {
  return (
    <AuthCard
      title="Caption your first reel."
      subtitle="Free forever with your own Groq key. Upgrade when you want unlimited and no watermark."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/signin" className="font-semibold text-[var(--color-fg)] hover:text-[var(--color-brand)]">
            Sign in →
          </Link>
        </>
      }
    >
      <Suspense fallback={<div className="h-64" />}>
        <SignUpForm />
      </Suspense>
    </AuthCard>
  );
}
