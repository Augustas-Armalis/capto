import { Container } from "@/components/ui/container";

const PLATFORMS = ["TikTok", "Instagram Reels", "YouTube Shorts", "X", "LinkedIn", "Threads", "Snapchat", "Pinterest"];

export function LogoMarquee() {
  const loop = [...PLATFORMS, ...PLATFORMS];
  return (
    <section className="border-y border-white/[0.05] py-12">
      <Container>
        <p className="eyebrow text-center">Made for every platform short-form lives on</p>
      </Container>
      <div className="mt-7 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_15%,#000_85%,transparent)]">
        <div className="marquee-track flex w-max gap-14" style={{ animationDuration: "40s" }}>
          {loop.map((label, i) => (
            <span key={`${label}-${i}`} className="whitespace-nowrap text-lg font-medium tracking-tight text-[var(--color-fg-subtle)]">
              {label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
