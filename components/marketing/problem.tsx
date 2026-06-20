import { Container } from "@/components/ui/container";
import { Section, SectionTitle } from "@/components/ui/section";
import { cn } from "@/lib/utils";

const OPTIONS = [
  {
    title: "Skip captions.",
    body: "85% of feeds scroll silent. Your video dies before it loads.",
  },
  {
    title: "Do them in CapCut.",
    body: "90 minutes per clip. Still looks like everyone else's.",
  },
  {
    title: "Pay Submagic €19/mo.",
    body: "Better, but watermarked free, capped on credits, re-encoded on export.",
  },
  {
    title: "Or use Capto.",
    body: "90 seconds. No watermark. €6.99.",
    capto: true,
  },
];

export function Problem() {
  return (
    <Section className="py-20 sm:py-28">
      <Container>
        <SectionTitle className="text-center">Three bad options. One good one.</SectionTitle>
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
      </Container>
    </Section>
  );
}
