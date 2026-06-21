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

  // "Box" styles fill a coloured background behind the active word (Hormozi,
  // Karaoke, Pop…). Only those need padding + a reserved box so toggling the
  // highlight doesn't reflow the line; colour / glow / underline styles
  // (Editorial, Neon, Clean Sans…) must stay TIGHT with no extra padding.
  const isBox = /\bbg-/.test(highlightClass);
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-center gap-y-2 text-center",
        isBox ? "gap-x-2" : "gap-x-[0.3em]",
        className,
      )}
    >
      {words.map((w, i) => (
        <span
          key={i}
          className={cn(
            // Transition only paint props — never layout — so nothing jumps.
            // NB: no background-color here, so the highlight box snaps on/off
            // instead of two boxes cross-fading (a crisp karaoke sweep).
            "transition-[color,text-shadow,opacity] duration-200 ease-[var(--ease-out)]",
            // Reserve the box geometry on every word, but ONLY for box styles.
            isBox && "rounded px-1.5",
            wordClass,
            i === active ? highlightClass : "opacity-45",
          )}
        >
          {w}
        </span>
      ))}
    </div>
  );
}
