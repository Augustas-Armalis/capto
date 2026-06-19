import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";
import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { PageHero } from "@/components/marketing/page-hero";
import { CtaBanner } from "@/components/marketing/cta-banner";
import { LiveCaption } from "@/components/marketing/live-caption";
import { Container } from "@/components/ui/container";
import { STYLES } from "@/lib/styles";

export const metadata: Metadata = {
  title: "Caption styles, Hormozi, Karaoke, Editorial and more",
  description:
    "A curated library of caption styles for short-form video. Hormozi, Karaoke, Editorial, Inter Bold, Neon and more. Apply any in one click in Capto.",
  alternates: { canonical: "/styles" },
};

export default function StylesIndex() {
  return (
    <>
      <SiteNav />
      <main>
        <PageHero
          eyebrow="Caption Style Studio"
          title="Caption styles that read premium."
          lede="Named presets you apply in one click, then tune the font, weight, color and highlight to your brand."
        />
        <section className="py-16">
          <Container>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {STYLES.map((s, idx) => (
                <Link
                  key={s.slug}
                  href={`/styles/${s.slug}`}
                  className="group relative block aspect-[16/9] sm:aspect-[5/4] overflow-hidden rounded-[var(--radius-xl)] border border-white/[0.08] transition-colors hover:border-white/20"
                >
                  <div className={`absolute inset-0 bg-gradient-to-b ${s.bg}`} />
                  <div className="absolute inset-0 flex items-center justify-center p-6">
                    <LiveCaption
                      words={s.words}
                      wordClass={`${s.wordClass} text-xl sm:text-2xl`}
                      highlightClass={s.highlightClass}
                      interval={740 + idx * 80}
                      single={s.single}
                    />
                  </div>
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between border-t border-white/10 bg-black/40 px-4 py-2.5 backdrop-blur-md">
                    <span className="mono text-xs text-white/80">
                      {s.name}
                      {s.popular ? <span className="ml-2 text-[var(--color-cyan)]">most popular</span> : null}
                    </span>
                    <ArrowUpRight className="size-4 text-white/40 transition-all group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </div>
                </Link>
              ))}

              {/* Create your own, every style is fully customizable in the editor */}
              <Link
                href="/signup"
                className="group relative flex aspect-[16/9] sm:aspect-[5/4] flex-col items-center justify-center gap-3 overflow-hidden rounded-[var(--radius-xl)] border border-dashed border-white/15 bg-white/[0.02] p-6 text-center transition-colors hover:border-[var(--color-brand)]/50 hover:bg-white/[0.04]"
              >
                <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-[var(--color-brand)]/15 text-[var(--color-brand)] transition-transform group-hover:scale-105">
                  <Plus className="size-6" />
                </span>
                <span className="heading text-lg text-white">Create your own</span>
                <span className="max-w-[14rem] text-sm text-[var(--color-fg-muted)]">
                  Every preset is a starting point. Tune the font, weight, color, highlight and
                  position, then save it as yours.
                </span>
                <span className="mono mt-1 inline-flex items-center gap-1 text-xs text-[var(--color-brand)]">
                  Open the editor
                  <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </span>
              </Link>
            </div>
          </Container>
        </section>
        <CtaBanner />
      </main>
      <SiteFooter />
    </>
  );
}
