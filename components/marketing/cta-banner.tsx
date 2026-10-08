import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Band } from "@/components/ui/section";
import { DitherShader } from "@/components/visual/dither-shader";

export function CtaBanner() {
  return (
    <Band className="overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[58%] fade-up-mask">
        <DitherShader variant="rise" pixel={4} intensity={1.25} />
      </div>
      <Container className="relative pb-52 pt-24 sm:pb-72 sm:pt-36">
        <h2 data-reveal className="display max-w-[14ch] text-balance text-5xl text-sheen sm:text-7xl">
          Stop losing views to bad captions.
        </h2>
        <div data-reveal className="d-2 mt-8 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-md text-[17px] text-[var(--color-fg-muted)]">
            Try Capto on one clip. See the difference. Yours forever, even if you cancel.
          </p>
          <div className="flex items-center gap-2.5">
            <Button href="/signup" size="lg" variant="primary">
              Start free
              <ArrowRight className="size-4 transition-transform group-hover/btn:translate-x-0.5" />
            </Button>
            <Button href="#pricing" size="lg" variant="secondary">
              See pricing
            </Button>
          </div>
        </div>
      </Container>
    </Band>
  );
}
