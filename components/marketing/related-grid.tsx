import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";

export function RelatedGrid({
  title,
  items,
}: {
  title: string;
  items: { href: string; label: string; sub?: string }[];
}) {
  if (!items.length) return null;
  return (
    <Section className="border-t border-[var(--color-border)] py-16">
      <Container>
        <h2 className="eyebrow">{title}</h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              className="group flex items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-5 py-4 transition-colors hover:border-[var(--color-border-strong)]"
            >
              <span>
                <span className="block text-sm font-medium text-[var(--color-fg)]">{it.label}</span>
                {it.sub && <span className="mt-0.5 block text-xs text-[var(--color-fg-subtle)]">{it.sub}</span>}
              </span>
              <ArrowUpRight className="size-4 shrink-0 text-[var(--color-fg-subtle)] transition-all group-hover:text-[var(--color-brand)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          ))}
        </div>
      </Container>
    </Section>
  );
}
