import { ArrowRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Section, SectionEyebrow, SectionTitle } from "@/components/ui/section";

const ROWS = [
  { label: "Per video", manual: "90 min", capto: "90 sec" },
  { label: "Per week", manual: "4.5 hrs", capto: "5 min" },
  { label: "Per year", manual: "29 days", capto: "half a day", strong: true },
];

export function Hours() {
  return (
    <Section className="py-20 sm:py-28">
      <Container size="narrow">
        <div className="text-center">
          <SectionEyebrow>The hours</SectionEyebrow>
          <SectionTitle>29 days a year.</SectionTitle>
          <p className="mt-4 text-lg text-[var(--color-fg-muted)]">
            That&rsquo;s what manual captions cost you.
          </p>
        </div>

        {/* Visual: a month of squares lost to manual captioning vs. half a day with Capto */}
        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          <div className="relative overflow-hidden rounded-[var(--radius-2xl)] border border-white/[0.08] bg-white/[0.02] p-6">
            <div className="flex items-center gap-2 text-sm font-medium text-[var(--color-fg-muted)]">
              <Clock className="size-4" /> Manual
            </div>
            <div className="mt-5 grid grid-cols-[repeat(10,1fr)] gap-1.5" aria-hidden>
              {Array.from({ length: 29 }).map((_, i) => (
                <span
                  key={i}
                  className="aspect-square rounded-[3px] bg-[var(--color-danger)]/35"
                  style={{ animation: `fade-up 480ms var(--ease-out) both`, animationDelay: `${i * 18}ms` }}
                />
              ))}
            </div>
            <p className="mt-5 text-3xl font-bold text-white">
              29 <span className="text-base font-medium text-[var(--color-fg-muted)]">days lost</span>
            </p>
          </div>

          <div className="relative overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--color-brand)]/30 bg-[var(--color-brand)]/[0.06] p-6">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-12 -top-12 size-40 rounded-full bg-[var(--color-brand)]/20 blur-3xl"
            />
            <div className="relative flex items-center gap-2 text-sm font-medium text-[var(--color-brand)]">
              <Clock className="size-4" /> Capto
            </div>
            <div className="relative mt-5 grid grid-cols-[repeat(10,1fr)] gap-1.5" aria-hidden>
              <span
                className="aspect-square rounded-[3px] bg-[var(--color-brand)]"
                style={{ animation: `fade-up 480ms var(--ease-out) both` }}
              />
              {Array.from({ length: 28 }).map((_, i) => (
                <span key={i} className="aspect-square rounded-[3px] bg-white/[0.04]" />
              ))}
            </div>
            <p className="relative mt-5 text-3xl font-bold text-white">
              ½ <span className="text-base font-medium text-[var(--color-fg-muted)]">a day</span>
            </p>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-[var(--radius-2xl)] border border-white/[0.08] bg-white/[0.02]">
          <div className="grid grid-cols-3 border-b border-white/[0.08] px-6 py-4 text-sm font-medium">
            <span className="text-[var(--color-fg-subtle)]" />
            <span className="text-center text-[var(--color-fg-muted)]">Manual</span>
            <span className="text-center text-[var(--color-brand)]">Capto</span>
          </div>
          {ROWS.map((r) => (
            <div key={r.label} className="grid grid-cols-3 items-center px-6 py-4 text-sm odd:bg-white/[0.01]">
              <span className="text-[var(--color-fg-muted)]">{r.label}</span>
              <span className="text-center text-[var(--color-fg)]">{r.manual}</span>
              <span className={r.strong ? "text-center font-bold text-white" : "text-center text-white"}>
                {r.capto}
              </span>
            </div>
          ))}
        </div>

        <p className="mx-auto mt-8 max-w-xl text-center text-[var(--color-fg-muted)]">
          You&rsquo;re not editing. You&rsquo;re not filming. You&rsquo;re dragging text on top of videos you
          already made. Capto gives that month back.
        </p>

        <div className="mt-8 flex justify-center">
          <Button href="/signup" size="lg" variant="primary">
            Get those days back
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </Container>
    </Section>
  );
}
