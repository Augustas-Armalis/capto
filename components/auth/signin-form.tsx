"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signIn } from "@/lib/auth-client";

export function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await signIn.email({ email, password, callbackURL: next });
      if (result?.error) {
        setError(result.error.message || "Couldn't sign in. Check your email and password.");
        return;
      }
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-xs font-medium text-[var(--color-fg-muted)] uppercase tracking-wider">
          Email
        </label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@studio.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="password" className="flex items-center justify-between text-xs font-medium text-[var(--color-fg-muted)] uppercase tracking-wider">
          <span>Password</span>
          <Link href="/reset-password" className="font-medium normal-case tracking-normal text-[var(--color-fg-subtle)] transition-colors hover:text-[var(--color-fg)]">
            Forgot?
          </Link>
        </label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      {error && (
        <div className="rounded-xl border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 px-3 py-2.5 text-sm text-[var(--color-danger)]">
          {error}
        </div>
      )}

      <Button type="submit" loading={loading} className="w-full" size="lg">
        {loading ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
