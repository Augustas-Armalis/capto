"use client";

import * as React from "react";
import { Container } from "@/components/ui/container";
import { SectionEyebrow, SectionTitle } from "@/components/ui/section";
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

function Item({ qa, open, onToggle }: { qa: QA; open: boolean; onToggle: () => void }) {
  return (
    <div className="border-b border-white/[0.07]">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 py-5 text-left text-[var(--color-fg-muted)] transition-colors hover:text-white"
      >
        <span className="text-[15px] font-medium text-white">{qa.q}</span>
        <PlusMinus open={open} />
      </button>
      <div className={cn("grid overflow-hidden transition-all duration-300", open ? "grid-rows-[1fr] pb-5" : "grid-rows-[0fr]")}>
        <div className="min-h-0 text-[15px] leading-relaxed text-[var(--color-fg-muted)]">{qa.a}</div>
      </div>
    </div>
  );
}

export function FaqAccordion({ faqs = DEFAULT_FAQS, withChrome = true }: { faqs?: QA[]; withChrome?: boolean }) {
  const [open, setOpen] = React.useState<number | null>(0);

  const body = (
    <div className="mx-auto max-w-2xl">
      {faqs.map((qa, i) => (
        <Item key={qa.q} qa={qa} open={open === i} onToggle={() => setOpen(open === i ? null : i)} />
      ))}
    </div>
  );

  if (!withChrome) return body;

  return (
    <section id="faq" className="py-24 sm:py-32">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <div className="flex justify-center">
            <SectionEyebrow>Questions</SectionEyebrow>
          </div>
          <SectionTitle className="mx-auto">The stuff you actually want to know.</SectionTitle>
        </div>
        <div className="mt-12">{body}</div>
      </Container>
    </section>
  );
}
