import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { DitherShader } from "@/components/visual/dither-shader";
import { EditorMock } from "./editor-mock";

// Server component + CSS entrance; the only client islands are the dither
// canvas and the editor mock.
export function Hero() {
  return (
    <section className="relative overflow-hidden pt-32 sm:pt-44">
      <Container className="relative">
        <Link
          href="/signup"
          className="fade-up group inline-flex items-center gap-2 rounded-[var(--radius-pill)] border border-white/[0.08] bg-white/[0.03] py-1 pl-1 pr-3 text-[12px] text-[var(--color-fg-muted)] transition-colors hover:border-white/15 hover:text-white"
        >
          <span className="rounded-[var(--radius-pill)] bg-[var(--color-violet)] px-2 py-0.5 text-[11px] font-medium text-white">New</span>
          Rebuilt timing engine, synced to speech
          <ArrowRight className="size-3 opacity-50 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
        </Link>

        <h1
          className="display fade-up mt-7 max-w-[13ch] text-balance text-[2.9rem] text-sheen sm:text-7xl lg:text-[5.25rem]"
          style={{ animationDelay: "60ms" }}
        >
          Your captions are losing you views.
        </h1>

        <div
          className="fade-up mt-8 flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between"
          style={{ animationDelay: "120ms" }}
        >
          <p className="max-w-[34rem] text-[17px] leading-relaxed text-[var(--color-fg-muted)] sm:text-lg">
            Capto fixes the one thing on your video that decides whether it gets watched.{" "}
            <span className="text-[var(--color-fg)]">Word-level timing, lossless export, no watermark.</span>
          </p>
          <div className="flex flex-col gap-3 sm:items-end">
            <div className="flex items-center gap-2.5">
              <Button href="/signup" size="lg" variant="primary">
                Start free
                <ArrowRight className="size-4 transition-transform group-hover/btn:translate-x-0.5" />
              </Button>
              <Button href="#pricing" size="lg" variant="secondary">
                See pricing
              </Button>
            </div>
            <p className="mono text-[11px] text-[var(--color-fg-subtle)]">90 sec per clip · No watermark · From €6.99</p>
          </div>
        </div>
      </Container>

      <div className="relative mt-16 sm:mt-24">
        {/* the dither horizon rises behind the product shot */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-[160px] h-[720px] fade-y">
          <DitherShader variant="horizon" pixel={3} />
        </div>
        <Container size="wide" className="relative">
          <div
            className="fade-up mx-auto max-w-[1120px] [mask-image:linear-gradient(180deg,#000_82%,transparent)]"
            style={{ animationDelay: "200ms" }}
          >
            <EditorMock />
          </div>
        </Container>
      </div>
    </section>
  );
}
