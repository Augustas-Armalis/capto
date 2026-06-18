import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "brand" | "outline" | "soft" | "success" | "danger";

const styles: Record<BadgeVariant, string> = {
  brand: "bg-[var(--color-brand-soft)] text-white border-[var(--color-brand)]/30",
  outline: "bg-transparent text-[var(--color-fg-muted)] border-white/10",
  soft: "bg-white/[0.04] text-[var(--color-fg)] border-white/10",
  success: "bg-[var(--color-success)]/12 text-[var(--color-success)] border-[var(--color-success)]/25",
  danger: "bg-[var(--color-danger)]/12 text-[var(--color-danger)] border-[var(--color-danger)]/25",
};

export function Badge({
  variant = "outline",
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] border px-2.5 py-0.5 text-[11px] font-medium tracking-tight",
        styles[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
