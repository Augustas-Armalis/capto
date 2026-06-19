import * as React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Aurora } from "./aurora";

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
    <section className="relative overflow-hidden border-b border-white/[0.06] pb-14 pt-32 sm:pt-36">
      <Aurora preset="hero" />
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
