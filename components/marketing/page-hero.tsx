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
    <section className="relative overflow-hidden border-b border-[var(--color-border)] pb-16 pt-32 sm:pt-40">
      <Aurora preset="hero" />
      <Container className="relative">
        {crumbs && (
          <nav className="fade-up mb-5 flex items-center gap-1.5 text-xs text-[var(--color-fg-subtle)]">
            {crumbs.map((c, i) => (
              <React.Fragment key={c.href}>
                {i > 0 && <ChevronRight className="size-3" />}
                <Link href={c.href} className="hover:text-[var(--color-fg-muted)]">{c.name}</Link>
              </React.Fragment>
            ))}
          </nav>
        )}
        <p className="eyebrow fade-up">{eyebrow}</p>
        <h1 className="display fade-up mt-4 max-w-3xl text-balance text-4xl text-sheen sm:text-6xl" style={{ animationDelay: "70ms" }}>
          {title}
        </h1>
        {lede && (
          <p className="fade-up mt-5 max-w-xl text-base leading-relaxed text-[var(--color-fg-muted)]" style={{ animationDelay: "140ms" }}>
            {lede}
          </p>
        )}
        {children}
      </Container>
    </section>
  );
}
