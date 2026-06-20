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

  const rootRef = React.useRef<HTMLDivElement | null>(null);
  // On hover we pause the scroll AND freeze every video inside (so a clip the
  // user is looking at holds its frame instead of looping past it). On leave,
  // each VideoReel's own visibility observer resumes the on-screen ones.
  const setVideos = (play: boolean) => {
    const root = rootRef.current;
    if (!root) return;
    root.querySelectorAll("video").forEach((v) => {
      if (play) {
        const p = v.play();
        if (p && typeof p.catch === "function") p.catch(() => {});
      } else {
        v.pause();
      }
    });
  };

  return (
    <div
      ref={rootRef}
      className={cn("overflow-hidden", maskClass, className)}
      onPointerEnter={pauseOnHover ? () => { setPaused(true); setVideos(false); } : undefined}
      onPointerLeave={pauseOnHover ? () => { setPaused(false); setVideos(true); } : undefined}
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
