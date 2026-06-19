import type { Metadata } from "next";
import { ArrowRight, Building2, Layers, Shield, Workflow } from "lucide-react";
import { SiteNav } from "@/components/marketing/site-nav";
import { Aurora } from "@/components/marketing/aurora";
import { SiteFooter } from "@/components/marketing/site-footer";
import { CtaBanner } from "@/components/marketing/cta-banner";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Section, SectionEyebrow, SectionTitle } from "@/components/ui/section";

export const metadata: Metadata = {
  alternates: { canonical: "/for-brands" },
  title: "For brands & agencies",
  description:
    "Capto for content teams. Brand-consistent caption presets, fast turnaround, per-client workspaces.",
};

const PILLARS = [
  {
    icon: Building2,
    title: "Brand-locked presets",
    body: "Save your typeface, weight, color, and highlight style as a one-click preset. Every caption matches the brand book.",
  },
  {
    icon: Layers,
    title: "Workspaces per client",
    body: "Keep clients separated. Each gets its own preset, language defaults, and project history.",
  },
  {
    icon: Workflow,
    title: "Built for batch",
    body: "Caption a stack of clips while you're on the call. Export queue runs in the background.",
  },
  {
    icon: Shield,
    title: "Your IP stays yours",
    body: "Videos aren't stored past export. Transcription uses your own keys if you prefer. SOC 2 in progress.",
  },
];

export default function ForBrandsPage() {
  return (
    <>
      <SiteNav />
      <main className="relative">
      <Aurora preset="hero" className="-z-10" />
        <section className="relative pt-40 pb-16 overflow-hidden">
          <div className="absolute inset-0 blueprint blueprint-fade" />
          <Container className="relative">
            <Badge variant="brand">For brands & agencies</Badge>
            <h1 className="display mt-5 text-5xl sm:text-7xl  max-w-3xl">
              Caption everything.
              <br />
              <span className="text-[var(--color-brand)]">Without a junior editor.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-[var(--color-fg-muted)] leading-relaxed">
              For content teams shipping ten reels a week across five clients. Brand-consistent
              presets, fast turnaround, no per-export gotchas.
            </p>
            <div className="mt-9 flex flex-col sm:flex-row gap-3">
              <Button href="/signup" size="lg">
                Start free
                <ArrowRight className="size-4" />
              </Button>
              <Button href="/contact" variant="outline" size="lg">
                Talk to us
              </Button>
            </div>
          </Container>
        </section>

        <Section className="border-t border-[var(--color-border)]">
          <Container>
            <SectionEyebrow>Why agencies switch</SectionEyebrow>
            <SectionTitle>Four reasons the editor flips first.</SectionTitle>
            <div className="mt-14 grid gap-5 sm:grid-cols-2">
              {PILLARS.map((p) => (
                <div
                  key={p.title}
                  className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-7"
                >
                  <div className="inline-flex size-11 items-center justify-center rounded-2xl bg-[var(--color-brand)]/15 text-[var(--color-brand)]">
                    <p.icon className="size-5" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold">{p.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--color-fg-muted)]">
                    {p.body}
                  </p>
                </div>
              ))}
            </div>
          </Container>
        </Section>

        <CtaBanner />
      </main>
      <SiteFooter />
    </>
  );
}
