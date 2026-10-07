import { Container } from "@/components/ui/container";
import { Band, Muted, SectionHead } from "@/components/ui/section";

const ROWS = [
  { label: "Per video", manual: "90 min", capto: "90 sec" },
  { label: "Per week", manual: "4.5 hrs", capto: "5 min" },
  { label: "Per year", manual: "29 days", capto: "½ day" },
];

export function Hours() {
  return (
    <Band className="py-24 sm:py-32">
      <Container>
        <SectionHead
          index="03"
          label="The hours"
          title={
            <>
              You&rsquo;re losing a month a year. <Muted>That&rsquo;s what manual captions cost.</Muted>
            </>
          }
          lede="You're not editing. You're not filming. You're dragging text on top of videos you already made. Capto gives that month back."
        />

        <div data-reveal className="hair-grid d-2 mt-14 lg:grid-cols-[1fr_1fr_0.9fr]">
          {/* Manual: a month of days, burned */}
          <div className="p-7">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-[var(--color-fg-muted)]">Manual</span>
              <span className="mono text-[11px] text-[var(--color-fg-subtle)]">1 square = 1 day</span>
            </div>
            <div className="mt-6 grid grid-cols-10 gap-1" aria-hidden>
              {Array.from({ length: 29 }).map((_, i) => (
                <span
                  key={i}
                  className="aspect-square rounded-[2px] bg-[repeating-linear-gradient(135deg,oklch(1_0_0/0.22)_0_1.5px,transparent_1.5px_4px)] ring-1 ring-inset ring-white/15"
                />
              ))}
            </div>
            <p className="mt-6 flex items-baseline gap-2">
              <span className="display text-4xl text-white tnum">29</span>
              <span className="text-sm text-[var(--color-fg-muted)]">days a year</span>
            </p>
          </div>

          {/* Capto */}
          <div className="p-7">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-[var(--color-brand)]">Capto</span>
              <span className="mono text-[11px] text-[var(--color-fg-subtle)]">same output</span>
            </div>
            <div className="mt-6 grid grid-cols-10 gap-1" aria-hidden>
              <span className="relative aspect-square overflow-hidden rounded-[2px] ring-1 ring-inset ring-white/[0.06]">
                <span className="absolute inset-y-0 left-0 w-1/2 bg-[var(--color-violet)] shadow-[0_0_12px_var(--color-violet)]" />
              </span>
              {Array.from({ length: 28 }).map((_, i) => (
                <span key={i} className="aspect-square rounded-[2px] ring-1 ring-inset ring-white/[0.06]" />
              ))}
            </div>
            <p className="mt-6 flex items-baseline gap-2">
              <span className="display text-4xl text-white tnum">½</span>
              <span className="text-sm text-[var(--color-fg-muted)]">a day a year</span>
            </p>
          </div>

          {/* Table */}
          <div className="flex flex-col">
            <div className="grid grid-cols-3 border-b border-[var(--color-border)] px-6 py-3.5">
              <span />
              <span className="eyebrow text-right">Manual</span>
              <span className="eyebrow text-right !text-[var(--color-brand)]">Capto</span>
            </div>
            {ROWS.map((r) => (
              <div
                key={r.label}
                className="grid flex-1 grid-cols-3 items-center border-b border-[var(--color-border)] px-6 py-4 text-sm last:border-0"
              >
                <span className="text-[var(--color-fg-muted)]">{r.label}</span>
                <span className="mono text-right text-[13px] text-[var(--color-fg-subtle)] tnum line-through decoration-white/20">{r.manual}</span>
                <span className="mono text-right text-[13px] text-white tnum">{r.capto}</span>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </Band>
  );
}
