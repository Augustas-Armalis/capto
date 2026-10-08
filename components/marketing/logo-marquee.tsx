import { Marquee } from "./marquee";

const PLATFORMS = ["TikTok", "Instagram Reels", "YouTube Shorts", "X", "LinkedIn", "Threads", "Snapchat", "Pinterest"];

export function LogoMarquee() {
  const items = PLATFORMS.map((label) => (
    <span className="whitespace-nowrap text-[15px] font-medium tracking-tight text-[var(--color-fg-subtle)]">{label}</span>
  ));
  return (
    <section className="relative border-y border-[var(--color-border)] bg-[var(--color-bg)]">
      <div data-reveal className="mx-auto flex w-full max-w-6xl flex-col items-start gap-4 px-5 py-8 sm:flex-row sm:items-center sm:gap-10 sm:px-6 lg:px-8">
        <p className="eyebrow shrink-0">Built for every feed</p>
        <Marquee items={items} durationSec={45} gapPx={48} repeat={3} className="w-full min-w-0 flex-1" />
      </div>
    </section>
  );
}
