import { Check, X } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Money } from "@/components/ui/money";
import { Section, SectionEyebrow, SectionTitle } from "@/components/ui/section";

type Cell = boolean | string;
type Row = { feature: string; capto: Cell; submagic: Cell; captions: Cell; veed: Cell };

const ROWS: Row[] = [
  { feature: "Entry paid price", capto: "__capto_price__", submagic: "$19", captions: "$24.99", veed: "$24" },
  { feature: "Lossless / original-quality export", capto: true, submagic: false, captions: false, veed: false },
  { feature: "No watermark on paid", capto: true, submagic: true, captions: true, veed: false },
  { feature: "AI clipping included", capto: true, submagic: "+$19/mo", captions: true, veed: false },
  { feature: "Flat team pricing", capto: true, submagic: false, captions: false, veed: false },
  { feature: "Real word-level timeline", capto: true, submagic: false, captions: "Partial", veed: true },
  { feature: "Bring your own API key", capto: true, submagic: false, captions: false, veed: false },
  { feature: "Minutes, not credits", capto: true, submagic: true, captions: false, veed: true },
];

function CellView({ value, hero = false }: { value: Cell; hero?: boolean }) {
  if (value === "__capto_price__")
    return <span className="mono text-sm font-medium text-white tnum"><Money eur="6.99" usd="7.99" /></span>;
  if (value === true)
    return (
      <span
        className={
          hero
            ? "inline-flex size-6 items-center justify-center rounded-full bg-magic text-white"
            : "inline-flex size-6 items-center justify-center rounded-full bg-white/10 text-white"
        }
      >
        <Check className="size-3.5" strokeWidth={2.5} />
      </span>
    );
  if (value === false)
    return <span className="inline-flex size-6 items-center justify-center text-[var(--color-fg-subtle)]"><X className="size-3.5" /></span>;
  return <span className={hero ? "mono text-sm font-medium text-white tnum" : "mono text-sm text-[var(--color-fg-muted)] tnum"}>{value}</span>;
}

export function Comparison() {
  return (
    <Section>
      <Container>
        <div className="max-w-xl">
          <SectionEyebrow>The honest math</SectionEyebrow>
          <SectionTitle>What the others charge for the same thing.</SectionTitle>
        </div>

        <div className="relative mt-12 overflow-hidden rounded-[var(--radius-2xl)] border border-white/[0.07]">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/[0.07]">
                  <th className="px-6 py-4 text-left eyebrow">Feature</th>
                  <th className="relative px-6 py-4 text-center">
                    <span className="text-magic font-semibold">Capto</span>
                  </th>
                  <th className="px-6 py-4 text-center font-medium text-[var(--color-fg-muted)]">Submagic</th>
                  <th className="px-6 py-4 text-center font-medium text-[var(--color-fg-muted)]">Captions</th>
                  <th className="px-6 py-4 text-center font-medium text-[var(--color-fg-muted)]">VEED</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => (
                  <tr key={row.feature} className="border-b border-white/[0.06] last:border-0">
                    <td className="px-6 py-3.5 font-medium text-white">{row.feature}</td>
                    <td className="bg-[var(--color-brand-soft)] px-6 py-3.5 text-center"><CellView value={row.capto} hero /></td>
                    <td className="px-6 py-3.5 text-center"><CellView value={row.submagic} /></td>
                    <td className="px-6 py-3.5 text-center"><CellView value={row.captions} /></td>
                    <td className="px-6 py-3.5 text-center"><CellView value={row.veed} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* gradient edge highlighting the Capto column on wide screens */}
          <div className="pointer-events-none absolute inset-y-0 left-[calc(33%)] hidden w-px bg-gradient-to-b from-transparent via-[var(--color-violet)]/40 to-transparent lg:block" />
        </div>
      </Container>
    </Section>
  );
}
