"use client";

import { LiveCaption } from "./live-caption";

const CUES = [
  { t: "00:01", text: "We only make captions", on: false },
  { t: "00:03", text: "that's why they're better", on: true },
  { t: "00:05", text: "lossless, word for word", on: false },
];

/** A hand-built mock of the Capto editor. Swap the canvas for a real
 *  product screenshot when ready. */
export function EditorMock() {
  return (
    <div className="relative">
      <div className="absolute -inset-x-6 -bottom-8 top-1/3 -z-10 rounded-[44px] bg-[radial-gradient(60%_60%_at_50%_50%,oklch(0.68_0.19_282_/_0.22),transparent_70%)] blur-2xl" />
      <div className="overflow-hidden rounded-[var(--radius-xl)] border border-white/[0.1] bg-[var(--color-bg-elev)] shadow-[var(--shadow-pop)]">
        {/* chrome */}
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
            <div className="absolute inset-0 flex items-end justify-center px-6 pb-24">
              <LiveCaption
                words={["WE", "ONLY", "MAKE", "CAPTIONS"]}
                wordClass="text-2xl font-bold tracking-tight text-white sm:text-4xl"
                highlightClass="bg-magic rounded-md px-2 opacity-100"
                interval={680}
                className="max-w-[92%]"
              />
            </div>
            {/* timeline */}
            <div className="absolute inset-x-3 bottom-3 rounded-[var(--radius-md)] border border-white/[0.08] bg-black/60 p-2.5 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <span className="mono text-[10px] text-[var(--color-fg-subtle)] tnum">00:00</span>
                <div className="relative h-5 flex-1 overflow-hidden rounded bg-white/[0.04]">
                  <div className="absolute left-[4%] top-1 h-3 w-[24%] rounded bg-magic" />
                  <div className="absolute left-[32%] top-1 h-3 w-[18%] rounded bg-white/15" />
                  <div className="absolute left-[54%] top-1 h-3 w-[24%] rounded bg-magic opacity-90" />
                  <div
                    className="absolute top-0 h-full w-px bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                    style={{ animation: "playhead 6s var(--ease-in-out) infinite alternate" }}
                  />
                </div>
                <span className="mono text-[10px] text-[var(--color-fg-subtle)] tnum">00:24</span>
              </div>
            </div>
          </div>

          {/* captions panel, hidden on mobile */}
          <div className="hidden w-52 shrink-0 border-l border-white/[0.07] bg-white/[0.015] p-3 lg:block">
            <div className="eyebrow mb-3">Captions</div>
            <div className="space-y-2">
              {CUES.map((c) => (
                <div
                  key={c.t}
                  className={`rounded-[var(--radius-sm)] border px-2.5 py-2 ${c.on ? "border-[var(--color-violet)]/40 bg-[var(--color-brand-soft)]" : "border-white/[0.06] bg-white/[0.02]"}`}
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
