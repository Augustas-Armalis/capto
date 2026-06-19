"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Phase = "email" | "code" | "done";

export function ResetForm() {
  const router = useRouter();
  const [phase, setPhase] = React.useState<Phase>("email");
  const [email, setEmail] = React.useState("");
  const [code, setCode] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [password2, setPassword2] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [cooldown, setCooldown] = React.useState(0);

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function sendCode() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/reset-password/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.status === 429) {
        setError("Too many requests. Wait a moment and try again.");
        return;
      }
      if (!res.ok) {
        setError(j.error || "Could not send the code.");
        return;
      }
      setPhase("code");
      setCooldown(30);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function confirm() {
    setError(null);
    if (code.replace(/\D/g, "").length !== 6) return setError("Enter the 6-digit code.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== password2) return setError("Passwords don't match.");
    setLoading(true);
    try {
      const res = await fetch("/api/reset-password/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, code, password }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(j.error || "Could not reset your password.");
        return;
      }
      setPhase("done");
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  if (phase === "done") {
    return (
      <div className="text-center">
        <div className="mx-auto inline-flex size-12 items-center justify-center rounded-2xl bg-[var(--color-success)]/15 text-[var(--color-success)]">
          <Check className="size-6" />
        </div>
        <h2 className="heading mt-4 text-xl text-white">Password updated.</h2>
        <p className="mt-2 text-sm text-[var(--color-fg-muted)]">
          You can now sign in with your new password.
        </p>
        <Button onClick={() => router.push("/signin")} size="lg" className="mt-6 w-full">
          Sign in
        </Button>
      </div>
    );
  }

  const errorBox = error && (
    <div className="rounded-xl border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 px-3 py-2.5 text-sm text-[var(--color-danger)]">
      {error}
    </div>
  );

  if (phase === "email") {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendCode();
        }}
        className="space-y-4"
      >
        <div className="space-y-1.5">
          <label htmlFor="reset-email" className="text-xs font-medium uppercase tracking-wider text-[var(--color-fg-muted)]">
            Email
          </label>
          <Input
            id="reset-email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@studio.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        {errorBox}
        <Button type="submit" loading={loading} size="lg" className="w-full">
          Send reset code
          <ArrowRight className="size-4" />
        </Button>
        <p className="text-center text-sm text-[var(--color-fg-subtle)]">
          Remembered it?{" "}
          <Link href="/signin" className="text-[var(--color-fg-muted)] underline-offset-2 hover:text-white hover:underline">
            Back to sign in
          </Link>
        </p>
      </form>
    );
  }

  // phase === "code"
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        confirm();
      }}
      className="space-y-4"
    >
      <p className="text-sm text-[var(--color-fg-muted)]">
        We sent a 6-digit code to <span className="text-white">{email}</span>. Enter it with your new
        password.
      </p>
      <div className="space-y-1.5">
        <label htmlFor="reset-code" className="text-xs font-medium uppercase tracking-wider text-[var(--color-fg-muted)]">
          Reset code
        </label>
        <Input
          id="reset-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="000000"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          className="mono tracking-[0.4em]"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="reset-pwd" className="text-xs font-medium uppercase tracking-wider text-[var(--color-fg-muted)]">
          New password
        </label>
        <Input
          id="reset-pwd"
          type="password"
          autoComplete="new-password"
          minLength={8}
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="reset-pwd2" className="text-xs font-medium uppercase tracking-wider text-[var(--color-fg-muted)]">
          Confirm password
        </label>
        <Input
          id="reset-pwd2"
          type="password"
          autoComplete="new-password"
          minLength={8}
          placeholder="Repeat it"
          value={password2}
          onChange={(e) => setPassword2(e.target.value)}
        />
      </div>
      {errorBox}
      <Button type="submit" loading={loading} size="lg" className="w-full">
        Reset password
        <ArrowRight className="size-4" />
      </Button>
      <button
        type="button"
        onClick={sendCode}
        disabled={loading || cooldown > 0}
        className="w-full text-center text-sm text-[var(--color-fg-muted)] transition-colors hover:text-white disabled:opacity-50"
      >
        {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
      </button>
    </form>
  );
}
