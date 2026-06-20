"use client";

import * as React from "react";
import { ArrowRight, Check, Crown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FeatureIcon } from "@/components/marketing/pricing-table";
import { PLANS, getPlan, type PlanId } from "@/lib/pricing";
import { cn } from "@/lib/utils";

type Interval = "monthly" | "annual";

export function BillingClient({
  plan,
  autoUpgrade,
  autoInterval,
  stripeReady,
}: {
  plan: PlanId;
  autoUpgrade: PlanId | null;
  autoInterval: Interval;
  stripeReady: boolean;
}) {
  const [interval, setInterval] = React.useState<Interval>(autoInterval);
  const [loading, setLoading] = React.useState<PlanId | "portal" | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [showCancel, setShowCancel] = React.useState(false);
  const [retLoading, setRetLoading] = React.useState<"claim" | "cancel" | null>(null);
  const [retDone, setRetDone] = React.useState<null | "stayed" | "cancelled">(null);

  async function claimOffer() {
    setRetLoading("claim");
    try {
      const r = await fetch("/api/stripe/retention", { method: "POST" });
      if (!r.ok) throw new Error();
      setRetDone("stayed");
    } catch {
      setError("Could not apply the offer. Try the billing portal.");
    } finally {
      setRetLoading(null);
    }
  }
  async function cancelPlan() {
    setRetLoading("cancel");
    try {
      const r = await fetch("/api/stripe/cancel", { method: "POST" });
      if (!r.ok) throw new Error();
      setRetDone("cancelled");
    } catch {
      setError("Could not cancel. Try the billing portal.");
    } finally {
      setRetLoading(null);
    }
  }

  const startCheckout = React.useCallback(
    async (target: PlanId, iv: Interval) => {
      setError(null);
      setLoading(target);
      try {
        const currency = document.documentElement.getAttribute("data-cur") || "eur";
        const r = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ plan: target, interval: iv, currency }),
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "Couldn't start checkout.");
        window.location.href = j.url;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
        setLoading(null);
      }
    },
    [],
  );

  const openPortal = React.useCallback(async () => {
    setError(null);
    setLoading("portal");
    try {
      const r = await fetch("/api/stripe/portal", { method: "POST" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Couldn't open billing portal.");
      window.location.href = j.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setLoading(null);
    }
  }, []);

  React.useEffect(() => {
    if (autoUpgrade && plan === "free" && stripeReady) startCheckout(autoUpgrade, autoInterval);
  }, [autoUpgrade, autoInterval, plan, stripeReady, startCheckout]);

  const current = getPlan(plan)!;
  const isPaid = plan !== "free";
  const upgradeTargets = PLANS.filter((p) => p.id !== "free" && p.id !== plan);

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10 lg:px-10">
      <h1 className="heading text-4xl text-[var(--color-fg)]">Billing</h1>
      <p className="mt-2 text-[var(--color-fg-muted)]">Your plan, your invoices, your control.</p>

      {/* current plan */}
      <div className="mt-8 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Badge variant={isPaid ? "brand" : "outline"}>
              {plan === "ultra" ? <Crown className="size-3" /> : <Sparkles className="size-3" />}
              Current plan
            </Badge>
            <h2 className="heading mt-3 text-2xl">{current.name}</h2>
            <p className="mt-1 text-sm text-[var(--color-fg-muted)]">{current.tagline}</p>
          </div>
          <div className="text-right">
            <div className="display text-3xl tnum">
              {current.priceMonthly === 0 ? "€0" : `€${current.priceMonthly.toFixed(2)}`}
            </div>
            {current.priceMonthly > 0 && <div className="text-xs text-[var(--color-fg-subtle)]">/mo</div>}
          </div>
        </div>

        {error && (
          <div className="mt-5 rounded-[var(--radius-md)] border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 px-3 py-2.5 text-sm text-[var(--color-danger)]">
            {error}
          </div>
        )}
        {!stripeReady && (
          <div className="mt-5 rounded-[var(--radius-md)] border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 px-3 py-2.5 text-xs text-[var(--color-warning)]">
            Stripe isn&rsquo;t configured yet. Add the keys and price IDs to .env to enable checkout.
          </div>
        )}

        {isPaid && (
          <div className="mt-7 flex flex-wrap gap-3">
            <Button onClick={openPortal} loading={loading === "portal"} variant="secondary" size="lg">
              Manage subscription
            </Button>
            <Button onClick={() => { setShowCancel(true); setRetDone(null); }} variant="ghost" size="lg">
              Cancel plan
            </Button>
          </div>
        )}
      </div>

      {/* Retention modal */}
      {showCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => !retLoading && setShowCancel(false)}>
          <div className="w-full max-w-md rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-7" onClick={(e) => e.stopPropagation()}>
            {retDone === "stayed" ? (
              <div className="text-center">
                <div className="mx-auto inline-flex size-12 items-center justify-center rounded-2xl bg-[var(--color-success)]/15 text-[var(--color-success)]"><Check className="size-6" /></div>
                <h3 className="heading mt-4 text-xl text-white">Nice, you stayed.</h3>
                <p className="mt-2 text-sm text-[var(--color-fg-muted)]">Your next month is 50% off. Nothing else changes.</p>
                <Button onClick={() => setShowCancel(false)} size="lg" className="mt-6 w-full">Back to billing</Button>
              </div>
            ) : retDone === "cancelled" ? (
              <div className="text-center">
                <h3 className="heading mt-2 text-xl text-white">Cancellation scheduled.</h3>
                <p className="mt-2 text-sm text-[var(--color-fg-muted)]">You keep full access until the end of your current period. You can resubscribe any time.</p>
                <Button onClick={() => setShowCancel(false)} size="lg" variant="secondary" className="mt-6 w-full">Close</Button>
              </div>
            ) : (
              <>
                <div className="inline-flex size-11 items-center justify-center rounded-2xl bg-[var(--color-brand)]/15 text-[var(--color-brand)]"><Sparkles className="size-5" /></div>
                <h3 className="heading mt-4 text-2xl text-white">Wait — 50% off next month?</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-fg-muted)]">
                  Before you cancel: stay on {current.name} and your next month is half price, applied instantly. No commitment, cancel later if it&rsquo;s still not for you.
                </p>
                <div className="mt-6 space-y-2.5">
                  <Button onClick={claimOffer} loading={retLoading === "claim"} size="lg" className="w-full">
                    Claim 50% off and stay
                  </Button>
                  <Button onClick={cancelPlan} loading={retLoading === "cancel"} variant="ghost" size="lg" className="w-full">
                    No thanks, cancel my plan
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* upgrade options */}
      {plan !== "ultra" && (
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="heading text-lg">{isPaid ? "Upgrade" : "Choose a plan"}</h2>
            <div className="inline-flex items-center gap-1 rounded-[var(--radius-pill)] border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-1">
              {(["monthly", "annual"] as Interval[]).map((iv) => (
                <button
                  key={iv}
                  onClick={() => setInterval(iv)}
                  className={cn(
                    "rounded-[var(--radius-pill)] px-3 py-1 text-xs font-medium capitalize transition-colors",
                    interval === iv ? "bg-[var(--color-bg-soft)] text-[var(--color-fg)]" : "text-[var(--color-fg-muted)]",
                  )}
                >
                  {iv}
                  {iv === "annual" && <span className="mono ml-1 text-[10px] text-[var(--color-brand)]">−17%</span>}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            {upgradeTargets.map((p) => {
              const price = interval === "annual" ? p.priceAnnualMonthly : p.priceMonthly;
              return (
                <div
                  key={p.id}
                  className={cn(
                    "flex flex-col rounded-[var(--radius-xl)] border p-6",
                    p.highlight ? "border-[var(--color-brand)]/50" : "border-[var(--color-border)]",
                    "bg-[var(--color-bg-elev)]",
                  )}
                >
                  <div className="flex items-baseline justify-between">
                    <h3 className="heading text-lg">{p.name}</h3>
                    <span className="display text-2xl tnum">€{price.toFixed(2)}<span className="text-xs text-[var(--color-fg-subtle)]">/mo</span></span>
                  </div>
                  <p className="mt-1 text-sm text-[var(--color-fg-muted)]">{p.tagline}</p>
                  <ul className="mt-4 flex-1 space-y-2">
                    {p.features.slice(0, 6).map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-[var(--color-fg-muted)]">
                        <FeatureIcon text={f} />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    onClick={() => startCheckout(p.id, interval)}
                    loading={loading === p.id}
                    disabled={!stripeReady}
                    size="lg"
                    variant={p.highlight ? "primary" : "secondary"}
                    className="mt-6"
                  >
                    {isPaid ? `Switch to ${p.name}` : p.cta}
                    <ArrowRight className="size-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
