import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Upload, ArrowRight } from "lucide-react";
import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { PageHero } from "@/components/marketing/page-hero";
import { CtaBanner } from "@/components/marketing/cta-banner";
import { RelatedGrid } from "@/components/marketing/related-grid";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { JsonLd, breadcrumbLd, howToLd, faqLd } from "@/components/seo/json-ld";
import { TOOLS, getTool, allToolSlugs } from "@/lib/tools";

export function generateStaticParams() {
  return allToolSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const t = getTool(slug);
  if (!t) return {};
  return { title: t.title, description: t.description, alternates: { canonical: `/tools/${t.slug}` } };
}

export default async function ToolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = getTool(slug);
  if (!t) notFound();

  const related = t.related
    .map((s) => TOOLS.find((x) => x.slug === s))
    .filter(Boolean)
    .map((x) => ({ href: `/tools/${x!.slug}`, label: x!.name, sub: x!.tagline }));

  return (
    <>
      <JsonLd
        data={[
          breadcrumbLd([
            { name: "Home", path: "/" },
            { name: "Tools", path: "/tools" },
            { name: t.name, path: `/tools/${t.slug}` },
          ]),
          howToLd(t.name, t.steps),
          faqLd(t.faqs.map((f) => ({ q: f.q, text: f.text, a: f.text }))),
        ]}
      />
      <SiteNav />
      <main>
        <PageHero
          eyebrow="Free tool"
          title={t.name}
          lede={t.tagline}
          crumbs={[
            { name: "Home", href: "/" },
            { name: "Tools", href: "/tools" },
          ]}
        >
          {/* the tool entry card */}
          <div className="mt-8 max-w-xl">
            <Button href="/signup" size="lg" className="w-full sm:w-auto">
              <Upload className="size-4" />
              Open {t.name}
              <ArrowRight className="size-4" />
            </Button>
            <p className="mt-2 text-xs text-[var(--color-fg-subtle)]">
              Free to start with your own Groq key · no watermark on paid plans.
            </p>
          </div>
        </PageHero>

        <section className="py-16">
          <Container size="narrow">
            {t.intro.map((p, i) => (
              <p key={i} className="mt-4 text-[17px] leading-relaxed text-[var(--color-fg-muted)] first:mt-0">
                {p}
              </p>
            ))}

            {/* how-to */}
            <h2 className="heading mt-12 text-2xl">How to use it</h2>
            <ol className="mt-5 space-y-4">
              {t.steps.map((s, i) => (
                <li key={i} className="flex gap-4">
                  <span className="mono inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-bg-elev)] text-xs text-[var(--color-fg)] tnum">
                    {i + 1}
                  </span>
                  <span className="pt-1 text-[17px] leading-relaxed text-[var(--color-fg-muted)]">{s}</span>
                </li>
              ))}
            </ol>

            {/* features */}
            <div className="mt-12 grid gap-4 sm:grid-cols-2">
              {t.features.map((f) => (
                <div key={f.title} className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-5">
                  <h3 className="text-sm font-semibold text-[var(--color-fg)]">{f.title}</h3>
                  <p className="mt-1.5 text-sm text-[var(--color-fg-muted)]">{f.body}</p>
                </div>
              ))}
            </div>

            {/* faq */}
            <h2 className="heading mt-12 text-2xl">FAQ</h2>
            <div className="mt-5 divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
              {t.faqs.map((f) => (
                <div key={f.q} className="py-5">
                  <h3 className="text-base font-medium text-[var(--color-fg)]">{f.q}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-[var(--color-fg-muted)]">{f.text}</p>
                </div>
              ))}
            </div>
          </Container>
        </section>

        <RelatedGrid title="Related tools" items={related} />
        <CtaBanner />
      </main>
      <SiteFooter />
    </>
  );
}
