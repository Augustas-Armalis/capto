import { Container } from "@/components/ui/container";
import { Money } from "@/components/ui/money";
import { Section, SectionEyebrow, SectionTitle, SectionLede } from "@/components/ui/section";
import { COMPETITOR_PRICES } from "@/lib/pricing";
import { cn } from "@/lib/utils";

const MAX = Math.max(...COMPETITOR_PRICES.map((c) => c.eur));

function PriceBars() {
  return (
    <div className="rounded-[var(--radius-2xl)] border border-white/[0.08] bg-white/[0.02] p-7">
      <div className="flex items-baseline justify-between">
        <h3 className="heading text-base text-white">Entry paid price</h3>
        <span className="mono text-xs text-[var(--color-fg-subtle)]">
          <span className="cur-eur">€</span>
          <span className="cur-usd">$</span> / month
        </span>
      </div>
      <div className="mt-6 space-y-3">
        {COMPETITOR_PRICES.map((c) => (
          <div key={c.name} className="flex items-center gap-3">
            <span className={cn("w-24 shrink-0 text-sm", c.us ? "font-medium text-white" : "text-[var(--color-fg-muted)]")}>
              {c.name}
            </span>
            <div className="relative h-7 flex-1 overflow-hidden rounded-[var(--radius-sm)] bg-white/[0.04]">
              <div
                className={cn("h-full rounded-[var(--radius-sm)]", c.us ? "bg-magic" : "bg-white/15")}
                style={{ width: `${Math.max(12, (c.eur / MAX) * 100)}%` }}
              />
            </div>
            <span className={cn("mono w-16 shrink-0 text-right text-sm tnum", c.us ? "text-white" : "text-[var(--color-fg-muted)]")}>
              <Money eur={c.eur} usd={c.usd} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MinutesMeter() {
  return (
    <div className="rounded-[var(--radius-2xl)] border border-white/[0.08] bg-white/[0.02] p-7">
      <div className="flex items-baseline justify-between">
        <h3 className="heading text-base text-white">Minutes, not credits</h3>
        <span className="mono text-xs text-white tnum">238 / 600 min</span>
      </div>
      <div className="mt-6">
        <div className="h-2 w-full overflow-hidden rounded-[var(--radius-pill)] bg-white/[0.06]">
          <div className="h-full rounded-[var(--radius-pill)] bg-magic" style={{ width: "40%" }} />
        </div>
        <div className="mono mt-2 flex justify-between text-[11px] text-[var(--color-fg-subtle)] tnum">
          <span>resets in 19 days</span>
          <span>unlimited re-edits</span>
        </div>
      </div>
      <p className="mt-6 text-sm leading-relaxed text-[var(--color-fg-muted)]">
        Pay for minutes of video, re-edit as much as you want. No credits draining mid-project.
      </p>
    </div>
  );
}

export function ValueProof() {
  return (
    <Section>
      <Container>
        <div className="max-w-xl">
          <SectionEyebrow>Why Capto</SectionEyebrow>
          <SectionTitle>You stop paying for someone else&rsquo;s ad budget.</SectionTitle>
          <SectionLede>The pricey tools aren&rsquo;t better. They&rsquo;ve just been around longer.</SectionLede>
        </div>
        <div className="mt-12 grid gap-5 lg:grid-cols-2">
          <PriceBars />
          <MinutesMeter />
        </div>
      </Container>
    </Section>
  );
}
