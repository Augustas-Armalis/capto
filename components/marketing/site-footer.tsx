import Link from "next/link";
import Image from "next/image";
import { Container } from "@/components/ui/container";
import { FeedbackButton } from "@/components/feedback/feedback-button";

const COLS = [
  {
    title: "Product",
    links: [
      { href: "/pricing", label: "Pricing" },
      { href: "/styles", label: "Caption styles" },
      { href: "/editor", label: "Open editor" },
      { href: "/faq", label: "FAQ" },
    ],
  },
  {
    title: "Tools",
    links: [
      { href: "/tools/ai-caption-generator", label: "Caption generator" },
      { href: "/tools/subtitle-translator", label: "Translator" },
      { href: "/tools/srt-to-vtt-converter", label: "SRT → VTT" },
      { href: "/tools", label: "All tools" },
    ],
  },
  {
    title: "Compare",
    links: [
      { href: "/compare/capto-vs-submagic", label: "vs Submagic" },
      { href: "/compare/capto-vs-captions-ai", label: "vs Captions" },
      { href: "/compare/capto-vs-veed", label: "vs VEED" },
      { href: "/compare/capto-vs-opusclip", label: "vs OpusClip" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/blog", label: "Blog" },
      { href: "/contact", label: "Contact" },
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="relative border-t border-[var(--color-border)] pb-10 pt-16">
      <Container>
        <div data-reveal-stagger className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-6">
          <div className="col-span-2">
            <Link href="/" className="flex items-center" aria-label="Capto home">
              <Image src="/wordmark.png" alt="Capto" width={108} height={32} className="h-[26px] w-auto" />
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-[var(--color-fg-muted)]">
              The focused caption tool for short-form video.
            </p>
            <p className="mono mt-4 inline-flex items-center gap-2 text-[11px] text-[var(--color-fg-subtle)]">
              <span className="size-1.5 bg-[var(--color-brand)]" />
              Mac + Windows apps coming soon
            </p>
          </div>

          {COLS.map((col) => (
            <div key={col.title}>
              <h4 className="text-[13px] font-medium text-white">{col.title}</h4>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.href + l.label}>
                    <Link href={l.href} className="text-[13px] text-[var(--color-fg-muted)] transition-colors hover:text-white">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-col gap-4 border-t border-[var(--color-border)] pt-6 md:flex-row md:items-center md:justify-between">
          <p className="mono text-[11px] text-[var(--color-fg-subtle)]">© {new Date().getFullYear()} Capto</p>
          <div className="flex items-center gap-5 text-[12px] text-[var(--color-fg-subtle)]">
            <Link href="/privacy" className="hover:text-[var(--color-fg-muted)]">Privacy</Link>
            <Link href="/terms" className="hover:text-[var(--color-fg-muted)]">Terms</Link>
            <FeedbackButton variant="inline" />
          </div>
        </div>
      </Container>
    </footer>
  );
}
