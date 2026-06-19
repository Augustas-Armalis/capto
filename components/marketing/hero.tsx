import Image from "next/image";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { EditorMock } from "./editor-mock";
import { Aurora } from "./aurora";
import { CONTLES_URL } from "@/lib/utils";

// Server component + CSS entrance (no framer-motion) so the landing ships less
// JS and hydrates without an animation glitch.
export function Hero() {
  return (
    <section className="relative overflow-hidden pt-28 pb-14 sm:pt-32">
      <Aurora preset="hero" />

      <Container className="relative">
        <div className="fade-up mx-auto max-w-4xl text-center">
          <a
            href={CONTLES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="eyebrow group inline-flex items-center gap-2 rounded-[var(--radius-pill)] border border-white/10 bg-white/[0.04] py-1 pl-2.5 pr-3 backdrop-blur-md transition-colors hover:border-white/20 hover:text-[var(--color-fg-muted)]"
          >
            <Image src="/contles.png" alt="" width={12} height={12} className="shrink-0" />
            Powered by Contles
            <ArrowUpRight className="size-2.5 opacity-50 transition-all group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>

          <h1 className="display mx-auto mt-7 max-w-3xl text-balance text-5xl text-white sm:text-7xl">
            We Only Make <span className="text-magic">Captions.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-lg text-[var(--color-fg-muted)]">
            Drop a clip and get captions timed to the word, ready to post in seconds. Full quality,
            no watermark, no bloated editor.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button href="/signup" size="lg" variant="primary">
              Start free
              <ArrowRight className="size-4 transition-transform group-hover/btn:translate-x-0.5" />
            </Button>
            <Button href="/pricing" size="lg" variant="outline">
              See pricing
            </Button>
          </div>
        </div>

        <div className="fade-up mx-auto mt-12 max-w-4xl" style={{ animationDelay: "120ms" }}>
          <EditorMock />
        </div>
      </Container>
    </section>
  );
}
