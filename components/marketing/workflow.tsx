import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Section, SectionEyebrow, SectionTitle } from "@/components/ui/section";

const STEPS = [
  { n: "01", title: "Drop", body: "Any clip, any format. Up to 4K." },
  { n: "02", title: "Transcribe", body: "Word level, 50+ languages, auto synced." },
  { n: "03", title: "Style", body: "Pick a preset. Tweak it. Save it." },
  { n: "04", title: "Export", body: "1080p or original. No watermark." },
];

export function Workflow() {
  return (
    <Section>
      <Container>
        <div className="max-w-xl">
          <SectionEyebrow>How it works</SectionEyebrow>
          <SectionTitle>Under two minutes, every time.</SectionTitle>
        </div>

        <div className="mt-14 grid gap-px overflow-hidden rounded-[var(--radius-xl)] border border-white/[0.07] bg-white/[0.06] sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <div key={s.title} className="relative bg-[var(--color-bg)] p-7">
              <div className="mono text-sm text-[var(--color-violet)] tnum">{s.n}</div>
              <h3 className="heading mt-8 text-lg text-white">{s.title}</h3>
              <p className="mt-1.5 text-sm text-[var(--color-fg-muted)]">{s.body}</p>
              {i < STEPS.length - 1 && (
                <div className="absolute right-0 top-1/2 hidden h-px w-4 -translate-y-1/2 translate-x-1/2 bg-white/10 lg:block" />
              )}
            </div>
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <Button href="/signup" size="lg" variant="primary">
            Start free
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </Container>
    </Section>
  );
}
