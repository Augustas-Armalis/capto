import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/ui/money";
import { Container } from "@/components/ui/container";
import { Aurora } from "./aurora";

export function CtaBanner() {
  return (
    <section className="relative py-24 sm:py-32">
      <Container>
        <div className="relative overflow-hidden rounded-[var(--radius-2xl)] border border-white/[0.08] bg-[var(--color-bg-elev)] px-6 py-20 sm:py-28">
          <Aurora preset="cta" />
          <div className="relative mx-auto max-w-xl text-center">
            <h3 className="display text-4xl text-white sm:text-5xl">
              90 seconds. No watermark. Your audio untouched.
            </h3>
            <p className="mt-5 text-lg text-[var(--color-fg-muted)]">
              Stop losing Sundays to CapCut. Stop paying €20/mo for credits.
            </p>
            <p className="mt-2 text-sm text-[var(--color-fg-subtle)]">
              Free to start. <Money eur="6.99" usd="7.99" /> when you want more.
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
        </div>
      </Container>
    </section>
  );
}
