import { Container } from "@/components/ui/container";
import { Band, Muted, SectionHead } from "@/components/ui/section";

// Rough share of a typical 90-second run, used for the proportional bar.
const STEPS = [
  { n: "01", title: "Drop", body: "Any clip, any format. Up to 4K.", sec: 5 },
  { n: "02", title: "Transcribe", body: "Word level, 50+ languages, auto synced.", sec: 35 },
  { n: "03", title: "Style", body: "Pick a preset. Tweak it. Save it.", sec: 30 },
  { n: "04", title: "Export", body: "1080p or original. No watermark.", sec: 20 },
];
const TOTAL = STEPS.reduce((a, s) => a + s.sec, 0);

export function Workflow() {
  return (
    <Band className="py-24 sm:py-32">
      <Container>
        <SectionHead
          index="05"
          label="How it works"
          title={
            <>
              Under two minutes. <Muted>Every time.</Muted>
            </>
          }
        />

        {/* proportional time bar */}
        <div data-reveal-stagger className="mt-14 flex h-1.5 gap-1" aria-hidden>
          {STEPS.map((s, i) => (
            <div
              key={s.n}
              className={i === 1 ? "rounded-full bg-[var(--color-violet)]" : "rounded-full bg-white/[0.14]"}
              style={{ flex: s.sec }}
            />
          ))}
        </div>
        <div className="mono mt-2 flex justify-between text-[10px] text-[var(--color-fg-subtle)] tnum">
          <span>0s</span>
          <span>{TOTAL}s</span>
        </div>

        <div data-reveal className="hair-grid d-3 mt-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <div key={s.n} className="p-6">
              <div className="flex items-center justify-between">
                <span className="mono text-[11px] text-[var(--color-brand)] tnum">{s.n}</span>
                <span className="mono text-[11px] text-[var(--color-fg-subtle)] tnum">~{s.sec}s</span>
              </div>
              <h3 className="heading mt-5 text-[17px] text-white sm:mt-10">{s.title}</h3>
              <p className="mt-1.5 text-sm text-[var(--color-fg-muted)]">{s.body}</p>
            </div>
          ))}
        </div>
      </Container>
    </Band>
  );
}
