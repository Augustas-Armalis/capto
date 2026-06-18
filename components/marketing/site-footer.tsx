import Link from "next/link";
import Image from "next/image";
import { Container } from "@/components/ui/container";
import { PoweredByContles } from "./powered-by-contles";

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
      { href: "/compare/subby-vs-submagic", label: "vs Submagic" },
      { href: "/compare/subby-vs-captions-ai", label: "vs Captions" },
      { href: "/compare/subby-vs-veed", label: "vs VEED" },
      { href: "/compare/subby-vs-opusclip", label: "vs OpusClip" },
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
    <footer className="relative border-t border-white/[0.06] py-16">
      <Container>
        <div className="grid grid-cols-2 gap-10 md:grid-cols-6">
          <div className="col-span-2">
            <Link href="/" className="flex items-center">
              <Image src="/wordmark.png" alt="Capto" width={122} height={36} className="h-8 w-auto" />
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-[var(--color-fg-muted)]">
              Captions, redesigned. AI subtitles for short-form video.
            </p>
            <div className="mt-6">
              <PoweredByContles />
            </div>
          </div>

          {COLS.map((col) => (
            <div key={col.title}>
              <h4 className="eyebrow">{col.title}</h4>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.href + l.label}>
                    <Link
                      href={l.href}
                      className="text-sm text-[var(--color-fg-muted)] transition-colors hover:text-white"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-white/[0.06] pt-6 md:flex-row md:items-center md:justify-between">
          <p className="text-xs text-[var(--color-fg-subtle)]">
            © {new Date().getFullYear()} Capto. Built &amp; powered by Contles.
          </p>
          <div className="flex items-center gap-4 text-xs text-[var(--color-fg-subtle)]">
            <Link href="/privacy" className="hover:text-[var(--color-fg-muted)]">Privacy</Link>
            <Link href="/terms" className="hover:text-[var(--color-fg-muted)]">Terms</Link>
            <PoweredByContles variant="inline" />
          </div>
        </div>
      </Container>
    </footer>
  );
}
