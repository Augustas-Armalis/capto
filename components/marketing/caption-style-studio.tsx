import Link from "next/link";
import { ArrowUpRight, ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Band, Muted, SectionHead } from "@/components/ui/section";
import { LiveCaption } from "./live-caption";
import { STYLES } from "@/lib/styles";

export function CaptionStyleStudio() {
  const tiles = STYLES.slice(0, 4);
  return (
    <Band id="styles" className="py-24 sm:py-32">
      <Container>
        <SectionHead
          index="04"
          label="Style studio"
          title={
            <>
              Captions that look like yours. <Muted>Not like the tool&rsquo;s.</Muted>
            </>
          }
          lede={
            <>
              Submagic looks like Submagic. CapCut looks like CapCut. Capto looks like you.
              <Link
                href="/styles"
                className="group mt-4 flex w-fit items-center gap-1.5 text-sm text-white transition-colors hover:text-[var(--color-brand)]"
              >
                Browse all styles
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </>
          }
        />

        <div data-reveal-stagger className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {tiles.map((s, idx) => (
            <Link
              key={s.slug}
              href={`/styles/${s.slug}`}
              className="group relative flex flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-bg-elev)] transition-colors duration-300 hover:border-white/20"
            >
              <div className="relative aspect-[16/11] overflow-hidden sm:aspect-[4/5]">
                <div className={`absolute inset-0 bg-gradient-to-b ${s.bg} opacity-80 transition-opacity duration-300 group-hover:opacity-100`} />
                <div className="absolute inset-0 bg-[radial-gradient(oklch(1_0_0/0.07)_1px,transparent_1px)] [background-size:12px_12px]" />
                <div className="absolute inset-0 flex items-center justify-center p-6">
                  <LiveCaption
                    words={s.words}
                    wordClass={`${s.wordClass} text-xl sm:text-2xl`}
                    highlightClass={s.highlightClass}
                    interval={760 + idx * 80}
                    single={s.single}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-[var(--color-border)] px-4 py-3">
                <span className="text-[13px] text-white">
                  {s.name}
                  {s.popular ? <span className="mono ml-2 text-[10px] uppercase tracking-wider text-[var(--color-brand)]">popular</span> : null}
                </span>
                <ArrowUpRight className="size-3.5 text-[var(--color-fg-subtle)] transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white" />
              </div>
            </Link>
          ))}
        </div>
      </Container>
    </Band>
  );
}
