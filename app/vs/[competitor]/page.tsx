import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check, X } from "lucide-react";
import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Section, SectionEyebrow, SectionTitle } from "@/components/ui/section";
import { Aurora } from "@/components/marketing/aurora";
import { JsonLd, faqLd } from "@/components/seo/json-ld";
import { getVs, vsSlugs, VS, type VsCell } from "@/lib/vs";
import { cn } from "@/lib/utils";

export function generateStaticParams() {
  return vsSlugs().map((competitor) => ({ competitor }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ competitor: string }>;
}): Promise<Metadata> {
  const { competitor } = await params;
  const v = getVs(competitor);
  if (!v) return {};
  return {
    title: v.metaTitle,
    description: v.metaDescription,
    alternates: { canonical: `/vs/${v.slug}` },
    openGraph: { title: v.metaTitle, description: v.metaDescription, url: `/vs/${v.slug}` },
  };
}

function Cell({ v, capto }: { v: VsCell; capto: boolean }) {
  if (typeof v === "string")
    return <span className={cn("text-sm", capto ? "font-semibold text-white" : "text-[var(--color-fg-muted)]")}>{v}</span>;
  return v ? (
    <Check className={cn("mx-auto size-4", capto ? "text-[var(--color-brand)]" : "text-[var(--color-fg)]")} />
  ) : (
    <X className="mx-auto size-4 text-[var(--color-fg-subtle)]" />
  );
}

