"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Still ordered-dither gradient on a plain 2D canvas — no WebGL context, drawn
 * once per resize. The canvas is sized in *cells* (one canvas px per dither
 * cell) and upscaled with `image-rendering: pixelated`, so it's crisp and
 * costs almost nothing. Used for page heroes, auth, and small accent tiles.
 */

export type StaticPreset = "top" | "bottom" | "band" | "corner";

const BAYER8 = [
  0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22, 3,
  35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21,
].map((v) => (v + 0.5) / 64);

function hash(x: number, y: number) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function noise(x: number, y: number) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy);
  const b = hash(ix + 1, iy);
  const c = hash(ix, iy + 1);
  const d = hash(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}
function fbm(x: number, y: number) {
  return 0.5 * noise(x, y) + 0.25 * noise(x * 2.03 + 17, y * 2.03 + 17) + 0.125 * noise(x * 4.1 + 31, y * 4.1 + 31);
}

function field(preset: StaticPreset, u: number, v: number, aspect: number) {
  // u,v in 0..1, v = 0 at top
  const n = fbm(u * aspect * 2.2, v * 2.6);
  switch (preset) {
    case "top": {
      const dx = (u - 0.62) * aspect * 0.5;
      const dy = v + 0.1;
      return Math.exp(-(dx * dx + dy * dy) * 4.2) * (0.1 + 0.85 * n * n);
    }
    case "bottom": {
      const dx = (u - 0.5) * aspect * 0.55;
      const dy = 1.08 - v;
      return Math.exp(-(dx * dx + dy * dy) * 3.6) * (0.1 + 0.9 * n * n);
    }
    case "corner": {
      const dx = (1 - u) * aspect * 0.7;
      const dy = v;
      return Math.exp(-(dx * dx + dy * dy) * 2.6) * (0.2 + 0.85 * n * n);
    }
    case "band":
    default: {
      const dy = (v - 0.5) * 3.2;
      return Math.exp(-dy * dy) * (0.25 + 0.9 * n);
    }
  }
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function DitherStatic({
  preset = "top",
  pixel = 3,
  tint = "#8e7bff",
  intensity = 1,
  className,
}: {
  preset?: StaticPreset;
  pixel?: number;
  tint?: string;
  intensity?: number;
  className?: string;
}) {
  const ref = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const [tr, tg, tb] = hexToRgb(tint);

    const paint = () => {
      const w = Math.max(1, Math.ceil(canvas.clientWidth / pixel));
      const h = Math.max(1, Math.ceil(canvas.clientHeight / pixel));
      if (canvas.width === w && canvas.height === h) return;
      canvas.width = w;
      canvas.height = h;
      const img = ctx.createImageData(w, h);
      const d = img.data;
      const aspect = w / h;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          // Floor cut keeps empty areas truly empty (no faint uniform speckle).
          const val = Math.max(field(preset, (x + 0.5) / w, (y + 0.5) / h, aspect) * intensity - 0.05, 0) * 1.08;
          const th = BAYER8[(y & 7) * 8 + (x & 7)];
          if (val < th) continue;
          const hi = val - 0.62 >= th;
          const i = (y * w + x) * 4;
          d[i] = hi ? 246 : tr;
          d[i + 1] = hi ? 246 : tg;
          d[i + 2] = hi ? 255 : tb;
          d[i + 3] = hi ? 255 : 150;
        }
      }
      ctx.putImageData(img, 0, 0);
    };

    paint();
    const ro = new ResizeObserver(paint);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [preset, pixel, tint, intensity]);

  return <canvas ref={ref} aria-hidden className={cn("dither-canvas", className)} />;
}
