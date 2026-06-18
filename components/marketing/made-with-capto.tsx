import { Container } from "@/components/ui/container";
import { SectionEyebrow, SectionTitle, SectionLede } from "@/components/ui/section";

// Placeholder reel cards until real creator clips land.
// When you have MP4s: replace the inner block with
// <video autoPlay muted loop playsInline className="absolute inset-0 size-full object-cover" />
const REELS = [
  { tag: "GRWM", line: ["YOU CAN'T", "JUST WAKE", "UP & POST"], hot: 1, bg: "from-[#2a1840] to-[#0c0612]", accent: "bg-[var(--color-fuchsia)]" },
  { tag: "FOUNDER", line: ["MOST", "STARTUPS", "FAIL HERE"], hot: 2, bg: "from-[#0f2a3a] to-[#04101a]", accent: "bg-[var(--color-cyan)]" },
  { tag: "FITNESS", line: ["3 RULES", "BEFORE", "YOU START"], hot: 1, bg: "from-[#241a06] to-[#0c0a04]", accent: "bg-[#ffd233]" },
  { tag: "HOT TAKE", line: ["EVERYONE'S", "WRONG", "ABOUT THIS"], hot: 1, bg: "from-[#1c1840] to-[#0a0818]", accent: "bg-[var(--color-violet)]" },
  { tag: "B2B", line: ["YOUR ICP", "ISN'T WHO", "YOU THINK"], hot: 1, bg: "from-[#22142e] to-[#0b0610]", accent: "bg-[var(--color-violet)]" },
  { tag: "VLOG", line: ["WE LIVED", "OUT OF", "A CAR"], hot: 1, bg: "from-[#0d2420] to-[#040c0a]", accent: "bg-[var(--color-cyan)]" },
];

function Reel({ tag, line, hot, bg, accent }: (typeof REELS)[number]) {
  return (
    <div className="relative h-[360px] w-[208px] shrink-0 overflow-hidden rounded-[var(--radius-lg)] border border-white/[0.08]">
      <div className={`absolute inset-0 bg-gradient-to-b ${bg}`} />
      <div className="absolute left-3 top-3 mono text-[10px] uppercase tracking-wider text-white/70">{tag}</div>
      <div className="absolute inset-x-3 bottom-10 text-center text-lg font-bold uppercase leading-tight tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.7)]">
        {line.map((w, i) => (
          <div key={i} className="py-0.5">
            <span className={i === hot ? `${accent} rounded px-1 text-black` : ""}>{w}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MadeWithCapto() {
  const loop = [...REELS, ...REELS];
  return (
    <section className="py-24 sm:py-32">
      <Container>
        <div className="max-w-xl">
          <SectionEyebrow>Made with Capto</SectionEyebrow>
          <SectionTitle>Real clips. No watermark to hide behind.</SectionTitle>
          <SectionLede>Short-form from creators who dropped the pricey tools.</SectionLede>
        </div>
      </Container>

      <div className="marquee-paused mt-12 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_5%,#000_95%,transparent)]">
        <div className="marquee-track flex w-max gap-4" style={{ animationDuration: "70s" }}>
          {loop.map((r, i) => (
            <Reel key={`${r.tag}-${i}`} {...r} />
          ))}
        </div>
      </div>
    </section>
  );
}
