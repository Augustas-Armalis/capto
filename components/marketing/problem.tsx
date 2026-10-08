import { Check, X } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Band, Muted, SectionHead } from "@/components/ui/section";
import { DitherStatic } from "@/components/visual/dither-static";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { key: "A", title: "You skip them.", body: "85% of feeds scroll silent. Your video dies before it loads." },
  { key: "B", title: "You make them in CapCut.", body: "90 minutes per clip. They still look like everyone else's." },
  { key: "C", title: "You pay Submagic €19/mo.", body: "Better, but watermarked free, credit capped, audio re-encoded." },
  { key: "D", title: "Or you use Capto.", body: "90 seconds. No watermark. €6.99.", capto: true },
];

export function Problem() {
  return (
    <Band className="py-24 sm:py-32">
      <Container>
        <SectionHead
          index="01"
          label="The options"
          title={
            <>
              Three ways most creators lose. <Muted>One way they don&rsquo;t.</Muted>
            </>
          }
        />
        <div data-reveal className="hair-grid d-2 mt-14 sm:grid-cols-2 lg:grid-cols-4">
          {OPTIONS.map((o) => (
            <div
              key={o.key}
              className={cn("relative flex flex-col overflow-hidden p-6 sm:min-h-[220px]", o.capto && "!bg-[#0d0c14]")}
            >
              {o.capto && (
                <div aria-hidden className="absolute inset-0 opacity-70 [mask-image:linear-gradient(200deg,#000,transparent_60%)]">
                  <DitherStatic preset="corner" pixel={3} intensity={0.85} />
                </div>
              )}
              <div className="relative flex items-center justify-between">
                <span className="mono text-[11px] text-[var(--color-fg-subtle)]">{o.key}</span>
                {o.capto ? (
                  <span className="inline-flex size-5 items-center justify-center rounded-full bg-[var(--color-violet)] text-white">
                    <Check className="size-3" strokeWidth={3} />
                  </span>
                ) : (
                  <X className="size-4 text-[var(--color-fg-subtle)]" />
                )}
              </div>
              <h3 className={cn("heading relative mt-auto pt-6 text-[17px] sm:pt-10", o.capto ? "text-white" : "text-[var(--color-fg)]")}>
                {o.title}
              </h3>
              <p className="relative mt-2 text-sm leading-relaxed text-[var(--color-fg-muted)]">{o.body}</p>
            </div>
          ))}
        </div>
      </Container>
    </Band>
  );
}
