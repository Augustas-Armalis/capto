import { cn } from "@/lib/utils";
import { DitherStatic } from "@/components/visual/dither-static";

/**
 * Page-hero / panel backdrop: a still ordered-dither glow in the brand violet.
 * `hero`: a band at the top fading down. `cta`: glow rising from the bottom of a box.
 * (Name kept from the old mesh-gradient version so every page picks this up.)
 */
export function Aurora({ preset = "hero", className }: { preset?: "hero" | "cta"; className?: string }) {
  const cta = preset === "cta";
  return (
    <div
      aria-hidden
      className={cn("aurora-wrap", cta ? "inset-0 fade-up-mask" : "fade-down inset-x-0 top-0 h-[520px]", className)}
    >
      <DitherStatic preset={cta ? "bottom" : "top"} pixel={3} intensity={cta ? 0.85 : 0.7} />
    </div>
  );
}
