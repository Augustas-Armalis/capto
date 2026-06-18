import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Check, X, Minus } from "lucide-react";
import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { PageHero } from "@/components/marketing/page-hero";
import { CtaBanner } from "@/components/marketing/cta-banner";
import { RelatedGrid } from "@/components/marketing/related-grid";
import { Container } from "@/components/ui/container";
import { JsonLd, breadcrumbLd } from "@/components/seo/json-ld";
import { COMPARES, getCompare, allCompareSlugs, type CompareRow } from "@/lib/compare";

export function generateStaticParams() {
  return allCompareSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const c = getCompare(slug);
  if (!c) return {};
  return { title: c.title, description: c.description, alternates: { canonical: `/compare/${c.slug}` } };
}

function Cell({ value }: { value: CompareRow["capto"] }) {
  if (value === true) return <Check className="mx-auto size-4 text-[var(--color-brand)]" strokeWidth={2.25} />;
  if (value === false) return <X className="mx-auto size-4 text-[var(--color-fg-subtle)]" />;
  return <span className="mono text-sm text-[var(--color-fg-muted)] tnum">{value}</span>;
}

export default async function ComparePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = getCompare(slug);
  if (!c) notFound();

  return (
    <>
      <JsonLd
        data={breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Compare", path: "/compare" },
          { name: c.title, path: `/compare/${c.slug}` },
        ])}
      />
      <SiteNav />
      <main>
        <PageHero
          eyebrow="Comparison"
          title={c.title}
          lede={c.tagline}
          crumbs={[
            { name: "Home", href: "/" },
            { name: "Compare", href: "/compare" },
          ]}
        />

        <section className="py-16">
          <Container size="narrow">
            {c.intro.map((p, i) => (
              <p key={i} className="text-[17px] leading-relaxed text-[var(--color-fg-muted)] first:mt-0 mt-4">
                {p}
              </p>
            ))}

            {/* table */}
            <div className="mt-10 overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border)]">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    <th className="px-5 py-3.5 text-left eyebrow">Feature</th>
                    <th className="bg-[var(--color-brand-soft)] px-5 py-3.5 text-center font-semibold text-[var(--color-brand)]">Capto</th>
                    <th className="px-5 py-3.5 text-center font-medium text-[var(--color-fg-muted)]">{c.competitor}</th>
                  </tr>
                </thead>
                <tbody>
                  {c.rows.map((row) => (
                    <tr key={row.feature} className="border-b border-[var(--color-border)] last:border-0">
                      <td className="px-5 py-3 font-medium text-[var(--color-fg)]">{row.feature}</td>
                      <td className="bg-[var(--color-brand-soft)]/40 px-5 py-3 text-center">
                        <Cell value={row.capto} />
                      </td>
                      <td className="px-5 py-3 text-center">
                        <Cell value={row.them} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-10 grid gap-6 sm:grid-cols-2">
              <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-6">
                <h2 className="heading text-lg">Where Capto wins</h2>
                <ul className="mt-4 space-y-2.5">
                  {c.captoWins.map((w) => (
                    <li key={w} className="flex gap-2.5 text-sm text-[var(--color-fg-muted)]">
                      <Check className="mt-0.5 size-4 shrink-0 text-[var(--color-brand)]" />
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-6">
                <h2 className="heading text-lg">Where {c.competitor} wins</h2>
                <ul className="mt-4 space-y-2.5">
                  {c.themWins.map((w) => (
                    <li key={w} className="flex gap-2.5 text-sm text-[var(--color-fg-muted)]">
                      <Minus className="mt-0.5 size-4 shrink-0 text-[var(--color-fg-subtle)]" />
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-10 rounded-[var(--radius-xl)] border border-[var(--color-brand)]/30 bg-[var(--color-brand-soft)] p-6">
              <h2 className="heading text-lg text-[var(--color-fg)]">The verdict</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-[var(--color-fg-muted)]">{c.verdict}</p>
            </div>
          </Container>
        </section>

        <RelatedGrid
          title="More comparisons"
          items={COMPARES.filter((x) => x.slug !== c.slug).map((x) => ({
            href: `/compare/${x.slug}`,
            label: `Capto vs ${x.competitor}`,
            sub: x.tagline,
          }))}
        />
        <CtaBanner />
      </main>
      <SiteFooter />
    </>
  );
}
