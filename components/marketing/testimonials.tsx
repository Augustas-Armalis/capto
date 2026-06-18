import { Container } from "@/components/ui/container";
import { SectionEyebrow, SectionTitle } from "@/components/ui/section";

type Quote = { body: string; author: string; role: string; initial: string };

const QUOTES: Quote[] = [
  { body: "Replaced Submagic and Descript. The timeline alone saves me hours every week.", author: "Pieter V.", role: "Head of Content", initial: "P" },
  { body: "First tool that nails Lithuanian diacritics in the export. Finally.", author: "Augustas A.", role: "Creator", initial: "A" },
  { body: "Drag-the-caption-on-the-video. Feels built by someone who actually edits.", author: "Rose P.", role: "Reels editor", initial: "R" },
  { body: "Bring-your-own-key means I'm not paying for transcription twice.", author: "Blaise G.", role: "Solo founder", initial: "B" },
  { body: "Audio untouched on export. My mastered mix is preserved.", author: "Anthony A.", role: "Producer", initial: "A" },
  { body: "Switched the whole agency over. Flat seats, no per-member tax.", author: "Teresa C.", role: "Brand strategist", initial: "T" },
];

function QuoteCard({ q }: { q: Quote }) {
  return (
    <figure className="glow-border flex w-[360px] shrink-0 flex-col rounded-[var(--radius-xl)] border border-white/[0.08] bg-white/[0.02] p-7">
      <blockquote className="flex-1 text-[17px] leading-relaxed text-white">&ldquo;{q.body}&rdquo;</blockquote>
      <figcaption className="mt-6 flex items-center gap-3">
        <span className="inline-flex size-9 items-center justify-center rounded-full bg-white/[0.06] text-sm font-medium text-white">{q.initial}</span>
        <span>
          <span className="block text-sm font-medium text-white">{q.author}</span>
          <span className="block text-xs text-[var(--color-fg-subtle)]">{q.role}</span>
        </span>
      </figcaption>
    </figure>
  );
}

export function Testimonials() {
  const loop = [...QUOTES, ...QUOTES];
  return (
    <section className="py-24 sm:py-32">
      <Container>
        <div className="max-w-xl">
          <SectionEyebrow>From creators</SectionEyebrow>
          <SectionTitle>Posted with it. Switched because of it.</SectionTitle>
        </div>
      </Container>

      <div className="marquee-paused mt-12 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_6%,#000_94%,transparent)]">
        <div className="marquee-track flex w-max gap-5" style={{ animationDuration: "60s" }}>
          {loop.map((q, i) => (
            <QuoteCard key={`${q.author}-${i}`} q={q} />
          ))}
        </div>
      </div>
    </section>
  );
}
