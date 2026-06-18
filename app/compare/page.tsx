import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { PageHero } from "@/components/marketing/page-hero";
import { CtaBanner } from "@/components/marketing/cta-banner";
import { Container } from "@/components/ui/container";
import { COMPARES } from "@/lib/compare";

export const metadata: Metadata = {
  title: "Compare Capto to other caption tools",
  description:
    "Honest side-by-side comparisons of Capto vs Submagic, Captions.ai, VEED, OpusClip, Zubtitle and Vizard, price, watermark, seats and features.",
  alternates: { canonical: "/compare" },
};

export default function CompareIndex() {
  return (
    <>
      <SiteNav />
      <main>
        <PageHero
          eyebrow="Compare"
          title="How Capto stacks up, honestly."
          lede="We list where competitors win too. But on price, watermarks and per-seat math, the comparison isn't close."
        />
        <section className="py-16">
          <Container>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {COMPARES.map((c) => (
                <Link
                  key={c.slug}
                  href={`/compare/${c.slug}`}
                  className="group flex flex-col rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-6 transition-colors hover:border-[var(--color-border-strong)]"
                >
                  <span className="heading text-lg text-[var(--color-fg)]">Capto vs {c.competitor}</span>
                  <span className="mt-2 flex-1 text-sm text-[var(--color-fg-muted)]">{c.tagline}</span>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-brand)]">
                    See the breakdown
                    <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </span>
                </Link>
              ))}
            </div>
          </Container>
        </section>
        <CtaBanner />
      </main>
      <SiteFooter />
    </>
  );
}
