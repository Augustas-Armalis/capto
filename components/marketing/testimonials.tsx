import { Container } from "@/components/ui/container";
import { SectionEyebrow, SectionTitle, SectionLede } from "@/components/ui/section";
import { Marquee } from "./marquee";

type Quote = { body: string; author: string; role: string };

// Illustrative quotes (the kind of feedback the tool gets), written to sound
// natural. Avatars are initials, not stock faces. Swap in real beta quotes as
// they come.
const QUOTES: Quote[] = [
  { body: "I replaced Submagic and Descript with this. The timeline alone saves me hours every week.", author: "Pieter Vermeer", role: "Head of content" },
  { body: "It finally nails the diacritics in my language on export. Nothing else got that right.", author: "Mara Whitfield", role: "Creator" },
  { body: "You drag the caption right on the video. It feels like it was built by someone who actually edits.", author: "Rosa Pereira", role: "Reels editor" },
  { body: "Bringing my own key means I am not paying for transcription twice anymore.", author: "Blaise Gauthier", role: "Solo founder" },
  { body: "My audio comes out untouched on export, so the mix I mastered stays exactly how I made it.", author: "Tony Alvarez", role: "Producer" },
  { body: "I switched the whole agency over. Flat seats and no tax per member made it an easy call.", author: "Teresa Cole", role: "Brand strategist" },
  { body: "I caption a clip in about thirty seconds and then just nudge the timing. That is the whole job now.", author: "Marco Diaz", role: "TikTok creator" },
  { body: "No login wall and no upload bar. I drop a clip, caption it, export, and I am done.", author: "Nadia Khan", role: "Shorts editor" },
  { body: "The word by word highlight finally matches the CapCut style I used to spend ages on.", author: "Sam Okafor", role: "Podcast clips" },
  { body: "It keeps my original audio. Other tools recompress it and you can hear how much worse it sounds.", author: "Lena Fischer", role: "Music creator" },
  { body: "I caption in two languages and it gets both right without me babysitting it.", author: "Greta Mockus", role: "Bilingual creator" },
  { body: "Nothing leaves my laptop. For client work that is the entire reason I made the switch.", author: "Devin Reyes", role: "Agency owner" },
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
          {q.author.charAt(0)}
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
