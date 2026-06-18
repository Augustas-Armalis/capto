"use client";

import * as React from "react";
import { LiveCaption } from "@/components/marketing/live-caption";
import { STYLES } from "@/lib/styles";

const ORDER = ["inter-bold", "hormozi", "karaoke", "beasty", "neon", "pop", "editorial"];
const SHOW = ORDER.map((slug) => STYLES.find((s) => s.slug === slug)).filter(Boolean) as typeof STYLES;

/** Auth visual: a phone reel that cycles through caption styles, each playing live. */
export function StyleRotator() {
  const [i, setI] = React.useState(0);

  React.useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setI((p) => (p + 1) % SHOW.length), 4200);
    return () => clearInterval(id);
  }, []);

  const s = SHOW[i];
  return (
    <div
      className={`aspect-[9/16] w-full max-w-[280px] overflow-hidden rounded-[var(--radius-2xl)] border border-white/[0.1] bg-gradient-to-b ${s.bg} shadow-[var(--shadow-pop)] transition-[background] duration-700`}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between px-4 pt-4">
          <span className="mono text-[10px] uppercase tracking-wider text-white/60">{s.name}</span>
          <span className="mono text-[10px] text-white/40">live preview</span>
        </div>
        <div className="flex flex-1 items-center justify-center px-8">
          <LiveCaption
            key={s.slug}
            words={s.words}
            wordClass={`${s.wordClass} text-2xl sm:text-3xl`}
            highlightClass={s.highlightClass}
            interval={700}
          />
        </div>
      </div>
    </div>
  );
}
