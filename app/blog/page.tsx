import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { PageHero } from "@/components/marketing/page-hero";
import { CtaBanner } from "@/components/marketing/cta-banner";
import { Container } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";
import { POSTS } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blog, captions, pricing & short-form strategy",
  description:
    "Straight-talking guides on AI captions, honest pricing, and short-form video strategy from the team behind Capto.",
  alternates: { canonical: "/blog" },
};

export default function BlogIndex() {
  const posts = [...POSTS].sort((a, b) => (a.date < b.date ? 1 : -1));
  return (
    <>
      <SiteNav />
      <main>
        <PageHero
          eyebrow="Blog"
          title="Captions, pricing, and the short-form game."
          lede="No fluff, no SEO-mush. Real guides on doing short-form well, and on the pricing games the category plays."
        />
        <section className="py-16">
          <Container>
            <div className="grid gap-5 sm:grid-cols-2">
              {posts.map((p) => (
                <Link
                  key={p.slug}
                  href={`/blog/${p.slug}`}
                  className="group flex flex-col rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-7 transition-colors hover:border-[var(--color-border-strong)]"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="brand">{p.category}</Badge>
                    <span className="mono text-xs text-[var(--color-fg-subtle)]">{p.readingMin} min read</span>
                  </div>
                  <h2 className="heading mt-4 text-xl text-[var(--color-fg)]">{p.title}</h2>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-[var(--color-fg-muted)]">{p.description}</p>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-brand)]">
                    Read
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
