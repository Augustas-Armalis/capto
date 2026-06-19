import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { Hero } from "@/components/marketing/hero";
import { LogoMarquee } from "@/components/marketing/logo-marquee";
import { FeatureGrid } from "@/components/marketing/feature-grid";
import { CaptionStyleStudio } from "@/components/marketing/caption-style-studio";
import { Workflow } from "@/components/marketing/workflow";
import { ValueProof } from "@/components/marketing/value-proof";
import { Comparison } from "@/components/marketing/comparison";
import { Testimonials } from "@/components/marketing/testimonials";
import { MadeWithCapto } from "@/components/marketing/made-with-capto";
import { PricingTable } from "@/components/marketing/pricing-table";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { CtaBanner } from "@/components/marketing/cta-banner";
import { Reveal } from "@/components/marketing/reveal";
import { JsonLd, softwareAppLd, faqLd, organizationLd } from "@/components/seo/json-ld";
import { DEFAULT_FAQS } from "@/lib/faqs";

export default function HomePage() {
  return (
    <>
      <JsonLd data={[organizationLd(), softwareAppLd(), faqLd(DEFAULT_FAQS)]} />
      <SiteNav />
      <main className="relative">
        <Hero />
        <LogoMarquee />
        <Reveal variant="up"><FeatureGrid /></Reveal>
        <Reveal variant="blur"><CaptionStyleStudio /></Reveal>
        <Reveal variant="up"><Workflow /></Reveal>
        <Reveal variant="up"><ValueProof /></Reveal>
        <Reveal variant="up"><Comparison /></Reveal>
        <Testimonials />
        <MadeWithCapto />
        <Reveal variant="up"><PricingTable /></Reveal>
        <Reveal variant="up"><FaqAccordion /></Reveal>
        <CtaBanner />
      </main>
      <SiteFooter />
    </>
  );
}
