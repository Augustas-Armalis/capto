"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// One source of truth: the active cue drives the caption, the playhead, and
// the highlighted sidebar row, so everything stays in sync. Highlight is a
// color change (not a box) so the caption never reflows / jitters.
const CUES = [
  { t: "00:01", text: "We only make captions", key: 1, left: 5, w: 24 },
  { t: "00:03", text: "that's why they're better", key: 3, left: 33, w: 30 },
  { t: "00:05", text: "lossless, word for word", key: 0, left: 67, w: 26 },
];

export function EditorMock() {
  const [active, setActive] = React.useState(0);

  React.useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setActive((a) => (a + 1) % CUES.length), 2400);
    return () => clearInterval(id);
  }, []);

  const cue = CUES[active];
  const playLeft = cue.left + cue.w / 2;

  return (
    <div className="relative">
      <div className="absolute -inset-x-6 -bottom-8 top-1/3 -z-10 rounded-[44px] bg-[radial-gradient(60%_60%_at_50%_50%,oklch(0.68_0.19_282_/_0.2),transparent_70%)] blur-2xl" />
      <div className="overflow-hidden rounded-[var(--radius-xl)] border border-white/[0.1] bg-[var(--color-bg-elev)] shadow-[var(--shadow-pop)]">
        <div className="flex items-center gap-3 border-b border-white/[0.07] bg-white/[0.02] px-4 py-2.5">
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-white/15" />
            <span className="size-2.5 rounded-full bg-white/15" />
            <span className="size-2.5 rounded-full bg-white/15" />
          </div>
          <span className="mono text-[11px] text-[var(--color-fg-subtle)]">capto / editor / reel.mp4</span>
        </div>

        <div className="flex">
          {/* canvas */}
          <div className="relative aspect-[16/10] flex-1 bg-[#070709]">
            <div className="absolute inset-x-0 bottom-0 top-0 flex items-end justify-center px-6 pb-24">
              <div
                key={active}
                className="cap-in text-center text-2xl font-bold uppercase leading-tight tracking-tight text-white sm:text-4xl"
              >
                {cue.text.split(" ").map((w, i) => (
                  <span key={i} className={i === cue.key ? "text-magic" : "text-white"}>
                    {w}{" "}
                  </span>
                ))}
              </div>
            </div>
            {/* timeline */}
            <div className="absolute inset-x-3 bottom-3 rounded-[var(--radius-md)] border border-white/[0.08] bg-black/60 p-2.5 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <span className="mono text-[10px] text-[var(--color-fg-subtle)] tnum">00:00</span>
                <div className="relative h-5 flex-1 overflow-hidden rounded bg-white/[0.04]">
                  {CUES.map((c, i) => (
                    <div
                      key={i}
                      className={cn(
                        "absolute top-1 h-3 rounded transition-colors duration-500",
                        i === active ? "bg-magic" : "bg-white/12",
                      )}
                      style={{ left: `${c.left}%`, width: `${c.w}%` }}
                    />
                  ))}
                  <div
                    className="absolute top-0 h-full w-px bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] transition-[left] duration-700 ease-[var(--ease-out)]"
                    style={{ left: `${playLeft}%` }}
                  />
                </div>
                <span className="mono text-[10px] text-[var(--color-fg-subtle)] tnum">00:24</span>
              </div>
            </div>
          </div>

          {/* captions panel — hidden on mobile */}
          <div className="hidden w-52 shrink-0 border-l border-white/[0.07] bg-white/[0.015] p-3 lg:block">
            <div className="eyebrow mb-3">Captions</div>
            <div className="space-y-2">
              {CUES.map((c, i) => (
                <div
                  key={c.t}
                  className={cn(
                    "rounded-[var(--radius-sm)] border px-2.5 py-2 transition-colors duration-300",
                    i === active
                      ? "border-[var(--color-violet)]/40 bg-[var(--color-brand-soft)]"
                      : "border-white/[0.06] bg-white/[0.02]",
                  )}
                >
                  <div className="mono text-[10px] text-[var(--color-fg-subtle)] tnum">{c.t}</div>
                  <div className="mt-0.5 text-[12px] leading-snug text-white/85">{c.text}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
