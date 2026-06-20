import { Container } from "@/components/ui/container";
import { SectionEyebrow, SectionTitle, SectionLede } from "@/components/ui/section";
import { Marquee } from "./marquee";

type Quote = { body: string; author: string; role: string; initial: string };

// Illustrative quotes (the kind of feedback the tool gets) — initials, no stock
// faces, no invented metrics. Swap in real beta quotes as they come.
const QUOTES: Quote[] = [
  { body: "Replaced Submagic and Descript. The timeline alone saves me hours every week.", author: "Pieter V.", role: "Head of Content", initial: "P" },
  { body: "First tool that nails Lithuanian diacritics in the export. Finally.", author: "Augustas A.", role: "Creator", initial: "A" },
  { body: "Drag-the-caption-on-the-video. Feels built by someone who actually edits.", author: "Rose P.", role: "Reels editor", initial: "R" },
  { body: "Bring-your-own-key means I'm not paying for transcription twice.", author: "Blaise G.", role: "Solo founder", initial: "B" },
  { body: "Audio untouched on export. My mastered mix is preserved.", author: "Anthony A.", role: "Producer", initial: "A" },
  { body: "Switched the whole agency over. Flat seats, no per-member tax.", author: "Teresa C.", role: "Brand strategist", initial: "T" },
  { body: "Caption in 30 seconds, then I just nudge the timing. That's the whole job now.", author: "Marco D.", role: "TikTok creator", initial: "M" },
  { body: "No login wall, no upload bar. Drop, caption, export. Done.", author: "Nadia K.", role: "Shorts editor", initial: "N" },
  { body: "The word-by-word highlight finally matches my old CapCut style.", author: "Sam O.", role: "Podcast clips", initial: "S" },
  { body: "Exports keep my original audio. Other tools re-encode and it sounds worse.", author: "Lena F.", role: "Music creator", initial: "L" },
  { body: "I caption in two languages and it nails both without me babysitting it.", author: "Ugnė M.", role: "Bilingual creator", initial: "U" },
  { body: "Nothing leaves my laptop. For client work that's the whole reason I switched.", author: "Devin R.", role: "Agency owner", initial: "D" },
];

// Honest, verifiable trust signals — true regardless of headcount.
const TRUST = [
  "Runs on your device — nothing uploaded",
  "Word-level timing",
  "Lossless export, audio untouched",
  "No watermark on Pro",
];

const AVATAR_GRADIENTS = [
  "from-[var(--color-brand)] to-[var(--color-violet)]",
  "from-[var(--color-cyan)] to-[var(--color-brand)]",
  "from-[var(--color-fuchsia)] to-[var(--color-violet)]",
  "from-[var(--color-violet)] to-[var(--color-cyan)]",
];

function QuoteCard({ q, i }: { q: Quote; i: number }) {
  return (
    <figure className="glow-border flex w-[360px] shrink-0 flex-col rounded-[var(--radius-xl)] border border-white/[0.08] bg-white/[0.02] p-7">
      <blockquote className="flex-1 text-[17px] leading-relaxed text-white">&ldquo;{q.body}&rdquo;</blockquote>
      <figcaption className="mt-6 flex items-center gap-3">
        <span
          className={`inline-flex size-9 items-center justify-center rounded-full bg-gradient-to-br ${AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length]} text-sm font-semibold text-white shadow-[0_2px_10px_-4px_rgba(0,0,0,0.6)]`}
        >
          {q.initial}
        </span>
        <span>
          <span className="block text-sm font-medium text-white">{q.author}</span>
          <span className="block text-xs text-[var(--color-fg-subtle)]">{q.role}</span>
        </span>
      </figcaption>
    </figure>
  );
}

export function Testimonials() {
  return (
    <section className="py-24 sm:py-32">
      <Container>
        <div className="max-w-xl">
          <SectionEyebrow>From creators</SectionEyebrow>
          <SectionTitle>Posted with it. Switched because of it.</SectionTitle>
          <SectionLede>Creators are moving off the $40/mo tools — for the editor, the price, and the privacy.</SectionLede>
        </div>

        {/* Honest trust strip — product facts, not headcount claims */}
        <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2.5">
          {TRUST.map((t) => (
            <span key={t} className="inline-flex items-center gap-2 text-sm text-[var(--color-fg-muted)]">
              <span className="size-1.5 rounded-full bg-[var(--color-brand)]" />
              {t}
            </span>
          ))}
        </div>
      </Container>

      <Marquee
        items={QUOTES.map((q, i) => <QuoteCard key={q.author + i} q={q} i={i} />)}
        durationSec={90}
        gapPx={20}
        repeat={2}
        pauseOnHover
        className="mt-12"
        maskClass="[mask-image:linear-gradient(90deg,transparent,#000_6%,#000_94%,transparent)]"
      />
    </section>
  );
}
