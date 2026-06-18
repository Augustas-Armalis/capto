import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Variant = "primary" | "magic" | "secondary" | "ghost" | "outline" | "destructive";
type Size = "sm" | "md" | "lg";

const base =
  "group/btn relative inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] font-medium whitespace-nowrap select-none transition-[background-color,border-color,color,transform,box-shadow,opacity] duration-[var(--dur-fast)] ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)] disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]";

const variants: Record<Variant, string> = {
  primary: "bg-white text-black hover:bg-white/90 hover:shadow-[0_6px_24px_-8px_rgba(255,255,255,0.35)]",
  magic:
    "bg-magic text-white border border-white/15 hover:brightness-110 shadow-[0_8px_30px_-10px_oklch(0.62_0.21_292_/_0.55)] hover:shadow-[0_10px_38px_-8px_oklch(0.62_0.21_292_/_0.7)]",
  secondary: "glass text-[var(--color-fg)] hover:bg-white/[0.07]",
  ghost: "text-[var(--color-fg-muted)] hover:text-white hover:bg-white/[0.05]",
  outline: "border border-white/15 text-[var(--color-fg)] hover:border-white/30 hover:bg-white/[0.04]",
  destructive: "bg-[var(--color-danger)] text-white hover:brightness-110",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3.5 text-[13px]",
  md: "h-9 px-4 text-sm",
  lg: "h-11 px-5 text-[15px]",
};

type ButtonOwnProps = { variant?: Variant; size?: Size; loading?: boolean; className?: string; children?: React.ReactNode };
type AsButton = ButtonOwnProps & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonOwnProps> & { href?: undefined };
type AsLink = ButtonOwnProps & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof ButtonOwnProps> & { href: string };
export type ButtonProps = AsButton | AsLink;

export const Button = React.forwardRef<HTMLElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, className, children, ...rest },
  ref,
) {
  const cls = cn(base, variants[variant], sizes[size], className);

  if ("href" in rest && rest.href) {
    const { href, ...anchor } = rest as AsLink;
    return (
      <Link ref={ref as React.Ref<HTMLAnchorElement>} href={href} className={cls} {...anchor}>
        {children}
      </Link>
    );
  }

  return (
    <button
      ref={ref as React.Ref<HTMLButtonElement>}
      className={cls}
      disabled={loading || (rest as AsButton).disabled}
      {...(rest as AsButton)}
    >
      {loading ? <span className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" /> : null}
      {children}
    </button>
  );
});
