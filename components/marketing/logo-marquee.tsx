import { Container } from "@/components/ui/container";
import { Marquee } from "./marquee";

const PLATFORMS = ["TikTok", "Instagram Reels", "YouTube Shorts", "X", "LinkedIn", "Threads", "Snapchat", "Pinterest"];

export function LogoMarquee() {
  const items = PLATFORMS.map((label) => (
    <span className="whitespace-nowrap text-lg font-medium tracking-tight text-[var(--color-fg-subtle)]">{label}</span>
  ));
  return (
    <section className="border-y border-white/[0.05] py-12">
      <Container>
        <p className="eyebrow text-center">Made for every platform short-form lives on</p>
      </Container>
      <Marquee items={items} durationSec={45} gapPx={56} repeat={3} className="mt-7" />
    </section>
  );
}
