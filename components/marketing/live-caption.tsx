"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * A live, looping caption preview. Default highlights one word at a time inside
 * the line (karaoke). With `single`, only the active word shows, swapping in
 * place (the simplest, default look).
 */
export function LiveCaption({
  words,
  wordClass,
  highlightClass,
  className,
  interval = 720,
  single = false,
}: {
  words: string[];
  wordClass: string;
  highlightClass: string;
  className?: string;
  interval?: number;
  single?: boolean;
}) {
  const [active, setActive] = React.useState(0);

  React.useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setActive((a) => (a + 1) % words.length), interval);
    return () => clearInterval(id);
  }, [words.length, interval]);

  if (single) {
    return (
      <div className={cn("flex items-center justify-center text-center", className)}>
        <span className={cn("transition-opacity duration-200", wordClass, highlightClass)}>{words[active]}</span>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1.5", className)}>
      {words.map((w, i) => (
        <span
          key={i}
          className={cn(
            // Reserve the highlight box geometry on EVERY word (rounded + px) and
            // only transition colour/opacity — never layout props. Animating
            // `all` previously grew the active word's padding mid-tween, shoving
            // neighbours onto a second line and back (the karaoke "glitch").
            "rounded px-1.5 transition-[color,background-color,opacity] duration-300 ease-[var(--ease-out)]",
            wordClass,
            i === active ? highlightClass : "opacity-60",
          )}
        >
          {w}
        </span>
      ))}
    </div>
  );
}
