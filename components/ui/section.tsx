import * as React from "react";
import { cn } from "@/lib/utils";

export function Section({ className, children, id, ...rest }: React.HTMLAttributes<HTMLElement>) {
  return (
    <section id={id} className={cn("relative py-24 sm:py-32", className)} {...rest}>
      {children}
    </section>
  );
}

export function SectionEyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("eyebrow inline-flex items-center gap-2", className)}>
      <span className="size-1 rounded-full bg-white/60" />
      {children}
    </div>
  );
}

export function SectionTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h2 className={cn("display mt-4 text-balance text-4xl text-white sm:text-5xl", className)}>{children}</h2>;
}

export function SectionLede({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("mt-4 max-w-xl text-base leading-relaxed text-[var(--color-fg-muted)]", className)}>{children}</p>;
}
