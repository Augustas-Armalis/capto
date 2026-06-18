import type { Metadata } from "next";
import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { PricingTable } from "@/components/marketing/pricing-table";
import { Comparison } from "@/components/marketing/comparison";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { DEFAULT_FAQS } from "@/lib/faqs";
import { CtaBanner } from "@/components/marketing/cta-banner";

export const metadata: Metadata = {
  title: "Pricing, One honest plan",
  description:
    "Capto Pro is €6.99/month. Free plan available with your own Groq API key. Cancel any time.",
};

export default function PricingPage() {
  return (
    <>
      <SiteNav />
      <main className="pt-32">
        <PricingTable />
        <Comparison />
        <FaqAccordion faqs={DEFAULT_FAQS.slice(0, 6)} />
        <CtaBanner />
      </main>
      <SiteFooter />
    </>
  );
}
