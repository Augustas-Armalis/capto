import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Wand2 } from "lucide-react";
import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { PageHero } from "@/components/marketing/page-hero";
import { CtaBanner } from "@/components/marketing/cta-banner";
import { Container } from "@/components/ui/container";
import { TOOLS } from "@/lib/tools";

export const metadata: Metadata = {
  title: "Free video & subtitle tools",
  description:
    "Free tools from Capto, AI caption generator, subtitle translator, SRT↔VTT converter, SRT creator and audio-to-text. No watermark on paid.",
  alternates: { canonical: "/tools" },
};

export default function ToolsIndex() {
  return (
    <>
      <SiteNav />
      <main>
        <PageHero
          eyebrow="Free tools"
          title="Small tools that do one thing well."
          lede="Each is a real entry point into Capto, start free with your own Groq key, upgrade to drop the watermark when you're ready."
        />
        <section className="py-16">
          <Container>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {TOOLS.map((t) => (
                <Link
                  key={t.slug}
                  href={`/tools/${t.slug}`}
                  className="group flex flex-col rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-6 transition-colors hover:border-[var(--color-border-strong)]"
                >
                  <div className="inline-flex size-10 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-brand)]">
                    <Wand2 className="size-5" strokeWidth={1.75} />
                  </div>
                  <h2 className="heading mt-5 text-lg text-[var(--color-fg)]">{t.name}</h2>
                  <p className="mt-2 flex-1 text-sm text-[var(--color-fg-muted)]">{t.tagline}</p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-brand)]">
                    Open tool
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
