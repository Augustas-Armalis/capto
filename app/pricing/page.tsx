import type { Metadata } from "next";
import { SiteNav } from "@/components/marketing/site-nav";
import { Aurora } from "@/components/marketing/aurora";
import { SiteFooter } from "@/components/marketing/site-footer";
import { PricingTable } from "@/components/marketing/pricing-table";
import { Comparison } from "@/components/marketing/comparison";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { DEFAULT_FAQS } from "@/lib/faqs";
import { CtaBanner } from "@/components/marketing/cta-banner";

export const metadata: Metadata = {
  alternates: { canonical: "/pricing" },
  title: "Pricing, One honest plan",
  description:
    "Capto Pro is €6.99/month. Free plan available with your own Groq API key. Cancel any time.",
};

export default function PricingPage() {
  return (
    <>
      <SiteNav />
      <main className="relative pt-32">
      <Aurora preset="hero" className="-z-10" />
        <PricingTable />
        <Comparison />
        <FaqAccordion faqs={DEFAULT_FAQS.slice(0, 6)} />
        <CtaBanner />
      </main>
      <SiteFooter />
    </>
  );
}
