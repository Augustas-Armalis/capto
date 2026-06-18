import type { Metadata } from "next";
import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { Container } from "@/components/ui/container";

export const metadata: Metadata = {
  title: "Privacy",
  description: "How Capto handles your data, short and plain.",
};

export default function PrivacyPage() {
  return (
    <>
      <SiteNav />
      <main className="pt-32 pb-20">
        <Container size="narrow">
          <h1 className="display text-5xl ">Privacy</h1>
          <p className="mt-4 text-sm text-[var(--color-fg-subtle)]">Last updated: June 2026</p>
          <div className="mt-10 space-y-7 text-[15px] leading-relaxed text-[var(--color-fg-muted)]">
            <section>
              <h2 className="text-xl font-semibold text-[var(--color-fg)]">What we store</h2>
              <p className="mt-2">
                When you sign up: your email, a hashed password (we never see the raw password),
                and your name. When you subscribe: a Stripe customer ID. That's it.
              </p>
            </section>
            <section>
              <h2 className="text-xl font-semibold text-[var(--color-fg)]">Your videos</h2>
              <p className="mt-2">
                Uploaded videos are processed in your browser whenever possible. Anything we have
                to touch server-side is deleted within 24 hours of export. We do not keep your
                source files. We do not train models on your videos.
              </p>
            </section>
            <section>
              <h2 className="text-xl font-semibold text-[var(--color-fg)]">Your API keys</h2>
              <p className="mt-2">
                Groq and OpenAI keys you paste in onboarding are encrypted with AES-256-GCM
                before they touch our database. The encryption key lives in our infrastructure
                secrets, not in code, not in logs.
              </p>
            </section>
            <section>
              <h2 className="text-xl font-semibold text-[var(--color-fg)]">Cookies</h2>
              <p className="mt-2">
                We use one cookie: your session. No third-party tracking, no analytics that
                fingerprint you across sites.
              </p>
            </section>
            <section>
              <h2 className="text-xl font-semibold text-[var(--color-fg)]">Deleting your account</h2>
              <p className="mt-2">
                Email{" "}
                <a href="mailto:hello@capto.video" className="text-[var(--color-brand)] underline-offset-2 hover:underline">
                  hello@capto.video
                </a>{" "}
               , your account, sessions, encrypted keys, and project records are removed within
                30 days. Stripe records we retain per their requirements.
              </p>
            </section>
            <section>
              <h2 className="text-xl font-semibold text-[var(--color-fg)]">Who runs Capto</h2>
              <p className="mt-2">
                Capto is operated by{" "}
                <a
                  href="https://contles.com?ref=capto-privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--color-brand)] underline-offset-2 hover:underline"
                >
                  Contles
                </a>
                . Questions: hello@capto.video.
              </p>
            </section>
          </div>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
