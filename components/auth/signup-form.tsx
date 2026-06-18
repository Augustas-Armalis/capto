"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signUp } from "@/lib/auth-client";

export function SignUpForm() {
  const router = useRouter();
  const params = useSearchParams();
  const plan = params.get("plan");
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      const result = await signUp.email({
        email,
        password,
        name,
        callbackURL: plan === "pro" ? "/billing?upgrade=pro" : "/onboarding",
      });
      if (result?.error) {
        setError(result.error.message || "Couldn't create your account.");
        return;
      }
      router.push(plan === "pro" ? "/billing?upgrade=pro" : "/onboarding");
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
        <label htmlFor="name" className="text-xs font-medium text-[var(--color-fg-muted)] uppercase tracking-wider">
          Your name
        </label>
        <Input
          id="name"
          autoComplete="name"
          required
          placeholder="Augustas A."
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
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
        <label htmlFor="password" className="text-xs font-medium text-[var(--color-fg-muted)] uppercase tracking-wider">
          Password
        </label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          placeholder="At least 8 characters"
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
        {loading ? "Creating your account…" : plan === "pro" ? "Create account, go Pro" : "Create account"}
      </Button>

      <p className="text-xs text-[var(--color-fg-subtle)] leading-relaxed">
        By signing up you agree to our{" "}
        <a href="/terms" className="underline underline-offset-2 hover:text-[var(--color-fg-muted)]">
          terms
        </a>{" "}
        and{" "}
        <a href="/privacy" className="underline underline-offset-2 hover:text-[var(--color-fg-muted)]">
          privacy notice
        </a>
        .
      </p>
    </form>
  );
}
