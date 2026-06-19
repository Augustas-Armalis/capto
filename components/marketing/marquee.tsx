import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Seam-free infinite marquee. Renders two identical groups and translates the
 * track by exactly -50%, so the loop has no jump. Each group carries a trailing
 * gap equal to its internal gap, and `repeat` widens one group past the viewport
 * so there's never an empty stretch on large screens. Pure CSS (no JS / rAF).
 */
export function Marquee({
  items,
  durationSec = 40,
  gapPx = 56,
  repeat = 2,
  pauseOnHover = false,
  className,
  maskClass = "[mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]",
}: {
  items: React.ReactNode[];
  durationSec?: number;
  gapPx?: number;
  repeat?: number;
  pauseOnHover?: boolean;
  className?: string;
  maskClass?: string;
}) {
  const oneGroup = Array.from({ length: repeat }).flatMap(() => items);
  const Group = ({ hidden }: { hidden?: boolean }) => (
    <div
      aria-hidden={hidden}
      className="flex shrink-0 items-stretch"
      style={{ gap: `${gapPx}px`, paddingInlineEnd: `${gapPx}px` }}
    >
      {oneGroup.map((node, i) => (
        <React.Fragment key={i}>{node}</React.Fragment>
      ))}
    </div>
  );
  return (
    <div className={cn("overflow-hidden", pauseOnHover && "marquee-paused", maskClass, className)}>
      <div className="marquee-track flex w-max" style={{ animationDuration: `${durationSec}s` }}>
        <Group />
        <Group hidden />
      </div>
    </div>
  );
}
