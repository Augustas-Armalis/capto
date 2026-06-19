import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { ResetForm } from "@/components/auth/reset-form";

export const metadata: Metadata = {
  title: "Reset password",
  description: "Reset your Capto password.",
  robots: { index: false },
};

export default function ResetPasswordPage() {
  return (
    <AuthCard
      title="Reset your password."
      subtitle="We'll email you a 6-digit code to set a new one."
      footer={
        <>
          Need an account?{" "}
          <Link href="/signup" className="font-semibold text-[var(--color-fg)] hover:text-[var(--color-brand)]">
            Create one →
          </Link>
        </>
      }
    >
      <Suspense fallback={<div className="h-48" />}>
        <ResetForm />
      </Suspense>
    </AuthCard>
  );
}