export default async function VsPage({ params }: { params: Promise<{ competitor: string }> }) {
  const { competitor } = await params;
  const v = getVs(competitor);
  if (!v) notFound();

  return (
    <>
      <JsonLd data={[faqLd(v.faq.map((f) => ({ q: f.q, a: f.a, text: f.a })))]} />
      <SiteNav />
      <main className="relative">
        {/* Hero */}
        <section className="relative overflow-hidden pb-12 pt-28 sm:pt-36">
          <Aurora preset="hero" />
          <Container size="narrow" className="relative text-center">
            <span className="eyebrow inline-flex rounded-[var(--radius-pill)] border border-white/10 bg-white/[0.04] px-3 py-1 backdrop-blur-md">
              {v.tag}
            </span>
            <h1 className="display mx-auto mt-6 max-w-3xl text-balance text-4xl text-white sm:text-6xl">
              {v.title}
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg text-[var(--color-fg-muted)]">{v.intro}</p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button href="/signup" size="lg" variant="primary">
                Start free
                <ArrowRight className="size-4" />
              </Button>
              <Button href="/pricing" size="lg" variant="outline">
                See pricing
              </Button>
            </div>
            <p className="mt-5 text-sm text-[var(--color-fg-subtle)]">{v.heroNote}</p>
          </Container>
        </section>

        {/* Trust strip */}
        <Container size="narrow">
          <p className="rounded-[var(--radius-xl)] border border-white/[0.08] bg-white/[0.02] px-5 py-3 text-center text-xs text-[var(--color-fg-muted)]">
            Powered by Contles · Built by creators, in Europe · No outside investors yet, no growth-at-all-costs pricing
          </p>
        </Container>

        {/* Who each is for */}
        <Section className="py-16 sm:py-20">
          <Container>
            <SectionTitle className="text-center">Who each one is actually for.</SectionTitle>
            <div className="mt-10 grid gap-4 md:grid-cols-2">
              <div className="rounded-[var(--radius-2xl)] border border-[var(--color-brand)]/40 bg-[var(--color-brand-soft)] p-7">
                <h3 className="heading text-lg text-white">Pick Capto if</h3>
                <p className="mt-3 text-sm leading-relaxed text-[var(--color-fg-muted)]">{v.whoCapto}</p>
              </div>
              <div className="rounded-[var(--radius-2xl)] border border-white/[0.08] bg-white/[0.02] p-7">
                <h3 className="heading text-lg text-[var(--color-fg)]">Pick {v.competitor} if</h3>
                <p className="mt-3 text-sm leading-relaxed text-[var(--color-fg-muted)]">{v.whoCompetitor}</p>
              </div>
            </div>
            {v.whoNote && (
              <p className="mt-6 text-center text-sm text-[var(--color-fg-subtle)]">{v.whoNote}</p>
            )}
          </Container>
        </Section>

        {/* Side by side */}
        <Section className="py-16 sm:py-20">
          <Container>
            <SectionTitle className="text-center">Side by side.</SectionTitle>
            <div className="mt-10 overflow-x-auto rounded-[var(--radius-2xl)] border border-white/[0.08] bg-white/[0.02]">
              <table className="w-full min-w-[560px] border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.08]">
                    <th className="px-6 py-4 text-left text-sm font-medium text-[var(--color-fg-subtle)]" />
                    <th className="px-4 py-4 text-center text-sm font-semibold text-[var(--color-brand)]">Capto</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-[var(--color-fg-muted)]">{v.competitor}</th>
                  </tr>
                </thead>
                <tbody>
                  {v.table.map((r) => (
                    <tr key={r.label} className="border-b border-white/[0.05] last:border-0">
                      <td className="px-6 py-3.5 text-left text-sm text-[var(--color-fg-muted)]">{r.label}</td>
                      <td className="bg-[var(--color-brand)]/[0.06] px-4 py-3.5 text-center"><Cell v={r.capto} capto /></td>
                      <td className="px-4 py-3.5 text-center"><Cell v={r.competitor} capto={false} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Container>
        </Section>

        {/* Where Capto wins */}
        <Section className="py-16 sm:py-20">
          <Container>
            <SectionEyebrow>Where Capto wins</SectionEyebrow>
            <SectionTitle>The things you'll feel daily.</SectionTitle>
            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {v.captoWins.map((w) => (
                <div key={w.title} className="rounded-[var(--radius-2xl)] border border-white/[0.08] bg-white/[0.02] p-6">
                  <h3 className="heading text-base text-white">{w.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--color-fg-muted)]">{w.body}</p>
                </div>
              ))}
            </div>
          </Container>
        </Section>

        {/* Where competitor wins (honest) */}
        <Section className="py-16 sm:py-20">
          <Container size="narrow">
            <SectionEyebrow>Where {v.competitor} wins</SectionEyebrow>
            <SectionTitle>{v.competitorWins.intro}</SectionTitle>
            <div className="mt-8 space-y-4">
              {v.competitorWins.points.map((p) => (
                <div key={p.title} className="rounded-[var(--radius-xl)] border border-white/[0.06] bg-white/[0.015] p-5">
                  <h3 className="heading text-base text-[var(--color-fg)]">{p.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--color-fg-muted)]">{p.body}</p>
                </div>
              ))}
            </div>
            <p className="mt-6 text-sm leading-relaxed text-[var(--color-fg-subtle)]">{v.competitorWins.outro}</p>
          </Container>
        </Section>

        {/* Pricing math */}
        <Section className="py-16 sm:py-20">
          <Container size="narrow">
            <SectionEyebrow>The pricing math</SectionEyebrow>
            <SectionTitle>What the difference actually is.</SectionTitle>
            <div className="mt-10 overflow-hidden rounded-[var(--radius-2xl)] border border-white/[0.08] bg-white/[0.02]">
              <div className="grid grid-cols-3 border-b border-white/[0.08] px-6 py-4 text-sm font-medium">
                <span className="text-[var(--color-fg-subtle)]" />
                <span className="text-center text-[var(--color-brand)]">Capto Pro</span>
                <span className="text-center text-[var(--color-fg-muted)]">{v.competitor}</span>
              </div>
              {v.pricing.rows.map((r) => (
                <div key={r.label} className="grid grid-cols-3 items-center px-6 py-3.5 text-sm odd:bg-white/[0.01]">
                  <span className={cn(r.label === "Difference" ? "font-semibold text-white" : "text-[var(--color-fg-muted)]")}>{r.label}</span>
                  <span className="text-center text-white">{r.capto}</span>
                  <span className={cn("text-center", r.label === "Difference" ? "font-semibold text-[var(--color-brand)]" : "text-[var(--color-fg)]")}>{r.competitor}</span>
                </div>
              ))}
            </div>
            <p className="mt-6 text-sm leading-relaxed text-[var(--color-fg-muted)]">{v.pricing.note}</p>
          </Container>
        </Section>

        {/* Switching FAQ */}
        <Section className="py-16 sm:py-20">
          <Container size="narrow">
            <SectionTitle className="text-center">Switching questions.</SectionTitle>
            <div className="mt-10 space-y-3">
              {v.faq.map((f) => (
                <div key={f.q} className="rounded-[var(--radius-xl)] border border-white/[0.08] bg-white/[0.02] p-6">
                  <h3 className="heading text-base text-white">{f.q}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--color-fg-muted)]">{f.a}</p>
                </div>
              ))}
            </div>
          </Container>
        </Section>

        {/* CTA */}
        <section className="relative py-20 sm:py-28">
          <Container>
            <div className="relative overflow-hidden rounded-[var(--radius-2xl)] border border-white/[0.08] bg-[var(--color-bg-elev)] px-6 py-16 text-center sm:py-20">
              <Aurora preset="cta" />
              <div className="relative mx-auto max-w-xl">
                <h2 className="display text-3xl text-white sm:text-4xl">{v.ctaTitle}</h2>
                <p className="mt-4 text-[var(--color-fg-muted)]">{v.ctaBody}</p>
                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Button href="/signup" size="lg" variant="primary">
                    Start free
                    <ArrowRight className="size-4" />
                  </Button>
                  <Button href="/pricing" size="lg" variant="outline">
                    See pricing
                  </Button>
                </div>
              </div>
            </div>
          </Container>
        </section>

        {/* Footer micro-CTA: cross-link the other comparisons */}
        <Container size="narrow" className="pb-16">
          <div className="rounded-[var(--radius-xl)] border border-white/[0.08] bg-white/[0.02] px-6 py-5 text-center">
            <p className="text-sm font-medium text-[var(--color-fg)]">Still comparing?</p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              {VS.filter((o) => o.slug !== v.slug).map((o) => (
                <Link
                  key={o.slug}
                  href={`/vs/${o.slug}`}
                  className="rounded-full border border-[var(--color-border)] px-3.5 py-1.5 text-sm text-[var(--color-fg-muted)] transition-colors hover:border-[var(--color-brand)]/40 hover:text-white"
                >
                  vs {o.competitor}
                </Link>
              ))}
            </div>
          </div>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
