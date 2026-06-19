import type { Metadata } from "next";
import { Mail, ArrowUpRight } from "lucide-react";
import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { Container } from "@/components/ui/container";

export const metadata: Metadata = {
  alternates: { canonical: "/contact" },
  title: "Contact",
  description: "Reach the team behind Capto at hello@capto.video.",
};

export default function ContactPage() {
  return (
    <>
      <SiteNav />
      <main className="pt-32 pb-24">
        <Container size="narrow">
          <h1 className="display text-5xl text-white">Say hi.</h1>
          <p className="mt-4 text-lg text-[var(--color-fg-muted)]">
            Questions, feedback, partnerships, email us. We read everything and usually reply
            within 24 hours.
          </p>

          <a
            href="mailto:hello@capto.video"
            className="group mt-10 flex items-center gap-5 rounded-[var(--radius-xl)] border border-white/[0.08] bg-white/[0.02] p-7 transition-colors hover:border-white/20"
          >
            <span className="inline-flex size-12 items-center justify-center rounded-[var(--radius-md)] border border-white/10 bg-white/[0.03] text-white">
              <Mail className="size-5" strokeWidth={1.5} />
            </span>
            <span className="flex-1">
              <span className="block text-sm text-[var(--color-fg-muted)]">Email us</span>
              <span className="mt-0.5 block text-lg font-medium text-white">hello@capto.video</span>
            </span>
            <ArrowUpRight className="size-5 text-[var(--color-fg-subtle)] transition-all group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
