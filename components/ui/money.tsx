import { cn } from "@/lib/utils";

/**
 * Renders both currency strings; CSS (driven by <html data-cur>) shows the
 * one matching the visitor's location. Pure markup → works in server
 * components and static pages with no flash, no hydration mismatch.
 */
export function Money({
  eur,
  usd,
  className,
}: {
  eur: string | number;
  usd: string | number;
  className?: string;
}) {
  return (
    <>
      <span className={cn("cur-eur", className)}>€{eur}</span>
      <span className={cn("cur-usd", className)}>${usd}</span>
    </>
  );
}
