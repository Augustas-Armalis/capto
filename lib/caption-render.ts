// Canvas caption renderer. The SAME function paints the live preview overlay
// and each exported frame, so the preview is exactly what you download.

import type { CaptionPreset } from "./caption-presets";
import { applyCase } from "./caption-presets";
import { activeWordIndex, type Cue } from "./cues";

export type Pos = { x: number; y: number }; // 0..1, center anchor

// Entrance animation applied to the active word as it appears. Deterministic in
// `t`, so the live preview and the exported frames animate identically.
export type CaptionAnim = "none" | "pop" | "fade" | "slide" | "bounce";

export const CAPTION_ANIMS: { id: CaptionAnim; name: string }[] = [
  { id: "none", name: "None" },
  { id: "pop", name: "Pop" },
  { id: "fade", name: "Fade" },
  { id: "slide", name: "Slide up" },
  { id: "bounce", name: "Bounce" },
];

const ANIM_DUR = 0.22; // seconds for the entrance to settle

function easeOutBack(p: number) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
}
function easeOutCubic(p: number) {
  return 1 - Math.pow(1 - p, 3);
}

/** Transform for the active word given its age (seconds since its onset). */
function animTransform(
  kind: CaptionAnim,
  age: number,
  px: number,
): { scale: number; alpha: number; dy: number } {
  if (kind === "none" || age < 0) return { scale: 1, alpha: 1, dy: 0 };
  const p = Math.min(1, age / ANIM_DUR);
  if (p >= 1) return { scale: 1, alpha: 1, dy: 0 };
  switch (kind) {
    case "pop":
      return { scale: 0.7 + easeOutBack(p) * 0.3, alpha: Math.min(1, p * 2), dy: 0 };
    case "fade":
      return { scale: 0.96 + easeOutCubic(p) * 0.04, alpha: easeOutCubic(p), dy: 0 };
    case "slide":
      return { scale: 1, alpha: easeOutCubic(p), dy: (1 - easeOutCubic(p)) * px * 0.35 };
    case "bounce": {
      // Settle from below with a slight overshoot above the baseline.
      const e = easeOutBack(p);
      return { scale: 1, alpha: Math.min(1, p * 2.5), dy: (1 - e) * px * 0.4 };
    }
    default:
      return { scale: 1, alpha: 1, dy: 0 };
  }
}

type DrawArgs = {
  ctx: CanvasRenderingContext2D;
  cue: Cue | null;
  t: number;
  preset: CaptionPreset;
  width: number;
  height: number;
  pos: Pos;
  anim?: CaptionAnim;
};

