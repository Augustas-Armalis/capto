"use client";

import * as React from "react";
import { ArrowRight, Check, Crown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PricingTable } from "@/components/marketing/pricing-table";
import { PoweredByContles } from "@/components/marketing/powered-by-contles";
import { getPlan, type PlanId } from "@/lib/pricing";
import { cn } from "@/lib/utils";

type Interval = "monthly" | "annual";

export function BillingClient({
  plan,
  autoUpgrade,
  autoInterval,
  stripeReady,
  pendingPlan,
  pendingAt,
}: {
  plan: PlanId;
  autoUpgrade: PlanId | null;
  autoInterval: Interval;
  stripeReady: boolean;
  pendingPlan?: PlanId | null;
  pendingAt?: number | null;
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

  // Switch between PAID plans in place (never a 2nd subscription). Free users go
  // through checkout; paid users hit /api/stripe/change (upgrade now / downgrade
  // at period end). Downgrading to Free is the Cancel flow below.
  const changePlan = React.useCallback(
    async (target: PlanId, iv: Interval) => {
      setError(null);
      if (plan === "free") { startCheckout(target, iv); return; }
      if (target === plan) return;
      setLoading(target);
      try {
        const r = await fetch("/api/stripe/change", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ plan: target }),
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "Couldn't change plan.");
        window.location.href = j.effective === "period_end" ? "/billing?scheduled=1" : "/billing?changed=1";
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
        setLoading(null);
      }
    },
    [plan, startCheckout],
  );

  // Undo a pending cancel/downgrade — "keep my current plan". Re-selecting the
  // current plan tells /api/stripe/change to release the schedule + clear cancel.
  const keepPlan = React.useCallback(async () => {
    setError(null);
    setLoading(plan);
    try {
      const r = await fetch("/api/stripe/change", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      if (!r.ok) throw new Error("Couldn't update.");
      window.location.href = "/billing?changed=1";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Try the billing portal.");
      setLoading(null);
    }
  }, [plan]);

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

  // Confirmation notice after a plan change / schedule (set via the redirect).
  const [notice, setNotice] = React.useState<string | null>(null);
  React.useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("scheduled")) setNotice("Downgrade scheduled — you keep your current plan until the end of this billing period, then it switches automatically.");
    else if (q.get("changed")) setNotice("Plan updated. Your new plan is active now.");
    else if (q.get("success")) setNotice("You're all set — welcome aboard!");
  }, []);

  const current = getPlan(plan)!;
  const isPaid = plan !== "free";

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10 lg:px-10">
      <h1 className="heading text-4xl text-[var(--color-fg)]">Billing</h1>
      <p className="mt-2 text-[var(--color-fg-muted)]">Your plan, your invoices, your control.</p>

      {notice && (
        <div className="mt-6 flex items-start gap-2.5 rounded-[var(--radius-md)] border border-[var(--color-success)]/30 bg-[var(--color-success)]/10 px-4 py-3 text-sm text-[var(--color-success)]">
          <Check className="mt-0.5 size-4 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {pendingPlan && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 px-4 py-3 text-sm">
          <span className="text-[var(--color-warning)]">
            Scheduled to switch to <b>{getPlan(pendingPlan)?.name ?? pendingPlan}</b>
            {pendingAt ? ` on ${new Date(pendingAt * 1000).toLocaleDateString()}` : ""} — you keep {getPlan(plan)?.name} until then.
          </span>
          <Button onClick={keepPlan} loading={loading === plan} variant="secondary" size="sm">
            Keep {getPlan(plan)?.name}
          </Button>
        </div>
      )}

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
            <Button onClick={() => { setShowCancel(true); setRetDone(null); }} variant="destructive" size="lg">
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

      {/* plan options — same boxes/slider/prices as the landing page, wired to
          account-linked checkout (free→paid) or in-place change (paid↔paid),
          with the current plan marked. Downgrading to Free is the Cancel flow. */}
      <div className="mt-10">
        <h2 className="heading mb-2 text-lg">{isPaid ? "Change your plan" : "Choose a plan"}</h2>
        {isPaid && (
          <p className="mb-5 text-sm text-[var(--color-fg-muted)]">
            Upgrades apply immediately (prorated). Downgrades take effect at the end of your current billing period. To drop to Free, use <button onClick={() => { setShowCancel(true); setRetDone(null); }} className="text-[var(--color-brand)] underline-offset-2 hover:underline">Cancel plan</button>.
          </p>
        )}
        <PricingTable withChrome={false} currentPlan={plan} onPlanClick={(id, iv) => changePlan(id as PlanId, iv)} />
      </div>

      <div className="mt-12 flex justify-center">
        <PoweredByContles variant="chip" />
      </div>
    </div>
  );
}
