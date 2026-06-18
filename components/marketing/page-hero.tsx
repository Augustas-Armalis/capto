import * as React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Container } from "@/components/ui/container";

export function PageHero({
  eyebrow,
  title,
  lede,
  crumbs,
  children,
}: {
  eyebrow: string;
  title: string;
  lede?: string;
  crumbs?: { name: string; href: string }[];
  children?: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden border-b border-white/[0.06] pt-32 pb-14">
      <div className="hero-veil left-1/2 top-0 h-[300px] w-[680px] -translate-x-1/2" />
      <Container className="relative">
        {crumbs && (
          <nav className="mb-5 flex items-center gap-1.5 text-xs text-[var(--color-fg-subtle)]">
            {crumbs.map((c, i) => (
              <React.Fragment key={c.href}>
                {i > 0 && <ChevronRight className="size-3" />}
                <Link href={c.href} className="hover:text-[var(--color-fg-muted)]">{c.name}</Link>
              </React.Fragment>
            ))}
          </nav>
        )}
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="display mt-4 max-w-3xl text-4xl text-white sm:text-5xl">{title}</h1>
        {lede && <p className="mt-5 max-w-xl text-base leading-relaxed text-[var(--color-fg-muted)]">{lede}</p>}
        {children}
      </Container>
    </section>
  );
}
