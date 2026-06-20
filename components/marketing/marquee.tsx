import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Seam-free infinite marquee. Two identical groups, translate -50%, so the loop
 * never jumps.
 *
 * IMPORTANT: this is 100% CSS-driven — NO React state. Hover-pause uses the
 * `.marquee-paused:hover` rule in globals.css. A previous version paused via
 * React state, which re-rendered the component and remounted every child on
 * hover — that reloaded the <video> reels (black-out / disappear / glitch).
 * Keeping it stateless means children mount exactly once.
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
  const groupStyle: React.CSSProperties = { gap: `${gapPx}px`, paddingInlineEnd: `${gapPx}px` };

  return (
    <div className={cn("overflow-hidden", pauseOnHover && "marquee-paused", maskClass, className)}>
      <div className="marquee-track flex w-max" style={{ animationDuration: `${durationSec}s` }}>
        <div className="flex shrink-0 items-stretch" style={groupStyle}>
          {oneGroup.map((node, i) => (
            <React.Fragment key={`a${i}`}>{node}</React.Fragment>
          ))}
        </div>
        <div className="flex shrink-0 items-stretch" style={groupStyle} aria-hidden>
          {oneGroup.map((node, i) => (
            <React.Fragment key={`b${i}`}>{node}</React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
