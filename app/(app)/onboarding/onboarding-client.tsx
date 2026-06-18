"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, KeyRound, Sparkles, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PoweredByContles } from "@/components/marketing/powered-by-contles";

const STEPS = ["Welcome", "Connect your AI", "You're set"] as const;

export function OnboardingClient({ firstName }: { firstName: string }) {
  const router = useRouter();
  const [step, setStep] = React.useState(0);
  const [groqKey, setGroqKey] = React.useState("");
  const [skip, setSkip] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

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
          {step === 0 && (
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

          {step === 1 && (
            <div className="fade-up">
              <Badge variant="outline">
                <KeyRound className="size-3" />
                Step 2 of 3
              </Badge>
              <h1 className="heading mt-4 text-4xl ">
                Paste your Groq API key.
              </h1>
              <p className="mt-3 text-[var(--color-fg-muted)] leading-relaxed">
                Groq's free tier handles thousands of minutes of transcription each month, most
                creators never hit the limit. We encrypt your key before it touches our database.
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
                <Button onClick={() => setStep(0)} variant="ghost" size="lg">
                  Back
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
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
