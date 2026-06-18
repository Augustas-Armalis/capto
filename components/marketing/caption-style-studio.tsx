import Link from "next/link";
import { ArrowUpRight, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Section, SectionEyebrow, SectionTitle, SectionLede } from "@/components/ui/section";
import { LiveCaption } from "./live-caption";
import { STYLES } from "@/lib/styles";

export function CaptionStyleStudio() {
  const tiles = STYLES.slice(0, 4);
  return (
    <Section id="styles">
      <Container>
        <div className="max-w-xl">
          <SectionEyebrow>Style studio</SectionEyebrow>
          <SectionTitle>Styles that look made, not generated.</SectionTitle>
          <SectionLede>Fonts, color, motion, position. Save it once, reuse it everywhere.</SectionLede>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {tiles.map((s, idx) => (
            <Link
              key={s.slug}
              href={`/styles/${s.slug}`}
              className="group relative block aspect-[4/5] overflow-hidden rounded-[var(--radius-lg)] border border-white/[0.08] transition-colors hover:border-white/20"
            >
              <div className={`absolute inset-0 bg-gradient-to-b ${s.bg}`} />
              <div className="absolute inset-0 flex items-center justify-center p-6">
                <LiveCaption
                  words={s.words}
                  wordClass={`${s.wordClass} text-xl sm:text-2xl`}
                  highlightClass={s.highlightClass}
                  interval={760 + idx * 80}
                  single={s.slug === "inter-bold"}
                />
              </div>
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between border-t border-white/10 bg-black/40 px-4 py-2.5 backdrop-blur-md">
                <span className="mono text-xs text-white/80">
                  {s.name}
                  {s.popular ? <span className="ml-2 text-[var(--color-cyan)]">popular</span> : null}
                </span>
                <ArrowUpRight className="size-4 text-white/40 transition-all group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-8 flex justify-center">
          <Button href="/styles" variant="secondary" size="md">
            View all styles
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </Container>
    </Section>
  );
}
