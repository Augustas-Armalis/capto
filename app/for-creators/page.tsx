import type { Metadata } from "next";
import { ArrowRight, Clock, TrendingUp, Heart, Zap } from "lucide-react";
import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { CaptionStyleStudio } from "@/components/marketing/caption-style-studio";
import { CtaBanner } from "@/components/marketing/cta-banner";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Section, SectionEyebrow, SectionTitle, SectionLede } from "@/components/ui/section";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "For creators",
  description:
    "The fastest way to caption short-form video. Made for creators who post every day and can't afford to spend 30 minutes on a 30-second clip.",
};

const PERSONAS = [
  {
    id: "tiktokers",
    icon: TrendingUp,
    title: "TikTokers & Reels creators",
    body: "Caption a stack of clips between meetings. Preset, post, on with your life.",
  },
  {
    id: "podcasts",
    icon: Heart,
    title: "Podcasters",
    body: "Drop the highlight clip. Captions for every word. Burn in, schedule on Reels.",
  },
  {
    id: "educators",
    icon: Zap,
    title: "Educators",
    body: "Frame-perfect timing for technical content. Highlight the term, not the filler.",
  },
  {
    id: "agencies",
    icon: Clock,
    title: "Agencies running multiple accounts",
    body: "Switch caption presets per brand. Export at scale. Keep your night.",
  },
];

export default function ForCreatorsPage() {
  return (
    <>
      <SiteNav />
      <main>
        <section className="relative pt-40 pb-16 overflow-hidden">
          <div className="absolute inset-0 blueprint blueprint-fade" />
          <Container className="relative">
            <Badge variant="brand">For creators</Badge>
            <h1 className="display mt-5 text-5xl sm:text-7xl  max-w-3xl">
              Post the reel.
              <br />
              <span className="text-[var(--color-brand)]">Skip the caption grind.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-[var(--color-fg-muted)] leading-relaxed">
              You didn't get into this to retype subtitles for the seventh time. Capto reads your
              audio at the millisecond, lays it on a real timeline, and lets you ship in 90 seconds.
            </p>
            <div className="mt-9 flex flex-col sm:flex-row gap-3">
              <Button href="/signup" size="lg">
                Start free
                <ArrowRight className="size-4" />
              </Button>
              <Button href="/pricing" variant="outline" size="lg">
                See pricing
              </Button>
            </div>
          </Container>
        </section>

        <CaptionStyleStudio />

        <Section id="personas" className="border-t border-[var(--color-border)]">
          <Container>
            <SectionEyebrow>Who Capto is for</SectionEyebrow>
            <SectionTitle>You probably already know if it's you.</SectionTitle>
            <div className="mt-14 grid gap-5 sm:grid-cols-2">
              {PERSONAS.map((p) => (
                <div
                  id={p.id}
                  key={p.id}
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
