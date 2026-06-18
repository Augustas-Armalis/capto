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
            <span className={cn("mono text-[10px]", annual ? "text-[var(--color-violet)]" : "text-white/40")}>save 29%</span>
          )}
        </button>
      ))}
    </div>
  );
}

export function PricingTable({ withChrome = true }: { withChrome?: boolean }) {
  const [annual, setAnnual] = React.useState(true);

  const grid = (
    <div className="grid items-stretch gap-5 lg:grid-cols-3">
      {PLANS.map((plan) => {
        const eur = annual ? plan.priceAnnualMonthly : plan.priceMonthly;
        const usd = annual ? plan.priceAnnualMonthlyUsd : plan.priceMonthlyUsd;
        const href = plan.id === "free" ? "/signup" : `/signup?plan=${plan.id}&interval=${annual ? "annual" : "monthly"}`;
        const isPro = plan.id === "pro";
        const isUltra = plan.id === "ultra";
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

            <div className="mt-6 flex items-baseline gap-1">
              <span className="display text-5xl text-white tnum">
                {eur === 0 ? <Money eur="0" usd="0" /> : <Money eur={eur.toFixed(2)} usd={usd.toFixed(2)} />}
              </span>
              {eur > 0 && <span className="text-sm text-[var(--color-fg-subtle)]">/mo</span>}
            </div>
            <p className="mt-1 h-4 text-xs text-[var(--color-fg-subtle)] tnum">
              {plan.id !== "free" && annual ? (
                <>
                  billed <Money eur={plan.priceAnnualTotal.toFixed(2)} usd={plan.priceAnnualTotalUsd.toFixed(2)} />/yr
                </>
              ) : (
                " "
              )}
            </p>

            <Button href={href} variant={isUltra ? "magic" : "primary"} size="lg" className="mt-6 w-full">
              {plan.cta}
            </Button>

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
            Pro at <Money eur="4.99" usd="5.99" />/mo annual undercuts every tool that starts at <Money eur="19" usd="19" />.
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
