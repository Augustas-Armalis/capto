"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/ui/money";
import { Container } from "@/components/ui/container";
import { SectionEyebrow, SectionTitle, SectionLede } from "@/components/ui/section";
import { PLANS } from "@/lib/pricing";
import { cn } from "@/lib/utils";

function Toggle({ annual, onChange }: { annual: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-[var(--radius-pill)] border border-white/10 bg-white/[0.04] p-1 backdrop-blur-md">
      {([["Monthly", false], ["Annual", true]] as const).map(([label, val]) => (
        <button
          key={label}
          onClick={() => onChange(val)}
          className={cn(
            "inline-flex items-center gap-2 rounded-[var(--radius-pill)] px-4 py-1.5 text-sm font-medium transition-colors",
            annual === val ? "bg-white text-black" : "text-[var(--color-fg-muted)]",
          )}
        >
          {label}
          {label === "Annual" && (
            <span className={cn("mono text-[10px]", annual ? "text-[var(--color-violet)]" : "text-white/40")}>save up to 28%</span>
          )}
        </button>
      ))}
    </div>
  );
}

export function PricingTable({ withChrome = true }: { withChrome?: boolean }) {
  const [annual, setAnnual] = React.useState(true);
  const [loadingPlan, setLoadingPlan] = React.useState<string | null>(null);

  // Pay-first: go straight to Stripe Checkout (collects email + card), then
  // /welcome creates and signs into the account. Falls back to signup if
  // payments aren't reachable so the visitor is never stuck.
  async function startCheckout(planId: string) {
    setLoadingPlan(planId);
    const interval = annual ? "annual" : "monthly";
    try {
      const currency =
        typeof document !== "undefined" && document.documentElement.dataset.cur === "usd"
          ? "usd"
          : "eur";
      const res = await fetch("/api/checkout/guest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan: planId, interval, currency }),
      });
      const d = (await res.json().catch(() => ({}))) as { url?: string };
      if (d.url) {
        window.location.href = d.url;
        return;
      }
      window.location.href = `/signup?plan=${planId}&interval=${interval}`;
    } catch {
      window.location.href = `/signup?plan=${planId}&interval=${interval}`;
    }
  }

  const grid = (
    <div className="grid items-stretch gap-5 lg:grid-cols-3">
      {PLANS.map((plan) => {
        const isFree = plan.id === "free";
        const isPro = plan.id === "pro";
        const isUltra = plan.id === "ultra";
        // Accurate, derived straight from the real (Stripe) yearly totals.
        const savePct = isFree
          ? 0
          : Math.round((1 - plan.priceAnnualTotal / (plan.priceMonthly * 12)) * 100);
        const perMoEur = (plan.priceAnnualTotal / 12).toFixed(2);
        const perMoUsd = (plan.priceAnnualTotalUsd / 12).toFixed(2);
        return (
          <div
            key={plan.id}
            className={cn(
              "relative flex flex-col rounded-[var(--radius-2xl)] border p-7",
              isPro && "glow-border-always border-white/15 bg-white/[0.04]",
              isUltra && "glow-border border-white/[0.1] bg-white/[0.02]",
              !isPro && !isUltra && "border-white/[0.07] bg-white/[0.02]",
            )}
          >
            {plan.badge && (
              <div className="absolute -top-2.5 left-7">
                <span
                  className={cn(
                    "rounded-[var(--radius-pill)] px-2.5 py-1 text-[11px] font-medium",
                    isPro && "bg-white text-black",
                    isUltra && "border border-[var(--color-violet)]/50 bg-[oklch(0.21_0.05_286)] text-white",
                    !isPro && !isUltra && "border border-white/10 bg-[var(--color-bg-elev)] text-[var(--color-fg-muted)]",
                  )}
                >
                  {plan.badge}
                </span>
              </div>
            )}

            <h3 className="heading text-xl text-white">{plan.name}</h3>
            <p className="mt-1 text-sm text-[var(--color-fg-muted)]">{plan.tagline}</p>

            {isFree ? (
              <>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="display text-5xl text-white tnum"><Money eur="0" usd="0" /></span>
                </div>
                <p className="mt-1 h-5 text-xs text-[var(--color-fg-subtle)]">Free forever</p>
              </>
            ) : annual ? (
              <>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="display text-5xl text-white tnum">
                    <Money eur={plan.priceAnnualTotal.toFixed(2)} usd={plan.priceAnnualTotalUsd.toFixed(2)} />
                  </span>
                  <span className="text-sm text-[var(--color-fg-subtle)]">/yr</span>
                </div>
                <p className="mt-1.5 flex h-5 items-center gap-2 text-xs text-[var(--color-fg-subtle)] tnum">
                  <span>
                    <Money eur={perMoEur} usd={perMoUsd} />/mo billed yearly
                  </span>
                  <span className="rounded-full bg-[var(--color-success)]/15 px-1.5 py-0.5 font-medium text-[var(--color-success)]">
                    save {savePct}%
                  </span>
                </p>
              </>
            ) : (
              <>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="display text-5xl text-white tnum">
                    <Money eur={plan.priceMonthly.toFixed(2)} usd={plan.priceMonthlyUsd.toFixed(2)} />
                  </span>
                  <span className="text-sm text-[var(--color-fg-subtle)]">/mo</span>
                </div>
                <p className="mt-1.5 h-5 text-xs text-[var(--color-fg-subtle)] tnum">
                  or <Money eur={plan.priceAnnualTotal.toFixed(2)} usd={plan.priceAnnualTotalUsd.toFixed(2)} />/yr, save {savePct}%
                </p>
              </>
            )}

            {isFree ? (
              <Button href="/signup" variant="primary" size="lg" className="mt-6 w-full">
                {plan.cta}
              </Button>
            ) : (
              <Button
                onClick={() => startCheckout(plan.id)}
                loading={loadingPlan === plan.id}
                variant={isUltra ? "magic" : "primary"}
                size="lg"
                className="mt-6 w-full"
              >
                {plan.cta}
              </Button>
            )}

            <ul className="mt-7 flex-1 space-y-2.5">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm">
                  <Check className="mt-0.5 size-4 shrink-0 text-white/70" strokeWidth={2} />
                  <span className="text-[var(--color-fg-muted)]">{f}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );

  if (!withChrome) {
    return (
      <div>
        <div className="mb-8 flex justify-center">
          <Toggle annual={annual} onChange={setAnnual} />
        </div>
        {grid}
      </div>
    );
  }

  return (
    <section id="pricing" className="py-24 sm:py-32">
      <Container>
        <div className="mx-auto max-w-xl text-center">
          <div className="flex justify-center">
            <SectionEyebrow>Pricing</SectionEyebrow>
          </div>
          <SectionTitle className="mx-auto">Priced like a tool, not a trap.</SectionTitle>
          <SectionLede className="mx-auto">
            Pro at <Money eur="5.00" usd="5.83" />/mo on annual undercuts every tool that starts at <Money eur="19" usd="19" />.
          </SectionLede>
          <div className="mt-8 flex justify-center">
            <Toggle annual={annual} onChange={setAnnual} />
          </div>
        </div>
        <div className="mt-14">{grid}</div>
      </Container>
    </section>
  );
}
