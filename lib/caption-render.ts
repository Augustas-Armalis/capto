// Canvas caption renderer. The SAME function paints the live preview overlay
// and each exported frame, so the preview is exactly what you download.

import type { CaptionPreset } from "./caption-presets";
import { applyCase } from "./caption-presets";
import { activeWordIndex, type Cue } from "./cues";

export type Pos = { x: number; y: number }; // 0..1, center anchor

type DrawArgs = {
  ctx: CanvasRenderingContext2D;
  cue: Cue | null;
  t: number;
  preset: CaptionPreset;
  width: number;
  height: number;
  pos: Pos;
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
export function drawCaption({ ctx, cue, t, preset, width, height, pos }: DrawArgs) {
  if (!cue) return;

  const px = Math.round(Math.min(width, height) * preset.sizeRatio);
  setFont(ctx, preset, px);

  const wi = activeWordIndex(cue, t);
  const cx = pos.x * width;
  const cy = pos.y * height;

  // ── single-word styles: just the active word, swapped in place ──────────
  if (preset.single) {
    const raw = cue.words[wi]?.word ?? cue.text.split(" ")[0] ?? "";
    const word = applyCase(raw, preset.caseMode);
    drawWord(ctx, word, cx, cy, px, preset, true, width);
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
      drawWord(ctx, wd.text, wx, y, px, preset, wd.i === wi, width);
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
