import { Container } from "@/components/ui/container";
import { Band, Muted, SectionHead } from "@/components/ui/section";

const ITEMS = [
  {
    q: "€6.99 is suspicious.",
    a: "No catch. Small team, no investors yet. The pricey tools fund ads, not better captions.",
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
    a: "Real revenue, real team. And every export is yours, lossless and watermark free. Even if we vanished, your videos stay clean.",
  },
];

export function Objections() {
  return (
    <Band className="py-24 sm:py-32">
      <Container>
        <SectionHead
          label="Objections"
          title={
            <>
              Yeah, but. <Muted>Fair. Here&rsquo;s the answer.</Muted>
            </>
          }
        />
        <div data-reveal className="hair-grid d-2 mt-14 sm:grid-cols-2 lg:grid-cols-4">
          {ITEMS.map((it, i) => (
            <div key={it.q} className="p-6">
              <span className="mono text-[11px] text-[var(--color-fg-subtle)] tnum">0{i + 1}</span>
              <h3 className="heading mt-4 text-[15px] text-white sm:mt-8">{it.q}</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--color-fg-muted)]">{it.a}</p>
            </div>
          ))}
        </div>
      </Container>
    </Band>
  );
}
