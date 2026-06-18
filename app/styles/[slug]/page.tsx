import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Check, ArrowRight } from "lucide-react";
import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { PageHero } from "@/components/marketing/page-hero";
import { CtaBanner } from "@/components/marketing/cta-banner";
import { RelatedGrid } from "@/components/marketing/related-grid";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { LiveCaption } from "@/components/marketing/live-caption";
import { JsonLd, breadcrumbLd } from "@/components/seo/json-ld";
import { STYLES, getStyle, allStyleSlugs } from "@/lib/styles";

export function generateStaticParams() {
  return allStyleSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const s = getStyle(slug);
  if (!s) return {};
  return { title: s.title, description: s.description, alternates: { canonical: `/styles/${s.slug}` } };
}

export default async function StylePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = getStyle(slug);
  if (!s) notFound();

  return (
    <>
      <JsonLd
        data={breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Caption styles", path: "/styles" },
          { name: s.name, path: `/styles/${s.slug}` },
        ])}
      />
      <SiteNav />
      <main>
        <PageHero
          eyebrow="Caption style"
          title={`${s.name} captions`}
          lede={s.blurb}
          crumbs={[
            { name: "Home", href: "/" },
            { name: "Caption styles", href: "/styles" },
          ]}
        />

        <section className="py-16">
          <Container>
            <div className="grid items-center gap-10 lg:grid-cols-2">
              {/* live preview, a 9:16 reel frame playing the style */}
              <div className="flex justify-center">
                <div className="relative aspect-[9/16] w-full max-w-[300px] overflow-hidden rounded-[var(--radius-2xl)] border border-white/[0.1] shadow-[var(--shadow-pop)]">
                  <div className={`absolute inset-0 bg-gradient-to-b ${s.bg}`} />
                  <div className="absolute left-3 top-3 mono text-[10px] uppercase tracking-wider text-white/60">live preview</div>
                  <div className="absolute inset-0 flex items-center justify-center px-8">
                    <LiveCaption
                      words={s.words}
                      wordClass={`${s.wordClass} text-2xl sm:text-3xl`}
                      highlightClass={s.highlightClass}
                      interval={760}
                    />
                  </div>
                  {/* faux progress bar */}
                  <div className="absolute inset-x-4 bottom-4 h-1 overflow-hidden rounded-full bg-white/15">
                    <div className="h-full w-1/3 rounded-full bg-white/70" style={{ animation: "playhead 5s var(--ease-in-out) infinite alternate" }} />
                  </div>
                </div>
              </div>

              {/* recipe */}
              <div>
                <h2 className="heading text-2xl">The recipe</h2>
                <ul className="mt-5 space-y-2.5">
                  {s.recipe.map((r) => (
                    <li key={r} className="flex gap-2.5 text-[15px] text-[var(--color-fg-muted)]">
                      <Check className="mt-0.5 size-4 shrink-0 text-[var(--color-brand)]" />
                      {r}
                    </li>
                  ))}
                </ul>

                <div className="mt-7 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-5">
                  <p className="eyebrow">Best for</p>
                  <p className="mt-2 text-[15px] text-[var(--color-fg)]">{s.bestFor}</p>
                </div>

                <Button href="/signup" size="lg" className="mt-7">
                  Try the {s.name} preset
                  <ArrowRight className="size-4" />
                </Button>
                <p className="mt-2 text-xs text-[var(--color-fg-subtle)]">Free to start · no watermark on paid.</p>
              </div>
            </div>
          </Container>
        </section>

        <RelatedGrid
          title="More caption styles"
          items={STYLES.filter((x) => x.slug !== s.slug).map((x) => ({
            href: `/styles/${x.slug}`,
            label: `${x.name} captions`,
            sub: x.bestFor,
          }))}
        />
        <CtaBanner />
      </main>
      <SiteFooter />
    </>
  );
}
