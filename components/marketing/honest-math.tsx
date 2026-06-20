import { Check, X } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Section, SectionEyebrow, SectionTitle } from "@/components/ui/section";
import { cn } from "@/lib/utils";

type Cell = boolean | string;
const COLS = ["Capto", "Submagic", "Captions", "VEED"];
const ROWS: { label: string; cells: Cell[] }[] = [
  { label: "Entry paid price", cells: ["€6.99", "$19", "$24.99", "$24"] },
  { label: "Lossless export", cells: [true, false, false, false] },
  { label: "No watermark", cells: [true, true, true, false] },
  { label: "Minutes, not credits", cells: [true, true, false, true] },
  { label: "Word-level timeline", cells: [true, false, "Partial", false] },
  { label: "Bring your own key", cells: [true, false, false, false] },
];

function Mark({ v, capto }: { v: Cell; capto: boolean }) {
  if (typeof v === "string")
    return <span className={cn("text-sm", capto ? "font-semibold text-white" : "text-[var(--color-fg-muted)]")}>{v}</span>;
  return v ? (
    <Check className={cn("mx-auto size-4", capto ? "text-[var(--color-brand)]" : "text-[var(--color-fg)]")} />
  ) : (
    <X className="mx-auto size-4 text-[var(--color-fg-subtle)]" />
  );
}

export function HonestMath() {
  return (
    <Section className="py-20 sm:py-28">
      <Container>
        <div className="text-center">
          <SectionEyebrow>The honest math</SectionEyebrow>
          <SectionTitle>What the others charge extra for.</SectionTitle>
        </div>

        <div className="mt-12 overflow-x-auto rounded-[var(--radius-2xl)] border border-white/[0.08] bg-white/[0.02]">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr className="border-b border-white/[0.08]">
                <th className="px-6 py-4 text-left text-sm font-medium text-[var(--color-fg-subtle)]" />
                {COLS.map((c, i) => (
                  <th
                    key={c}
                    className={cn(
                      "px-4 py-4 text-center text-sm font-semibold",
                      i === 0 ? "text-[var(--color-brand)]" : "text-[var(--color-fg-muted)]",
                    )}
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.label} className="border-b border-white/[0.05] last:border-0">
                  <td className="px-6 py-3.5 text-left text-sm text-[var(--color-fg-muted)]">{r.label}</td>
                  {r.cells.map((cell, i) => (
                    <td key={i} className={cn("px-4 py-3.5 text-center", i === 0 && "bg-[var(--color-brand)]/[0.06]")}>
                      <Mark v={cell} capto={i === 0} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Container>
    </Section>
  );
}
