import { Container } from "@/components/ui/container";
import { SectionEyebrow, SectionTitle } from "@/components/ui/section";
import { Marquee } from "./marquee";

type Quote = { body: string; author: string; role: string };

// Illustrative quotes — creators + a few brands that run their own UGC. Initials
// avatars, no stock faces, no invented metrics. Swap in real ones as they come.
const QUOTES: Quote[] = [
  { body: "faster than CapCut for captions now, and it is not close", author: "Maya R.", role: "Short form creator" },
  { body: "my retention went up the week I switched", author: "Devon Cole", role: "YouTube Shorts" },
  { body: "we caption all our UGC in house now", author: "Lumi Skincare", role: "Brand" },
  { body: "this just gets it", author: "Priya N.", role: "Reels creator" },
  { body: "the karaoke highlight is unreal", author: "Theo M.", role: "Gaming clips" },
  { body: "clients never see an upload bar, everything stays on my machine", author: "Marta So", role: "Social agency" },
  { body: "ten out of ten", author: "Kojo A.", role: "Creator" },
  { body: "our whole content team runs on this", author: "Brightline Studio", role: "Brand" },
  { body: "captions in seconds, I tweak two words and post", author: "Hana K.", role: "TikTok" },
  { body: "finally one that keeps my audio clean on export", author: "Leon V.", role: "Music edits" },
  { body: "switched and never looked back", author: "Effie R.", role: "Creator" },
  { body: "the editor feels native, not like some web tool", author: "Ravi P.", role: "Podcast clips" },
  { body: "we make a week of shorts in an afternoon", author: "Northbound", role: "Brand" },
  { body: "honestly the timing is perfect every time", author: "Sena O.", role: "Fashion creator" },
];

const AVATAR_GRADIENTS = [
  "from-[var(--color-brand)] to-[var(--color-violet)]",
  "from-[var(--color-cyan)] to-[var(--color-brand)]",
  "from-[var(--color-fuchsia)] to-[var(--color-violet)]",
  "from-[var(--color-violet)] to-[var(--color-cyan)]",
];

function QuoteCard({ q, i }: { q: Quote; i: number }) {
  return (
    <figure className="glow-border flex w-[340px] shrink-0 flex-col rounded-[var(--radius-xl)] border border-white/[0.08] bg-white/[0.02] p-7">
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
        </div>
      </Container>

      <Marquee
        items={QUOTES.map((q, i) => <QuoteCard key={q.author + i} q={q} i={i} />)}
        durationSec={95}
        gapPx={20}
        repeat={2}
        pauseOnHover
        className="mt-12"
        maskClass="[mask-image:linear-gradient(90deg,transparent,#000_6%,#000_94%,transparent)]"
      />
    </section>
  );
}
