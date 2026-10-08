import { Check, Minus } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Money } from "@/components/ui/money";
import { Band, Muted, SectionHead } from "@/components/ui/section";

type Cell = boolean | string;
type Row = { feature: string; capto: Cell; submagic: Cell; captions: Cell; veed: Cell };

const ROWS: Row[] = [
  { feature: "Entry paid price", capto: "__capto_price__", submagic: "$19", captions: "$24.99", veed: "$24" },
  { feature: "Lossless export", capto: true, submagic: false, captions: false, veed: false },
  { feature: "No watermark", capto: true, submagic: true, captions: true, veed: false },
  { feature: "Minutes, not credits", capto: true, submagic: true, captions: false, veed: true },
  { feature: "Word-level timeline", capto: true, submagic: false, captions: "Partial", veed: false },
  { feature: "Bring your own key", capto: true, submagic: false, captions: false, veed: false },
];

function CellView({ value, hero = false }: { value: Cell; hero?: boolean }) {
  if (value === "__capto_price__")
    return <span className="mono text-sm font-medium text-white tnum"><Money eur="6.99" usd="7.99" /></span>;
  if (value === true)
    return (
      <Check
        className={hero ? "mx-auto size-4 text-[var(--color-brand)]" : "mx-auto size-4 text-[var(--color-fg-muted)]"}
        strokeWidth={2.25}
      />
    );
  if (value === false)
    return <Minus className="mx-auto size-4 text-white/20" />;
  return <span className={hero ? "mono text-sm font-medium text-white tnum" : "mono text-sm text-[var(--color-fg-muted)] tnum"}>{value}</span>;
}

export function Comparison() {
  return (
    <Band className="py-24 sm:py-32">
      <Container>
        <SectionHead
          index="07"
          label="The honest math"
          title={
            <>
              What the others charge extra for. <Muted>Included, at a third of the price.</Muted>
            </>
          }
        />

        <div data-reveal className="d-2 mt-14 overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border)]">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="eyebrow px-6 py-4 text-left font-normal">Feature</th>
                  <th className="relative w-[18%] bg-[var(--color-brand-soft)] px-6 py-4 text-center font-medium text-white">
                    <span className="absolute inset-x-0 top-0 h-px bg-[var(--color-brand)]" />
                    Capto
                  </th>
                  <th className="w-[16%] px-6 py-4 text-center font-normal text-[var(--color-fg-muted)]">Submagic</th>
                  <th className="w-[16%] px-6 py-4 text-center font-normal text-[var(--color-fg-muted)]">Captions</th>
                  <th className="w-[16%] px-6 py-4 text-center font-normal text-[var(--color-fg-muted)]">VEED</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => (
                  <tr key={row.feature} className="border-b border-[var(--color-border)] last:border-0">
                    <td className="px-6 py-3.5 text-[var(--color-fg)]">{row.feature}</td>
                    <td className="bg-[var(--color-brand-soft)] px-6 py-3.5 text-center"><CellView value={row.capto} hero /></td>
                    <td className="px-6 py-3.5 text-center"><CellView value={row.submagic} /></td>
                    <td className="px-6 py-3.5 text-center"><CellView value={row.captions} /></td>
                    <td className="px-6 py-3.5 text-center"><CellView value={row.veed} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Container>
    </Band>
  );
}
