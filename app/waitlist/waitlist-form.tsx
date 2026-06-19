"use client";

import * as React from "react";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function WaitlistForm() {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, source: "waitlist" }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Could not join the waitlist.");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="text-center">
        <div className="mx-auto inline-flex size-12 items-center justify-center rounded-2xl bg-[var(--color-success)]/15 text-[var(--color-success)]">
          <Check className="size-6" />
        </div>
        <h2 className="heading mt-4 text-2xl text-white">You&rsquo;re on the list.</h2>
        <p className="mt-2 text-sm text-[var(--color-fg-muted)]">
          We&rsquo;ll email {email} the moment your spot opens. No spam, just the launch.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="wl-name" className="text-xs font-medium uppercase tracking-wider text-[var(--color-fg-muted)]">
          Name
        </label>
        <Input id="wl-name" required placeholder="Augustas A." value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="wl-email" className="text-xs font-medium uppercase tracking-wider text-[var(--color-fg-muted)]">
          Email
        </label>
        <Input
          id="wl-email"
          type="email"
          required
          placeholder="you@studio.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      {error && (
        <div className="rounded-xl border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 px-3 py-2.5 text-sm text-[var(--color-danger)]">
          {error}
        </div>
      )}
      <Button type="submit" loading={loading} size="lg" className="w-full">
        Join the waitlist
        <ArrowRight className="size-4" />
      </Button>
      <p className="text-center text-xs text-[var(--color-fg-subtle)]">
        Early members get launch pricing. We never share your email.
      </p>
    </form>
  );
}
