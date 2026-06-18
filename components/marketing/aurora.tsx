import { cn } from "@/lib/utils";

/**
 * Smooth mesh gradient that drifts gently and fades into the page.
 * `hero`: a band at the top fading down. `cta`: glow rising from the bottom of a box.
 */
export function Aurora({ preset = "hero", className }: { preset?: "hero" | "cta"; className?: string }) {
  const cta = preset === "cta";
  return (
    <div
      aria-hidden
      className={cn("aurora-wrap", cta ? "inset-0" : "aurora-fade-down inset-x-0 top-0 h-[560px]", className)}
    >
      <div className={cn("mesh", cta ? "mesh-cta" : "mesh-hero")} />
    </div>
  );
}
