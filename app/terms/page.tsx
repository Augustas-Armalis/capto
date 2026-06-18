import type { Metadata } from "next";
import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { Container } from "@/components/ui/container";

export const metadata: Metadata = {
  title: "Terms",
  description: "Terms of service for Capto.",
};

export default function TermsPage() {
  return (
    <>
      <SiteNav />
      <main className="pt-32 pb-20">
        <Container size="narrow">
          <h1 className="display text-5xl ">Terms of service</h1>
          <p className="mt-4 text-sm text-[var(--color-fg-subtle)]">Last updated: June 2026</p>

          <div className="mt-10 space-y-7 text-[15px] leading-relaxed text-[var(--color-fg-muted)]">
            <section>
              <h2 className="text-xl font-semibold text-[var(--color-fg)]">The short version</h2>
              <p className="mt-2">
                You sign up, you use Capto. Don't upload illegal content, don't try to break
                things, don't share your account. We'll keep the service running, fix what
                breaks, and credit you back if something major goes wrong on our end.
              </p>
            </section>
            <section>
              <h2 className="text-xl font-semibold text-[var(--color-fg)]">Your content</h2>
              <p className="mt-2">
                You keep ownership of every video you upload and every export you make. You grant
                us only the temporary right to process them so we can do what you asked.
              </p>
            </section>
            <section>
              <h2 className="text-xl font-semibold text-[var(--color-fg)]">Payment</h2>
              <p className="mt-2">
                Subscriptions renew monthly until cancelled. Cancel any time from billing, your
                plan remains active until the end of the current period. No refunds for partial
                months.
              </p>
            </section>
            <section>
              <h2 className="text-xl font-semibold text-[var(--color-fg)]">Limits & abuse</h2>
              <p className="mt-2">
                We may rate-limit or suspend accounts that we reasonably believe are abusing the
                service (scraping, automated mass-export, reselling Capto's capacity, etc.).
                We'll always email first when we can.
              </p>
            </section>
            <section>
              <h2 className="text-xl font-semibold text-[var(--color-fg)]">Liability</h2>
              <p className="mt-2">
                Capto is provided "as is". We're not liable for indirect or consequential damages.
                Our total liability is capped at the amount you paid us in the last 12 months.
              </p>
            </section>
            <section>
              <h2 className="text-xl font-semibold text-[var(--color-fg)]">Operator</h2>
              <p className="mt-2">
                Capto is operated by{" "}
                <a
                  href="https://contles.com?ref=subby-terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--color-brand)] underline-offset-2 hover:underline"
                >
                  Contles
                </a>
                . Disputes go to the courts where Contles is registered.
              </p>
            </section>
          </div>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
