"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PoweredByContles } from "@/components/marketing/powered-by-contles";

type State =
  | { kind: "loading" }
  | { kind: "existing"; email: string }
  | { kind: "error"; message: string };

export function WelcomeClient({ cs }: { cs: string | null }) {
  const router = useRouter();
  const [state, setState] = React.useState<State>({ kind: "loading" });
  const ran = React.useRef(false);

  React.useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    if (!cs) {
      setState({ kind: "error", message: "We couldn't read your checkout. If you were charged, contact support and we'll sort it out." });
      return;
    }
    // Guard against a double-invoke completing the same checkout twice.
    const key = `capto_cs_${cs}`;
    if (sessionStorage.getItem(key) === "done") {
      router.replace("/onboarding?welcome=1");
      return;
    }

    (async () => {
      try {
        const res = await fetch("/api/checkout/complete", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ cs }),
        });
        const data = (await res.json()) as {
          status?: string;
          email?: string;
          error?: string;
        };
        if (!res.ok) throw new Error(data.error || "Setup failed.");

        if (data.status === "created") {
          sessionStorage.setItem(key, "done");
          router.replace("/onboarding?welcome=1");
          return;
        }
        if (data.status === "existing") {
          setState({ kind: "existing", email: data.email || "" });
          return;
        }
        throw new Error("Unexpected response.");
      } catch (e) {
        setState({ kind: "error", message: e instanceof Error ? e.message : "Setup failed." });
      }
    })();
  }, [cs, router]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-16">
      <div className="absolute inset-0 blueprint blueprint-fade pointer-events-none" />
      <div className="relative w-full max-w-md text-center">
        <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-8 sm:p-10">
          {state.kind === "loading" && (
            <>
              <div className="mx-auto inline-flex size-14 items-center justify-center rounded-2xl bg-[var(--color-brand)]/15 text-[var(--color-brand)]">
                <Loader2 className="size-7 animate-spin" />
              </div>
              <h1 className="heading mt-5 text-3xl text-white">Payment confirmed</h1>
              <p className="mt-3 text-sm text-[var(--color-fg-muted)]">
                Setting up your account, this takes a second.
              </p>
            </>
          )}

          {state.kind === "existing" && (
            <>
              <div className="mx-auto inline-flex size-14 items-center justify-center rounded-2xl bg-[var(--color-success)]/15 text-[var(--color-success)]">
                <Check className="size-7" />
              </div>
              <h1 className="heading mt-5 text-3xl text-white">You&rsquo;re upgraded</h1>
              <p className="mt-3 text-sm text-[var(--color-fg-muted)]">
                {state.email ? <>{state.email} already has a Capto account. </> : null}
                Sign in and your new plan is ready.
              </p>
              <Button href="/signin" size="lg" className="mt-6 w-full">
                Sign in
              </Button>
            </>
          )}

          {state.kind === "error" && (
            <>
              <div className="mx-auto inline-flex size-14 items-center justify-center rounded-2xl bg-[var(--color-danger)]/15 text-[var(--color-danger)]">
                <AlertCircle className="size-7" />
              </div>
              <h1 className="heading mt-5 text-3xl text-white">Something went sideways</h1>
              <p className="mt-3 text-sm text-[var(--color-fg-muted)]">{state.message}</p>
              <Button href="/signin" variant="secondary" size="lg" className="mt-6 w-full">
                Go to sign in
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
