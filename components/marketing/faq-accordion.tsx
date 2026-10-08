"use client";

import * as React from "react";
import { Container } from "@/components/ui/container";
import { Band, SectionEyebrow, SectionTitle } from "@/components/ui/section";
import { cn } from "@/lib/utils";
import { DEFAULT_FAQS, type QA } from "@/lib/faqs";

export { DEFAULT_FAQS };

function PlusMinus({ open }: { open: boolean }) {
  return (
    <span className="relative ml-4 inline-flex size-4 shrink-0 items-center justify-center">
      <span className="absolute h-[1.5px] w-full rounded bg-current" />
      <span
        className={cn(
          "absolute h-full w-[1.5px] rounded bg-current transition-transform duration-300",
          open ? "scale-y-0" : "scale-y-100",
        )}
      />
    </span>
  );
}

function Item({ qa, open, onToggle, id }: { qa: QA; open: boolean; onToggle: () => void; id: string }) {
  return (
    <div className="border-b border-[var(--color-border)]">
      <button
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        id={`${id}-btn`}
        className="flex w-full items-center justify-between gap-4 py-5 text-left text-[var(--color-fg-muted)] transition-colors hover:text-white"
      >
        <span className="text-[15px] text-white">{qa.q}</span>
        <span aria-hidden>
          <PlusMinus open={open} />
        </span>
      </button>
      <div
        id={`${id}-panel`}
        role="region"
        aria-labelledby={`${id}-btn`}
        className={cn("grid overflow-hidden transition-all duration-300", open ? "grid-rows-[1fr] pb-5" : "grid-rows-[0fr]")}
      >
        <div className="min-h-0 text-[15px] leading-relaxed text-[var(--color-fg-muted)]">{qa.a}</div>
      </div>
    </div>
  );
}

export function FaqAccordion({ faqs = DEFAULT_FAQS, withChrome = true }: { faqs?: QA[]; withChrome?: boolean }) {
  const [open, setOpen] = React.useState<number | null>(0);

  const body = (
    <div data-reveal-stagger className={withChrome ? "border-t border-[var(--color-border)]" : "mx-auto max-w-2xl"}>
      {faqs.map((qa, i) => (
        <Item key={qa.q} id={`faq-${i}`} qa={qa} open={open === i} onToggle={() => setOpen(open === i ? null : i)} />
      ))}
    </div>
  );

  if (!withChrome) return body;

  return (
    <Band id="faq" className="py-24 sm:py-32">
      <Container>
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <SectionEyebrow>Questions</SectionEyebrow>
            <SectionTitle>The stuff you actually want to know.</SectionTitle>
            <p className="mt-5 text-[15px] text-[var(--color-fg-muted)]">
              Something else?{" "}
              <a href="/contact" className="text-white underline decoration-white/25 underline-offset-4 hover:decoration-white">
                Ask us directly
              </a>
              .
            </p>
          </div>
          {body}
        </div>
      </Container>
    </Band>
  );
}
