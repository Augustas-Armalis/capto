import type { Metadata } from "next";
import { SiteNav } from "@/components/marketing/site-nav";
import { Aurora } from "@/components/marketing/aurora";
import { SiteFooter } from "@/components/marketing/site-footer";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { CtaBanner } from "@/components/marketing/cta-banner";

export const metadata: Metadata = {
  alternates: { canonical: "/faq" },
  title: "FAQ",
  description: "Frequently asked questions about Capto.",
};

export default function FaqPage() {
  return (
    <>
      <SiteNav />
      <main className="relative pt-32">
      <Aurora preset="hero" className="-z-10" />
        <FaqAccordion />
        <CtaBanner />
      </main>
      <SiteFooter />
    </>
  );
}
