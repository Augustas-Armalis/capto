import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { PageHero } from "@/components/marketing/page-hero";
import { CtaBanner } from "@/components/marketing/cta-banner";
import { Container } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";
import { JsonLd, articleLd, breadcrumbLd } from "@/components/seo/json-ld";
import { POSTS, getPost, allPostSlugs } from "@/lib/blog";

export function generateStaticParams() {
  return allPostSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: { type: "article", title: post.title, description: post.description, publishedTime: post.date },
  };
}

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const more = POSTS.filter((p) => p.slug !== post.slug).slice(0, 2);

  return (
    <>
      <JsonLd
        data={[
          articleLd(post),
          breadcrumbLd([
            { name: "Home", path: "/" },
            { name: "Blog", path: "/blog" },
            { name: post.title, path: `/blog/${post.slug}` },
          ]),
        ]}
      />
      <SiteNav />
      <main>
        <PageHero
          eyebrow={post.category}
          title={post.title}
          crumbs={[
            { name: "Home", href: "/" },
            { name: "Blog", href: "/blog" },
          ]}
        >
          <p className="mono mt-5 text-xs text-[var(--color-fg-subtle)] tnum">
            {new Date(post.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} ·{" "}
            {post.readingMin} min read
          </p>
        </PageHero>

        <article className="py-16">
          <Container size="narrow">
            <div className="space-y-10">
              {post.sections.map((s, i) => (
                <section key={i}>
                  {s.heading && <h2 className="heading text-2xl text-[var(--color-fg)]">{s.heading}</h2>}
                  {s.paras?.map((p, j) => (
                    <p key={j} className="mt-4 text-[17px] leading-relaxed text-[var(--color-fg-muted)]">
                      {p}
                    </p>
                  ))}
                  {s.bullets && (
                    <ul className="mt-4 space-y-2.5">
                      {s.bullets.map((b, j) => (
                        <li key={j} className="flex gap-3 text-[17px] leading-relaxed text-[var(--color-fg-muted)]">
                          <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-[var(--color-brand)]" />
                          {b}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}
            </div>

            {more.length > 0 && (
              <div className="mt-16 border-t border-[var(--color-border)] pt-8">
                <h3 className="eyebrow">Keep reading</h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {more.map((m) => (
                    <Link
                      key={m.slug}
                      href={`/blog/${m.slug}`}
                      className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-5 transition-colors hover:border-[var(--color-border-strong)]"
                    >
                      <Badge variant="outline" className="text-[10px]">
                        {m.category}
                      </Badge>
                      <span className="mt-3 block text-sm font-medium text-[var(--color-fg)]">{m.title}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </Container>
        </article>
        <CtaBanner />
      </main>
      <SiteFooter />
    </>
  );
}
