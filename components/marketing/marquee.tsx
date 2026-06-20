"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Seam-free infinite marquee. Two identical groups, translate -50%, so the loop
 * never jumps. `repeat` widens one group past the viewport for big screens.
 * Pause is JS-controlled via animation-play-state (only ever pauses/resumes —
 * it can never reset the track to its start, which is what caused the prior
 * "jumps back to the beginning" glitch on hover).
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
  const [paused, setPaused] = React.useState(false);
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

  // Hover pauses only the SCROLL — never the videos (pausing + resuming a
  // <video> reloads it and replays from black, which looked broken on hover).
  return (
    <div
      className={cn("overflow-hidden", maskClass, className)}
      onPointerEnter={pauseOnHover ? () => setPaused(true) : undefined}
      onPointerLeave={pauseOnHover ? () => setPaused(false) : undefined}
    >
      <div
        className="marquee-track flex w-max"
        style={{
          animationDuration: `${durationSec}s`,
          animationPlayState: paused ? "paused" : "running",
        }}
      >
        <Group />
        <Group hidden />
      </div>
    </div>
  );
}
