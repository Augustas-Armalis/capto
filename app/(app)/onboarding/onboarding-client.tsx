"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, KeyRound, Sparkles, ExternalLink, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PoweredByContles } from "@/components/marketing/powered-by-contles";

export function OnboardingClient({
  firstName,
  needsPassword = false,
  needsEmailVerify = false,
  plan = "free",
}: {
  firstName: string;
  needsPassword?: boolean;
  needsEmailVerify?: boolean;
  plan?: "free" | "pro" | "ultra";
}) {
  const router = useRouter();
  // Paid plans run on managed AI by default, so the BYOK step is free-only.
  const showKeyStep = plan === "free";
  const doneStep = showKeyStep ? 2 : 1;
  const STEPS: string[] = showKeyStep
    ? [needsPassword ? "Set password" : "Welcome", "Connect your AI", "You're set"]
    : [needsPassword ? "Set password" : "Welcome", "You're set"];
  const [emailDone, setEmailDone] = React.useState(!needsEmailVerify);
  const [step, setStep] = React.useState(0);
  const [groqKey, setGroqKey] = React.useState("");
  const [skip, setSkip] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Pay-first password setup (replaces the Welcome step when needsPassword).
  const [password, setPassword] = React.useState("");
  const [password2, setPassword2] = React.useState("");
  const [pwdSaving, setPwdSaving] = React.useState(false);
  const [pwdErr, setPwdErr] = React.useState<string | null>(null);

  async function savePassword() {
    setPwdErr(null);
    if (password.length < 8) return setPwdErr("Use at least 8 characters.");
    if (password !== password2) return setPwdErr("Passwords don't match.");
    setPwdSaving(true);
    try {
      const res = await fetch("/api/account/finish-setup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Could not set your password.");
      setStep(1);
    } catch (err) {
      setPwdErr(err instanceof Error ? err.message : "Could not set your password.");
    } finally {
      setPwdSaving(false);
    }
  }

  async function saveAndFinish() {
    setSaving(true);
    setError(null);
    try {
      if (!skip && groqKey.trim().length > 0) {
        const res = await fetch("/api/user/api-keys", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ provider: "groq", key: groqKey.trim() }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || "Couldn't save your key.");
        }
      }
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  if (!emailDone) {
    return <EmailVerify onDone={() => setEmailDone(true)} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="absolute inset-0 blueprint blueprint-fade pointer-events-none" />
      <div className="relative w-full max-w-2xl">
        {/* Progress */}
        <div className="mb-8 flex items-center gap-3">
          {STEPS.map((label, i) => (
            <React.Fragment key={label}>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "inline-flex size-7 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                    i < step
                      ? "bg-[var(--color-brand)] text-[var(--color-brand-ink)]"
                      : i === step
                      ? "bg-[var(--color-brand)]/15 text-[var(--color-brand)] border border-[var(--color-brand)]/40"
                      : "bg-[var(--color-bg-elev)] text-[var(--color-fg-subtle)] border border-[var(--color-border)]",
                  )}
                >
                  {i < step ? <Check className="size-3.5" /> : i + 1}
                </span>
                <span
                  className={cn(
                    "hidden sm:inline text-sm",
                    i <= step ? "text-[var(--color-fg)]" : "text-[var(--color-fg-subtle)]",
                  )}
                >
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className="flex-1 h-px bg-[var(--color-border)]" />
              )}
            </React.Fragment>
          ))}
        </div>

        <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-8 sm:p-10">
          {step === 0 && needsPassword && (
            <div className="fade-up">
              <Badge variant="brand">
                <Sparkles className="size-3" />
                Payment confirmed
              </Badge>
              <h1 className="heading mt-4 text-4xl">Welcome to Pro, {firstName}.</h1>
              <p className="mt-3 leading-relaxed text-[var(--color-fg-muted)]">
                Your plan is active and your email is verified. Set a password so you can sign back
                in any time.
              </p>

              <div className="mt-7 space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="pwd" className="text-xs font-medium uppercase tracking-wider text-[var(--color-fg-muted)]">
                    Password
                  </label>
                  <Input
                    id="pwd"
                    type="password"
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="pwd2" className="text-xs font-medium uppercase tracking-wider text-[var(--color-fg-muted)]">
                    Confirm password
                  </label>
                  <Input
                    id="pwd2"
                    type="password"
                    placeholder="Repeat it"
                    value={password2}
                    onChange={(e) => setPassword2(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
              </div>

              {pwdErr && (
                <div className="mt-4 rounded-xl border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 px-3 py-2.5 text-sm text-[var(--color-danger)]">
                  {pwdErr}
                </div>
              )}

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Button onClick={savePassword} loading={pwdSaving} size="lg" disabled={password.length < 8}>
                  Set password &amp; continue
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 0 && !needsPassword && (
            <div className="fade-up">
              <Badge variant="brand">
                <Sparkles className="size-3" />
                Welcome aboard
              </Badge>
              <h1 className="heading mt-4 text-4xl ">
                Hey {firstName}. Two quick things.
              </h1>
              <p className="mt-3 text-[var(--color-fg-muted)] leading-relaxed">
                We'll get you set up in under a minute. First, the only thing we need:
                somewhere to do the transcription.
              </p>
              <ol className="mt-7 space-y-3 text-sm">
                <li className="flex gap-3 text-[var(--color-fg-muted)]">
                  <span className="shrink-0 inline-flex size-6 items-center justify-center rounded-full bg-[var(--color-bg-soft)] text-xs font-semibold text-[var(--color-fg)]">
                    1
                  </span>
                  Connect a Groq API key (free at console.groq.com, takes ~30 seconds)
                </li>
                <li className="flex gap-3 text-[var(--color-fg-muted)]">
                  <span className="shrink-0 inline-flex size-6 items-center justify-center rounded-full bg-[var(--color-bg-soft)] text-xs font-semibold text-[var(--color-fg)]">
                    2
                  </span>
                  Open the editor and drop a video. That's it.
                </li>
              </ol>
              <div className="mt-9 flex flex-col sm:flex-row gap-3">
                <Button onClick={() => setStep(1)} size="lg">
                  Let's go
                  <ArrowRight className="size-4" />
                </Button>
                <Button href="/dashboard" variant="ghost" size="lg">
                  Skip for now
                </Button>
              </div>
            </div>
          )}

          {step === 1 && showKeyStep && (
            <div className="fade-up">
              <Badge variant="outline">
                <KeyRound className="size-3" />
                Step 2 of 3 · optional
              </Badge>
              <h1 className="heading mt-4 text-4xl ">
                Want unlimited AI captions?
              </h1>
              <p className="mt-3 text-[var(--color-fg-muted)] leading-relaxed">
                Free includes a monthly allowance of captions on our managed AI — enough to try
                everything. Add your own free Groq key for unlimited transcription. We encrypt it
                before it touches our database. You can always do this later in Settings.
              </p>

              <a
                href="https://console.groq.com/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]/40 px-4 py-3 text-sm hover:border-[var(--color-brand)]/40 transition-colors"
              >
                <ExternalLink className="size-4 text-[var(--color-brand)]" />
                Get a Groq key (free) →
              </a>

              <div className="mt-7 space-y-1.5">
                <label htmlFor="groq" className="text-xs font-medium text-[var(--color-fg-muted)] uppercase tracking-wider">
                  Groq API key
                </label>
                <Input
                  id="groq"
                  placeholder="gsk_…"
                  value={groqKey}
                  onChange={(e) => setGroqKey(e.target.value)}
                  disabled={skip}
                  autoComplete="off"
                  className="font-mono text-sm"
                />
                <p className="text-xs text-[var(--color-fg-subtle)]">
                  Starts with <code className="rounded bg-[var(--color-bg-soft)] px-1.5 py-0.5">gsk_</code>. Never shared, never logged.
                </p>
              </div>

              <label className="mt-4 flex items-start gap-2.5 text-sm text-[var(--color-fg-muted)]">
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 rounded border-[var(--color-border)] bg-[var(--color-bg)] accent-[var(--color-brand)]"
                  checked={skip}
                  onChange={(e) => setSkip(e.target.checked)}
                />
                Skip for now, I'll add it later in Settings.
              </label>

              {error && (
                <div className="mt-4 rounded-xl border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 px-3 py-2.5 text-sm text-[var(--color-danger)]">
                  {error}
                </div>
              )}

              <div className="mt-9 flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={saveAndFinish}
                  loading={saving}
                  size="lg"
                  disabled={!skip && groqKey.trim().length < 10}
                >
                  Save &amp; continue
                </Button>
                {!needsPassword && (
                  <Button onClick={() => setStep(0)} variant="ghost" size="lg">
                    Back
                  </Button>
                )}
              </div>
            </div>
          )}

          {step === doneStep && (
            <div className="fade-up text-center py-6">
              <div className="mx-auto inline-flex size-16 items-center justify-center rounded-full bg-[var(--color-brand)]/15 text-[var(--color-brand)]">
                <Check className="size-8" />
              </div>
              <h1 className="heading mt-6 text-4xl ">You're set.</h1>
              <p className="mt-3 max-w-md mx-auto text-[var(--color-fg-muted)]">
                Open the editor, drop your first video, and watch the captions appear.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={() => router.push("/editor")} size="lg">
                  Open editor
                  <ArrowRight className="size-4" />
                </Button>
                <Button href="/dashboard" variant="ghost" size="lg">
                  Go to dashboard
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-5 flex items-center justify-center">
          <PoweredByContles variant="chip" />
        </div>
      </div>
    </div>
  );
}

function EmailVerify({ onDone }: { onDone: () => void }) {
  const [code, setCode] = React.useState("");
  const [sending, setSending] = React.useState(true);
  const [verifying, setVerifying] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [cooldown, setCooldown] = React.useState(0);
  const sent = React.useRef(false);

  const send = React.useCallback(async () => {
    setError(null);
    setSending(true);
    try {
      const res = await fetch("/api/verify-email/send", { method: "POST" });
      const j = await res.json().catch(() => ({}));
      if (j.skipped || j.verified) {
        onDone();
        return;
      }
      if (res.status === 429) {
        setError("Please wait a moment before requesting another code.");
      } else if (!res.ok) {
        setError(j.error || "Could not send the code.");
      } else {
        setCooldown(30);
      }
    } catch {
      setError("Could not send the code. Check your connection.");
    } finally {
      setSending(false);
    }
  }, [onDone]);

  React.useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    send();
  }, [send]);

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function verify() {
    setError(null);
    setVerifying(true);
    try {
      const res = await fetch("/api/verify-email/check", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const j = await res.json().catch(() => ({}));
      if (j.verified) {
        onDone();
        return;
      }
      setError(j.error || "Wrong code. Try again.");
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-16">
      <div className="blueprint blueprint-fade pointer-events-none absolute inset-0" />
      <div className="relative w-full max-w-md">
        <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-8 sm:p-10">
          <Badge variant="brand">
            <Mail className="size-3" />
            Step 1 of 3
          </Badge>
          <h1 className="heading mt-4 text-3xl">Verify your email.</h1>
          <p className="mt-3 text-sm leading-relaxed text-[var(--color-fg-muted)]">
            We sent a 6-digit code to your inbox. Enter it below to confirm it&rsquo;s really you.
          </p>

          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            onKeyDown={(e) => e.key === "Enter" && code.length === 6 && verify()}
            placeholder="000000"
            aria-label="Verification code"
            className="mono mt-7 w-full rounded-[var(--radius-md)] border border-white/10 bg-white/[0.03] px-4 py-4 text-center text-3xl tracking-[0.5em] text-white outline-none focus:border-[var(--color-brand)]/50"
          />

          {error && (
            <div className="mt-4 rounded-xl border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 px-3 py-2.5 text-sm text-[var(--color-danger)]">
              {error}
            </div>
          )}

          <Button onClick={verify} loading={verifying} size="lg" className="mt-6 w-full" disabled={code.length !== 6}>
            Verify and continue
            <ArrowRight className="size-4" />
          </Button>

          <button
            onClick={send}
            disabled={sending || cooldown > 0}
            className="mt-4 w-full text-center text-sm text-[var(--color-fg-muted)] transition-colors hover:text-white disabled:opacity-50"
          >
            {cooldown > 0 ? `Resend code in ${cooldown}s` : sending ? "Sending…" : "Resend code"}
          </button>
        </div>
        <div className="mt-5 flex items-center justify-center">
          <PoweredByContles variant="chip" />
        </div>
      </div>
    </div>
  );
}
