import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Section, SectionTitle } from "@/components/ui/section";
import { cn } from "@/lib/utils";

const OPTIONS = [
  {
    title: "You skip them.",
    body: "85% of feeds scroll silent. Your video dies before it loads.",
  },
  {
    title: "You make them in CapCut.",
    body: "90 minutes per clip. They still look like everyone else's.",
  },
  {
    title: "You pay Submagic €19/mo.",
    body: "Better, but watermarked free, credit capped, audio re-encoded.",
  },
  {
    title: "Or you use Capto.",
    body: "90 seconds. No watermark. €6.99.",
    capto: true,
  },
];

export function Problem() {
  return (
    <Section className="py-20 sm:py-28">
      <Container>
        <SectionTitle className="text-center">Three ways most creators lose.</SectionTitle>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {OPTIONS.map((o) => (
            <div
              key={o.title}
              className={cn(
                "rounded-[var(--radius-2xl)] border p-6",
                o.capto
                  ? "border-[var(--color-brand)]/40 bg-[var(--color-brand-soft)] glow-border-always"
                  : "border-white/[0.08] bg-white/[0.02]",
              )}
            >
              <h3 className={cn("heading text-lg", o.capto ? "text-white" : "text-[var(--color-fg)]")}>
                {o.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-[var(--color-fg-muted)]">{o.body}</p>
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
