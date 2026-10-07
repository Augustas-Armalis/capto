import * as React from "react";
import { cn } from "@/lib/utils";

export function Section({ className, children, id, ...rest }: React.HTMLAttributes<HTMLElement>) {
  return (
    <section id={id} className={cn("relative py-24 sm:py-32", className)} {...rest}>
      {children}
    </section>
  );
}

/** Mono label. With `index`, renders Linear-style "01 / Label". */
export function SectionEyebrow({
  children,
  className,
  index,
}: {
  children: React.ReactNode;
  className?: string;
  index?: string;
}) {
  return (
    <div data-reveal className={cn("eyebrow inline-flex items-center gap-2.5", className)}>
      {index ? (
        <>
          <span className="tnum text-[var(--color-brand)]">{index}</span>
          <span className="h-px w-5 bg-[var(--color-border-strong)]" />
        </>
      ) : (
        <span className="size-1 bg-[var(--color-brand)]" />
      )}
      {children}
    </div>
  );
}

export function SectionTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h2
      data-reveal
      style={{ "--d": 1 } as React.CSSProperties}
      className={cn("display mt-5 text-balance text-[2.25rem] text-white sm:text-5xl", className)}
    >
      {children}
    </h2>
  );
}

/** Second clause of a two-tone headline: "Bright claim. <Muted>quieter follow-up.</Muted>" */
export function Muted({ children }: { children: React.ReactNode }) {
  return <span className="text-[var(--color-fg-muted)]">{children}</span>;
}

export function SectionLede({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p
      data-reveal
      style={{ "--d": 2 } as React.CSSProperties}
      className={cn("mt-5 max-w-xl text-[15px] leading-relaxed text-[var(--color-fg-muted)] sm:text-base", className)}
    >
      {children}
    </p>
  );
}

/**
 * Standard landing section head: eyebrow + headline on the left, optional
 * lede pushed to the right column on wide screens (Linear-style split).
 */
export function SectionHead({
  index,
  label,
  title,
  lede,
  className,
}: {
  index?: string;
  label: string;
  title: React.ReactNode;
  lede?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-6 lg:grid-cols-[1.35fr_1fr] lg:items-end lg:gap-16", className)}>
      <div>
        <SectionEyebrow index={index}>{label}</SectionEyebrow>
        <SectionTitle className="max-w-2xl">{title}</SectionTitle>
      </div>
      {lede ? (
        <div
          data-reveal
          style={{ "--d": 2 } as React.CSSProperties}
          className="max-w-md text-[15px] leading-relaxed text-[var(--color-fg-muted)] lg:pb-2"
        >
          {lede}
        </div>
      ) : null}
    </div>
  );
}

const RAIL = "max(20px, calc(50% - 36rem))";

/**
 * Full-bleed landing band: a hairline across the page with "+" marks where it
 * meets the page rails (see `.rails` in globals.css).
 */
export function Band({
  children,
  className,
  id,
  divider = true,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
  divider?: boolean;
}) {
  return (
    <section id={id} className={cn("relative", divider && "hairline-top", className)}>
      {divider && (
        <>
          <span aria-hidden className="cross hidden sm:block" style={{ top: -5, left: `calc(${RAIL} - 4px)` }} />
          <span aria-hidden className="cross hidden sm:block" style={{ top: -5, right: `calc(${RAIL} - 4px)` }} />
        </>
      )}
      {children}
    </section>
  );
}
