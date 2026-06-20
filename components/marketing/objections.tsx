import { Container } from "@/components/ui/container";
import { Section, SectionTitle } from "@/components/ui/section";

const ITEMS = [
  {
    q: "€6.99 is suspicious.",
    a: "No catch. Small team, no investors yet, no ad budget to fund. Pricey tools are expensive because of their burn rate, not their tech.",
  },
  {
    q: "CapCut is free.",
    a: "And takes 90 minutes per video. Free tier of Capto matches it head to head. Try both this afternoon.",
  },
  {
    q: "I don't post enough.",
    a: "Free covers 3 exports a month with no watermark. Upgrade when you outgrow it.",
  },
  {
    q: "What if Capto disappears?",
    a: "Built by Contles. Real company, real revenue. And every export is yours, lossless, watermark free. Even if we vanished, your videos stay clean.",
  },
];

export function Objections() {
  return (
    <Section className="py-20 sm:py-28">
      <Container size="narrow">
        <SectionTitle className="text-center">Yeah, but.</SectionTitle>
        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {ITEMS.map((it) => (
            <div key={it.q} className="rounded-[var(--radius-2xl)] border border-white/[0.08] bg-white/[0.02] p-6">
              <h3 className="heading text-base text-white">{it.q}</h3>
              <p className="mt-3 text-sm leading-relaxed text-[var(--color-fg-muted)]">{it.a}</p>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
