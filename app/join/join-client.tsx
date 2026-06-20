"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Users, Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PoweredByContles } from "@/components/marketing/powered-by-contles";

export function JoinClient({ token }: { token: string }) {
  const router = useRouter();
  const [status, setStatus] = React.useState<"idle" | "joining" | "done" | "auth" | "error">("idle");
  const [error, setError] = React.useState<string | null>(null);

  const accept = React.useCallback(async () => {
    if (!token) {
      setStatus("error");
      setError("This invite link is missing its token.");
      return;
    }
    setStatus("joining");
    setError(null);
    try {
      const r = await fetch("/api/team/accept", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.status === 401 || j.code === "auth") {
        setStatus("auth");
        return;
      }
      if (!r.ok) throw new Error(j.error || "Could not accept the invite.");
      setStatus("done");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Could not accept the invite.");
    }
  }, [token]);

  const signInUrl = `/signin?next=${encodeURIComponent(`/join?token=${token}`)}`;

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-16">
      <div className="blueprint blueprint-fade pointer-events-none absolute inset-0" />
      <div className="relative w-full max-w-md">
        <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-8 text-center sm:p-10">
          <div className="mx-auto inline-flex size-14 items-center justify-center rounded-2xl bg-[var(--color-brand)]/15 text-[var(--color-brand)]">
            {status === "done" ? <Check className="size-7" /> : <Users className="size-7" />}
          </div>

          {status === "done" ? (
            <>
              <h1 className="heading mt-5 text-2xl text-white">You&rsquo;re on the team.</h1>
              <p className="mt-2 text-sm text-[var(--color-fg-muted)]">
                You now share the team&rsquo;s workspace and projects.
              </p>
              <Button onClick={() => router.push("/dashboard")} size="lg" className="mt-6 w-full">
                Go to dashboard
                <ArrowRight className="size-4" />
              </Button>
            </>
          ) : status === "auth" ? (
            <>
              <h1 className="heading mt-5 text-2xl text-white">Sign in to join</h1>
              <p className="mt-2 text-sm text-[var(--color-fg-muted)]">
                Sign in (or create an account) with the email this invite was sent to, then you&rsquo;ll
                join automatically.
              </p>
              <Button href={signInUrl} size="lg" className="mt-6 w-full">
                Sign in to continue
                <ArrowRight className="size-4" />
              </Button>
            </>
          ) : (
            <>
              <h1 className="heading mt-5 text-2xl text-white">Join the team</h1>
              <p className="mt-2 text-sm text-[var(--color-fg-muted)]">
                You&rsquo;ve been invited to a shared Capto workspace — captions, projects and exports,
                together.
              </p>
              {error && (
                <div className="mt-4 rounded-xl border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 px-3 py-2.5 text-sm text-[var(--color-danger)]">
                  {error}
                </div>
              )}
              <Button onClick={accept} loading={status === "joining"} size="lg" className="mt-6 w-full">
                Accept invite
                <ArrowRight className="size-4" />
              </Button>
            </>
          )}
        </div>
        <div className="mt-5 flex items-center justify-center">
          <PoweredByContles variant="chip" />
        </div>
      </div>
    </div>
  );
}
