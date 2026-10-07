"use client";

import * as React from "react";
import Image from "next/image";
import { Pause, Play, Download, ChevronDown, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Hero product shot. One clock drives everything: the caption on the video,
 * the highlighted word, the active row in the caption list, the word chips on
 * the timeline and the playhead — so the whole mock stays in sync, the way the
 * real editor does. The playhead is moved through a ref every frame; React
 * only re-renders when the active word changes.
 */

const LINES = [
  ["MOST", "CREATORS"],
  ["LOSE", "THE", "VIEWER"],
  ["IN", "THE", "FIRST"],
  ["TWO", "SECONDS."],
  ["CAPTIONS", "FIX", "THAT."],
];

type Word = { w: string; line: number; start: number; end: number };

const { WORDS, DURATION } = (() => {
  const out: Word[] = [];
  let t = 0.3;
  LINES.forEach((line, li) => {
    line.forEach((w) => {
      const d = 0.16 + 0.05 * w.length;
      out.push({ w, line: li, start: t, end: t + d });
      t += d + 0.04;
    });
    t += 0.32;
  });
  return { WORDS: out, DURATION: t + 0.3 };
})();

const LINE_SPANS = LINES.map((_, li) => {
  const ws = WORDS.filter((w) => w.line === li);
  return { start: ws[0].start, end: ws[ws.length - 1].end };
});

// Deterministic waveform: loud while someone is talking, near-silent in gaps.
const BARS = Array.from({ length: 140 }, (_, i) => {
  const t = (i / 140) * DURATION;
  const talking = WORDS.some((w) => t >= w.start - 0.03 && t <= w.end + 0.03);
  const r = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
  return Math.round((talking ? 0.3 + 0.7 * r : 0.05 + 0.08 * r) * 100);
});

const PRESETS = ["Capto Bold", "Hormozi", "Karaoke", "Editorial"];
const SWATCHES = ["#8e7bff", "#ffd233", "#5ee6a8", "#ffffff"];

function fmt(t: number) {
  const s = Math.floor(t);
  const cs = Math.floor((t - s) * 100);
  return `00:0${s}.${cs.toString().padStart(2, "0")}`;
}

export function EditorMock() {
  const [active, setActive] = React.useState(4);
  const [playing, setPlaying] = React.useState(true);
  const headRef = React.useRef<HTMLDivElement>(null);
  const timeRef = React.useRef<HTMLSpanElement>(null);
  const clock = React.useRef({ t: WORDS[4].start + 0.05, last: 0 });

  React.useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) setPlaying(false);
  }, []);

  React.useEffect(() => {
    let raf = 0;
    let prev = -1;
    const paint = () => {
      const t = clock.current.t;
      const pct = (t / DURATION) * 100;
      if (headRef.current) headRef.current.style.left = `${pct}%`;
      if (timeRef.current) timeRef.current.textContent = fmt(t);
      // -1 = a pause between lines: the caption clears, like the real engine.
      const idx = WORDS.findIndex((w) => t >= w.start && t < w.end + 0.04);
      if (idx !== prev) {
        prev = idx;
        setActive(idx);
      }
    };
    const loop = (now: number) => {
      const dt = clock.current.last ? (now - clock.current.last) / 1000 : 0;
      clock.current.last = now;
      clock.current.t = (clock.current.t + Math.min(dt, 0.1)) % DURATION;
      paint();
      raf = requestAnimationFrame(loop);
    };
    paint();
    if (playing) raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      clock.current.last = 0;
    };
  }, [playing]);

  const wordIdx = active;
  const shownLine = active >= 0 ? WORDS[active].line : -1;

  return (
    <div className="overflow-hidden rounded-[var(--radius-xl)] border border-white/[0.09] bg-[#0b0c0e] shadow-[var(--shadow-pop)]">
      {/* top bar */}
      <div className="flex h-11 items-center gap-3 border-b border-white/[0.06] px-3.5">
        <Image src="/logo.svg" alt="" width={18} height={18} className="size-[18px]" />
        <span className="text-[13px] text-[var(--color-fg-muted)]">Projects</span>
        <span className="text-[13px] text-white/25">/</span>
        <span className="text-[13px] text-white">reel-01.mp4</span>
        <span className="mono ml-1 hidden rounded border border-white/10 px-1.5 py-px text-[10px] text-[var(--color-fg-subtle)] sm:inline">
          1080 × 1920 · 60fps
        </span>
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden items-center gap-1.5 text-[12px] text-[var(--color-fg-subtle)] sm:flex">
            <span className="size-1.5 rounded-full bg-[var(--color-success)]" /> Saved
          </span>
          <span className="inline-flex h-7 items-center gap-1.5 rounded-[var(--radius-sm)] bg-[var(--color-violet)] px-2.5 text-[12px] font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
            <Download className="size-3.5" /> Export
          </span>
        </div>
      </div>

      <div className="grid lg:grid-cols-[230px_1fr_240px]">
        {/* captions list */}
        <div className="hidden border-r border-white/[0.06] lg:block">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-[12px] font-medium text-white">Captions</span>
            <span className="mono text-[10px] text-[var(--color-fg-subtle)]">{WORDS.length} words</span>
          </div>
          <div className="space-y-px px-2">
            {LINES.map((line, li) => (
              <div
                key={li}
                className={cn(
                  "relative rounded-[var(--radius-sm)] px-3 py-2.5 transition-colors duration-200",
                  li === shownLine ? "bg-white/[0.05]" : "",
                )}
              >
                {li === shownLine && <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-[var(--color-violet)]" />}
                <div className="mono text-[10px] text-[var(--color-fg-subtle)] tnum">
                  {fmt(LINE_SPANS[li].start)} → {fmt(LINE_SPANS[li].end)}
                </div>
                <div className="mt-1 text-[12.5px] leading-snug text-white/85">
                  {line.map((w, wi) => {
                    const gi = WORDS.findIndex((x) => x.line === li) + wi;
                    return (
                      <span key={wi} className={cn(gi === wordIdx && "text-[var(--color-brand)]")}>
                        {w.toLowerCase()}{" "}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* preview */}
        <div className="relative flex items-center justify-center bg-[radial-gradient(circle_at_50%_40%,#15161a,#0b0c0e_70%)] px-4 py-6 sm:py-8">
          <div className="relative aspect-[9/16] h-[300px] overflow-hidden rounded-[10px] ring-1 ring-white/10 sm:h-[380px]">
            <Image src="/videos/posters/reel-1.jpg" alt="" fill sizes="220px" className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/40" />
            <div className="absolute inset-x-2 top-[60%] flex min-h-[2.4em] flex-wrap items-center justify-center gap-x-[0.28em] text-center text-[19px] font-[800] uppercase leading-none tracking-[-0.02em] text-white [text-shadow:0_2px_12px_rgba(0,0,0,0.55)] sm:text-[22px]">
              {shownLine >= 0 &&
                LINES[shownLine].map((w, wi) => {
                  const gi = WORDS.findIndex((x) => x.line === shownLine) + wi;
                  const on = gi === wordIdx;
                  return (
                    <span
                      key={`${shownLine}-${wi}`}
                      className={cn(
                        "cap-in rounded-[4px] px-[0.12em] py-[0.06em]",
                        on ? "bg-[var(--color-violet)] text-white" : "",
                        gi > wordIdx && "opacity-60",
                      )}
                      style={{ animationDelay: `${wi * 30}ms` }}
                    >
                      {w}
                    </span>
                  );
                })}
            </div>
          </div>
        </div>

        {/* inspector */}
        <div className="hidden border-l border-white/[0.06] lg:block">
          <div className="border-b border-white/[0.06] px-4 py-3 text-[12px] font-medium text-white">Style</div>
          <div className="space-y-5 p-4">
            <div className="grid grid-cols-2 gap-1.5">
              {PRESETS.map((p, i) => (
                <div
                  key={p}
                  className={cn(
                    "rounded-[var(--radius-sm)] border px-2 py-1.5 text-[11.5px]",
                    i === 0
                      ? "border-[var(--color-violet)]/60 bg-[var(--color-brand-soft)] text-white"
                      : "border-white/[0.07] text-[var(--color-fg-muted)]",
                  )}
                >
                  {p}
                </div>
              ))}
            </div>
            <Row label="Font">
              <span className="inline-flex items-center gap-1 text-white">
                Geist <span className="text-[var(--color-fg-subtle)]">800</span>
                <ChevronDown className="size-3 text-[var(--color-fg-subtle)]" />
              </span>
            </Row>
            <Row label="Size">
              <div className="flex w-[110px] items-center gap-2">
                <div className="relative h-1 flex-1 rounded-full bg-white/10">
                  <div className="absolute inset-y-0 left-0 w-[62%] rounded-full bg-white/70" />
                  <div className="absolute top-1/2 left-[62%] size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
                </div>
                <span className="mono text-[10px] text-[var(--color-fg-muted)] tnum">64</span>
              </div>
            </Row>
            <Row label="Highlight">
              <div className="flex gap-1.5">
                {SWATCHES.map((c, i) => (
                  <span
                    key={c}
                    className={cn("size-4 rounded-[4px]", i === 0 && "ring-2 ring-white/80 ring-offset-2 ring-offset-[#0b0c0e]")}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </Row>
            <Row label="Words / line">
              <span className="inline-flex items-center gap-2 text-white">
                <Minus className="size-3 text-[var(--color-fg-subtle)]" />
                <span className="mono text-[11px] tnum">2–3</span>
                <Plus className="size-3 text-[var(--color-fg-subtle)]" />
              </span>
            </Row>
            <Row label="Position">
              <div className="flex rounded-[5px] bg-white/[0.05] p-0.5 text-[10.5px]">
                {["Top", "Mid", "Low"].map((p) => (
                  <span
                    key={p}
                    className={cn("rounded-[4px] px-1.5 py-0.5", p === "Mid" ? "bg-white/10 text-white" : "text-[var(--color-fg-subtle)]")}
                  >
                    {p}
                  </span>
                ))}
              </div>
            </Row>
          </div>
        </div>
      </div>

      {/* timeline */}
      <div className="border-t border-white/[0.06] bg-[#09090b]">
        <div className="flex h-9 items-center gap-3 border-b border-white/[0.05] px-3.5">
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? "Pause preview" : "Play preview"}
            className="inline-flex size-6 items-center justify-center rounded-[5px] text-white hover:bg-white/10"
          >
            {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
          </button>
          <span className="mono text-[11px] text-white tnum">
            <span ref={timeRef}>{fmt(clock.current.t)}</span>
            <span className="text-[var(--color-fg-subtle)]"> / {fmt(DURATION)}</span>
          </span>
          <span className="mono ml-auto hidden text-[10px] text-[var(--color-fg-subtle)] sm:inline">word-level · auto-synced</span>
        </div>

        <div className="relative px-3.5 pb-3 pt-2">
          {/* ruler */}
          <div className="mono relative mb-1.5 flex h-3 justify-between text-[9px] text-white/25 tnum">
            {Array.from({ length: Math.floor(DURATION) + 1 }, (_, i) => (
              <span key={i}>{i}s</span>
            ))}
          </div>
          {/* caption track */}
          <div className="relative h-7 rounded-[5px] bg-white/[0.025]">
            {WORDS.map((w, i) => (
              <div
                key={i}
                className={cn(
                  "absolute top-1 bottom-1 overflow-hidden rounded-[3px] px-1 text-[9px] font-medium leading-5 transition-colors duration-150",
                  i === wordIdx
                    ? "bg-[var(--color-violet)] text-white"
                    : "bg-white/[0.07] text-white/55",
                )}
                style={{ left: `${(w.start / DURATION) * 100}%`, width: `${((w.end - w.start) / DURATION) * 100}%` }}
              >
                <span className="hidden sm:inline">{w.w.toLowerCase()}</span>
              </div>
            ))}
          </div>
          {/* audio track */}
          <div className="mt-1.5 flex h-9 items-center gap-[2px] rounded-[5px] bg-white/[0.02] px-1">
            {BARS.map((b, i) => (
              <span key={i} className="flex-1 rounded-full bg-white/20" style={{ height: `${Math.max(6, b)}%` }} />
            ))}
          </div>
          {/* playhead */}
          <div className="pointer-events-none absolute inset-y-1 left-3.5 right-3.5">
            <div ref={headRef} className="absolute inset-y-0 w-px bg-white" style={{ left: `${(clock.current.t / DURATION) * 100}%` }}>
              <span className="absolute -top-0.5 left-1/2 size-2 -translate-x-1/2 rotate-45 rounded-[1px] bg-white" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-[11.5px]">
      <span className="text-[var(--color-fg-subtle)]">{label}</span>
      {children}
    </div>
  );
}