function setFont(ctx: CanvasRenderingContext2D, preset: CaptionPreset, px: number) {
  ctx.font = `${preset.fontWeight} ${px}px ${preset.fontFamily}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // Letter spacing (supported in modern Chrome/Safari/Firefox).
  try {
    (ctx as unknown as { letterSpacing: string }).letterSpacing = `${preset.tracking}em`;
  } catch {
    /* older engines: ignore */
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, h / 2, w / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** Paint the active caption (if any) onto ctx. Clears nothing; draw frame first. */
export function drawCaption({ ctx, cue, t, preset, width, height, pos, anim = "none" }: DrawArgs) {
  if (!cue) return;

  const px = Math.round(Math.min(width, height) * preset.sizeRatio);
  setFont(ctx, preset, px);

  const wi = activeWordIndex(cue, t);
  const cx = pos.x * width;
  const cy = pos.y * height;
  const activeStart = cue.words[wi]?.start ?? cue.start;
  const at = animTransform(anim, t - activeStart, px);

  // Run drawWord through the active-word entrance transform (scale about the
  // word's own anchor, plus vertical offset + alpha).
  const animated = (
    fn: () => void,
    ax: number,
    ay: number,
    on: boolean,
  ) => {
    if (!on || (at.scale === 1 && at.alpha === 1 && at.dy === 0)) {
      fn();
      return;
    }
    ctx.save();
    ctx.globalAlpha = at.alpha;
    ctx.translate(ax, ay + at.dy);
    ctx.scale(at.scale, at.scale);
    ctx.translate(-ax, -ay);
    fn();
    ctx.restore();
  };

  // ── single-word styles: just the active word, swapped in place ──────────
  if (preset.single) {
    const raw = cue.words[wi]?.word ?? cue.text.split(" ")[0] ?? "";
    const word = applyCase(raw, preset.caseMode);
    animated(() => drawWord(ctx, word, cx, cy, px, preset, true, width), cx, cy, true);
    return;
  }

  // ── multi-word: wrap to lines, highlight the active word ────────────────
  const spaceW = ctx.measureText(" ").width || px * 0.3;
  const words = cue.words.map((w, i) => ({
    text: applyCase(w.word, preset.caseMode),
    i,
    w: 0,
  }));
  for (const wd of words) wd.w = ctx.measureText(wd.text).width;

  const maxLineW = width * 0.86;
  const lines: { items: typeof words; w: number }[] = [];
  let line: typeof words = [];
  let lineW = 0;
  for (const wd of words) {
    const add = (line.length ? spaceW : 0) + wd.w;
    if (line.length && lineW + add > maxLineW) {
      lines.push({ items: line, w: lineW });
      line = [];
      lineW = 0;
    }
    line.push(wd);
    lineW += (line.length > 1 ? spaceW : 0) + wd.w;
  }
  if (line.length) lines.push({ items: line, w: lineW });

  const lineH = px * 1.18;
  const totalH = lines.length * lineH;
  let y = cy - totalH / 2 + lineH / 2;

  for (const ln of lines) {
    let x = cx - ln.w / 2;
    for (const wd of ln.items) {
      const wx = x + wd.w / 2;
      const isActive = wd.i === wi;
      const wy = y;
      animated(
        () => drawWord(ctx, wd.text, wx, wy, px, preset, isActive, width),
        wx,
        wy,
        isActive,
      );
      x += wd.w + spaceW;
    }
    y += lineH;
  }
}

function drawWord(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  px: number,
  preset: CaptionPreset,
  active: boolean,
  width: number,
) {
  ctx.save();

  const accent = preset.accent || "#7c5cff";

  // Highlight box / pill behind the active word.
  if (active && preset.highlightMode === "box") {
    const w = ctx.measureText(text).width;
    const padX = px * 0.22;
    const padY = px * 0.16;
    const boxW = w + padX * 2;
    const boxH = px + padY * 2;
    ctx.fillStyle = accent;
    ctx.shadowColor = "transparent";
    roundRect(ctx, x - boxW / 2, y - boxH / 2, boxW, boxH, preset.pill ? boxH / 2 : px * 0.16);
    ctx.fill();
  }

  // Base drop shadow for readability (skip when a glow handles it).
  if (preset.shadow && !(active && preset.highlightMode === "glow")) {
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = px * 0.12;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = px * 0.04;
  } else {
    ctx.shadowColor = "transparent";
  }

  // Glow highlight.
  if (active && preset.highlightMode === "glow") {
    ctx.shadowColor = accent;
    ctx.shadowBlur = px * 0.5;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  // Text outline / stroke (drawn under the fill, inherits the readability shadow).
  const outline = preset.outline ?? 0;
  if (outline > 0) {
    ctx.lineWidth = px * outline;
    ctx.strokeStyle = preset.outlineColor || "#000000";
    ctx.lineJoin = "round";
    ctx.miterLimit = 2;
    ctx.strokeText(text, x, y);
  }

  ctx.fillStyle = active ? preset.highlightFill : preset.fill;
  ctx.fillText(text, x, y);

  // Underline highlight.
  if (active && preset.highlightMode === "underline") {
    const w = ctx.measureText(text).width;
    ctx.shadowColor = "transparent";
    ctx.strokeStyle = accent;
    ctx.lineWidth = Math.max(2, px * 0.05);
    ctx.beginPath();
    const uy = y + px * 0.46;
    ctx.moveTo(x - w / 2, uy);
    ctx.lineTo(x + w / 2, uy);
    ctx.stroke();
  }

  ctx.restore();
  void width;
}

/** Bottom-right "Made with Capto" watermark for the free tier. */
export function drawWatermark(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.save();
  const px = Math.round(Math.min(width, height) * 0.026);
  ctx.font = `600 ${px}px "DM Sans", system-ui, sans-serif`;
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  try {
    (ctx as unknown as { letterSpacing: string }).letterSpacing = "0em";
  } catch {
    /* ignore */
  }
  const pad = Math.round(width * 0.03);
  const label = "Made with Capto";
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = px * 0.4;
  ctx.shadowOffsetY = px * 0.06;
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.fillText(label, width - pad, height - pad);
  ctx.restore();
}
