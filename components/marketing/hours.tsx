import { ArrowRight } from "lucide-react";
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
          <p className="mt-4 text-lg text-[var(--color-fg-muted)]">That&rsquo;s what manual captions cost you.</p>
        </div>

        <div className="mt-12 overflow-hidden rounded-[var(--radius-2xl)] border border-white/[0.08] bg-white/[0.02]">
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
