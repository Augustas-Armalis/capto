import { Container } from "@/components/ui/container";
import { Money } from "@/components/ui/money";
import { Band, Muted, SectionHead } from "@/components/ui/section";
import { COMPETITOR_PRICES } from "@/lib/pricing";
import { cn } from "@/lib/utils";

const MAX = Math.max(...COMPETITOR_PRICES.map((c) => c.eur));

function PriceBars() {
  return (
    <div className="p-7">
      <div className="flex items-baseline justify-between">
        <h3 className="heading text-[15px] text-white">Entry paid price</h3>
        <span className="mono text-xs text-[var(--color-fg-subtle)]">
          <span className="cur-eur">€</span>
          <span className="cur-usd">$</span> / month
        </span>
      </div>
      <div className="mt-7 space-y-3.5">
        {COMPETITOR_PRICES.map((c) => (
          <div key={c.name} className="flex items-center gap-3">
            <span className={cn("w-24 shrink-0 text-sm", c.us ? "font-medium text-white" : "text-[var(--color-fg-muted)]")}>
              {c.name}
            </span>
            <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/[0.05]">
              <div
                className={cn("h-full rounded-full", c.us ? "bg-[var(--color-violet)]" : "bg-white/20")}
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
    <div className="p-7">
      <div className="flex items-baseline justify-between">
        <h3 className="heading text-[15px] text-white">Minutes, not credits</h3>
        <span className="mono text-xs text-white tnum">238 / 600 min</span>
      </div>
      <div className="mt-6">
        <div className="flex h-8 w-full gap-[3px]" aria-hidden>
          {Array.from({ length: 40 }).map((_, i) => (
            <span key={i} className={cn("flex-1 rounded-[2px]", i < 16 ? "bg-[var(--color-violet)]" : "bg-white/[0.07]")} />
          ))}
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
    <Band className="py-24 sm:py-32">
      <Container>
        <SectionHead
          index="06"
          label="Why Capto"
          title={
            <>
              Stop paying for someone else&rsquo;s ad budget. <Muted>Pay for captions.</Muted>
            </>
          }
          lede="The pricey tools aren't better. They've just been around longer."
        />
        <div data-reveal className="hair-grid d-2 mt-14 lg:grid-cols-2">
          <PriceBars />
          <MinutesMeter />
        </div>
      </Container>
    </Band>
  );
}
