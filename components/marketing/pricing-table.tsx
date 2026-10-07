"use client";

import * as React from "react";
import {
  Check,
  Languages,
  BadgeCheck,
  Gem,
  Infinity as InfinityIcon,
  Users,
  KeyRound,
  Palette,
  SlidersHorizontal,
  FileText,
  Wand2,
  Zap,
  Crown,
  Gauge,
  Code,
  Crop,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/ui/money";
import { Container } from "@/components/ui/container";
import { Band, SectionEyebrow, SectionTitle, SectionLede } from "@/components/ui/section";
import { DitherStatic } from "@/components/visual/dither-static";
import { PLANS } from "@/lib/pricing";
import { cn } from "@/lib/utils";

function Toggle({ annual, onChange }: { annual: boolean; onChange: (v: boolean) => void }) {
  // Two equal-width tabs so the pill centers cleanly; the savings badge floats
  // on the Annual tab's corner (doesn't shift the layout / centering).
  return (
    <div className="relative inline-flex rounded-[var(--radius-md)] border border-white/[0.08] bg-white/[0.03] p-1">
      <span
        aria-hidden
        className="absolute inset-y-1 left-1 w-[96px] rounded-[6px] bg-white/[0.1] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] transition-transform duration-300 ease-[var(--ease-out)]"
        style={{ transform: annual ? "translateX(100%)" : "translateX(0)" }}
      />
      {([["Monthly", false], ["Annual", true]] as const).map(([label, val]) => (
        <button
          key={label}
          onClick={() => onChange(val)}
          className={cn(
            "relative z-10 w-[96px] rounded-[6px] py-1.5 text-center text-[13px] font-medium transition-colors duration-300",
            annual === val ? "text-white" : "text-[var(--color-fg-muted)] hover:text-white",
          )}
        >
          {label}
          {val === true && (
            <span
              className={cn(
                "absolute -top-2.5 right-0 translate-x-1/3 rounded-full px-1.5 py-0.5 text-[9px] font-bold leading-none shadow-sm transition-colors",
                annual ? "bg-[var(--color-success)] text-black" : "bg-[var(--color-success)]/80 text-black/80",
              )}
            >
              −28%
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// Pick a lucide icon that fits each feature line (falls back to a check).
export function FeatureIcon({ text }: { text: string }) {
  const t = text.toLowerCase();
  const cls = "mt-0.5 size-[15px] shrink-0 text-[var(--color-fg-subtle)]";
  if (/everything in/.test(t)) return <Crown className={cls} strokeWidth={2} />;
  if (/translat|language/.test(t)) return <Languages className={cls} strokeWidth={2} />;
  if (/watermark/.test(t)) return <BadgeCheck className={cls} strokeWidth={2} />;
  if (/lossless|quality|4k|60fps/.test(t)) return <Gem className={cls} strokeWidth={2} />;
  if (/unlimited/.test(t)) return <InfinityIcon className={cls} strokeWidth={2} />;
  if (/team|seat/.test(t)) return <Users className={cls} strokeWidth={2} />;
  if (/api|zapier|key/.test(t)) return /zapier|api/.test(t) ? <Code className={cls} strokeWidth={2} /> : <KeyRound className={cls} strokeWidth={2} />;
  if (/style|font|color|brand|highlight|preset/.test(t)) return <Palette className={cls} strokeWidth={2} />;
  if (/aspect|ratio/.test(t)) return <Crop className={cls} strokeWidth={2} />;
  if (/timeline|control/.test(t)) return <SlidersHorizontal className={cls} strokeWidth={2} />;
  if (/clip|b-roll|magic|transition|filler|silence/.test(t)) return <Wand2 className={cls} strokeWidth={2} />;
  if (/priority|queue|fast/.test(t)) return <Zap className={cls} strokeWidth={2} />;
  if (/minute/.test(t)) return <Gauge className={cls} strokeWidth={2} />;
  if (/srt|vtt|file|export/.test(t)) return <FileText className={cls} strokeWidth={2} />;
  return <Check className={cls} strokeWidth={2} />;
}

export function PricingTable({
  withChrome = true,
  currentPlan,
  onPlanClick,
}: {
  withChrome?: boolean;
  /** Signed-in user's plan — marks the matching card "Current plan". */
  currentPlan?: string;
  /** When set (in-app billing), buttons call this (account-linked checkout)
   *  instead of the guest checkout used on the marketing site. */
  onPlanClick?: (planId: string, interval: "monthly" | "annual") => void;
}) {
  const [annual, setAnnual] = React.useState(false);
  const [loadingPlan, setLoadingPlan] = React.useState<string | null>(null);

  function handleClick(planId: string) {
    setLoadingPlan(planId);
    if (onPlanClick) {
      onPlanClick(planId, annual ? "annual" : "monthly");
      return;
    }
    startCheckout(planId);
  }

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
    <div data-reveal-stagger className="grid items-stretch gap-4 lg:grid-cols-3">
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
              "relative isolate flex flex-col overflow-hidden rounded-[var(--radius-xl)] border p-7",
              isPro && "glow-border-always border-[var(--color-violet)]/35 bg-[#0d0c14]",
              isUltra && "glow-border border-[var(--color-border)] bg-[var(--color-bg-elev)]",
              !isPro && !isUltra && "border-[var(--color-border)] bg-[var(--color-bg-elev)]",
            )}
          >
            {isPro && (
              <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-40 opacity-60 [mask-image:linear-gradient(180deg,#000,transparent)]">
                <DitherStatic preset="top" pixel={3} intensity={0.8} />
              </div>
            )}
            {plan.badge && (
              <div className="absolute right-6 top-7">
                <span
                  className={cn(
                    "mono rounded-[var(--radius-xs)] px-1.5 py-0.5 text-[10px] uppercase tracking-wider",
                    isPro && "bg-[var(--color-violet)] text-white",
                    !isPro && "border border-white/10 text-[var(--color-fg-muted)]",
                  )}
                >
                  {plan.badge}
                </span>
              </div>
            )}

            <h3 className="heading relative text-lg text-white">{plan.name}</h3>
            <p className="relative mt-1 text-sm text-[var(--color-fg-muted)]">{plan.tagline}</p>

            {isFree ? (
              <>
                <div className="relative mt-8 flex items-baseline gap-1">
                  <span className="display text-[2.75rem] text-white tnum"><Money eur="0" usd="0" /></span>
                </div>
                <p className="mt-1 h-5 text-xs text-[var(--color-fg-subtle)]">Free forever</p>
              </>
            ) : annual ? (
              <>
                <div className="relative mt-8 flex items-baseline gap-1">
                  <span className="display text-[2.75rem] text-white tnum">
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
                <div className="relative mt-8 flex items-baseline gap-1">
                  <span className="display text-[2.75rem] text-white tnum">
                    <Money eur={plan.priceMonthly.toFixed(2)} usd={plan.priceMonthlyUsd.toFixed(2)} />
                  </span>
                  <span className="text-sm text-[var(--color-fg-subtle)]">/mo</span>
                </div>
                <p className="mt-1.5 h-5 text-xs text-[var(--color-fg-subtle)] tnum">
                  or <Money eur={plan.priceAnnualTotal.toFixed(2)} usd={plan.priceAnnualTotalUsd.toFixed(2)} />/yr, save {savePct}%
                </p>
              </>
            )}

            {currentPlan === plan.id ? (
              <Button disabled variant="outline" size="lg" className="mt-6 w-full">
                Current plan
              </Button>
            ) : isFree ? (
              onPlanClick ? (
                <Button disabled variant="outline" size="lg" className="mt-6 w-full">
                  Free
                </Button>
              ) : (
                <Button href="/signup" variant="primary" size="lg" className="mt-6 w-full">
                  {plan.cta}
                </Button>
              )
            ) : (
              <Button
                onClick={() => handleClick(plan.id)}
                loading={loadingPlan === plan.id}
                variant={isUltra ? "magic" : "primary"}
                size="lg"
                className="mt-6 w-full"
              >
                {(() => {
                  const RANK: Record<string, number> = { free: 0, pro: 1, ultra: 2 };
                  if (onPlanClick && currentPlan && currentPlan !== "free") {
                    return (RANK[plan.id] ?? 0) > (RANK[currentPlan] ?? 0)
                      ? `Upgrade to ${plan.name}`
                      : `Downgrade to ${plan.name}`;
                  }
                  return plan.cta;
                })()}
              </Button>
            )}

            <ul className="mt-7 flex-1 space-y-2.5 border-t border-[var(--color-border)] pt-6">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm">
                  <FeatureIcon text={f} />
                  <span className="text-[13.5px] text-[var(--color-fg-muted)]">{f}</span>
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
    <Band id="pricing" className="py-24 sm:py-32">
      <Container>
        <div className="mx-auto max-w-xl text-center">
          <div className="flex justify-center">
            <SectionEyebrow>Pricing</SectionEyebrow>
          </div>
          <SectionTitle className="mx-auto">Priced like a tool, not a trap.</SectionTitle>
          <SectionLede className="mx-auto">
            Pro at <Money eur="5.00" usd="5.83" />/mo on annual undercuts every tool that starts at <Money eur="19" usd="19" />.
          </SectionLede>
          {/* Sticky under the nav on mobile so you can switch billing without
              scrolling back up past the stacked cards. Static on desktop. */}
          <div className="sticky top-[64px] z-30 -mx-5 mt-8 flex justify-center border-b border-white/[0.06] bg-[var(--color-bg)]/85 py-3 backdrop-blur-md sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:py-0 sm:backdrop-blur-none">
            <Toggle annual={annual} onChange={setAnnual} />
          </div>
        </div>
        <div className="mt-14">{grid}</div>
      </Container>
    </Band>
  );
}
