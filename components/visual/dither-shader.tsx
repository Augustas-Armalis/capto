"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { DitherStatic, type StaticPreset } from "./dither-static";

/**
 * Animated ordered-dither field (WebGL1, no deps).
 *
 * Every screen cell of `pixel` CSS px samples a soft scalar field, then a
 * Bayer-8 threshold decides whether that cell lights up — and whether it lights
 * in the accent or in near-white for the brightest band. The field itself is
 * per-variant:
 *   horizon  glow rising from the bottom edge + three voice-like waveforms
 *   rise     noisy glow climbing from the bottom (CTA)
 *   wave     a single centered speech waveform (feature cards)
 *
 * Cheap by design: renders only while on screen and the tab is visible, caps
 * DPR at 2, and draws one still frame under prefers-reduced-motion. Falls back
 * to the 2D <DitherStatic> when WebGL is unavailable.
 */

export type ShaderVariant = "horizon" | "rise" | "wave";

const VARIANT_ID: Record<ShaderVariant, number> = { horizon: 0, rise: 1, wave: 2 };
const FALLBACK: Record<ShaderVariant, StaticPreset> = { horizon: "bottom", rise: "bottom", wave: "band" };

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uPixel;
uniform vec2 uMouse;
uniform float uMouseOn;
uniform vec3 uTint;
uniform float uVariant;
uniform float uIntensity;

float bayer2(vec2 a) { a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
float bayer8(vec2 a) { return bayer4(0.5 * a) * 0.25 + bayer2(a); }

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.03 + 17.1; a *= 0.5; }
  return v;
}

// Speech-like waveform: carrier lines whose amplitude follows a noisy envelope.
float waves(vec2 uv, float aspect, float center, float spread, float t) {
  float x = uv.x * aspect;
  float env = smoothstep(0.15, 0.85, fbm(vec2(x * 1.3 - t * 0.35, 4.0)));
  env *= 0.55 + 0.45 * sin(x * 2.1 - t * 0.7);
  float w = 0.0;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float y = center + spread * env * sin(x * (7.0 + fi * 3.3) - t * (1.3 + fi * 0.35) + fi * 2.1);
    float thick = 0.010 + 0.004 * fi;
    w += smoothstep(thick * 2.6, 0.0, abs(uv.y - y)) * (0.85 - fi * 0.22);
  }
  return w;
}

void main() {
  vec2 cell = floor(gl_FragCoord.xy / uPixel);
  vec2 uv = (cell + 0.5) * uPixel / uRes;
  float aspect = uRes.x / uRes.y;
  float t = uTime;
  float v = 0.0;

  if (uVariant < 0.5) {
    // horizon
    vec2 q = (uv - vec2(0.5, 0.52)) * vec2(aspect * 0.42, 1.7);
    float glow = exp(-dot(q, q) * 3.4);
    float n = fbm(vec2(uv.x * aspect * 1.4 + t * 0.04, uv.y * 2.2 - t * 0.09));
    v = glow * (0.12 + 0.62 * n * n);
    v += waves(uv, aspect, 0.8, 0.075, t) * (0.35 + 0.65 * glow) * 1.05;
  } else if (uVariant < 1.5) {
    // rise
    float n = fbm(vec2(uv.x * aspect * 1.8, uv.y * 1.6 - t * 0.16));
    float base = pow(1.0 - uv.y, 1.8);
    float side = 1.0 - 0.45 * abs(uv.x - 0.5);
    v = base * side * (0.22 + 1.45 * n * n);
  } else {
    // wave
    float mid = exp(-pow((uv.y - 0.5) * 3.2, 2.0));
    float n = fbm(vec2(uv.x * aspect * 2.0 - t * 0.1, uv.y * 3.0));
    v = mid * n * 0.38 + waves(uv, aspect, 0.5, 0.28, t * 1.15);
  }

  vec2 m = (uv - uMouse) * vec2(aspect, 1.0);
  v += uMouseOn * 0.32 * exp(-dot(m, m) * 22.0);
  v *= uIntensity;
  // Floor cut: keeps empty areas truly empty instead of a faint uniform speckle.
  v = max(v - 0.05, 0.0) * 1.08;

  float th = bayer8(cell);
  float on = step(th, v);
  float hi = step(th, v - 0.78);

  // Tiny gutter between cells reads as an LED / print grid, not blur.
  vec2 local = fract(gl_FragCoord.xy / uPixel);
  float gutter = (uPixel >= 4.0) ? step(local.x, 0.82) * step(local.y, 0.82) : 1.0;

  vec3 col = mix(uTint, vec3(0.97, 0.97, 1.0), hi * 0.9);
  float a = on * gutter * mix(0.55, 1.0, hi);
  gl_FragColor = vec4(col * a, a);
}
`;

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

export function DitherShader({
  variant = "horizon",
  pixel = 3,
  tint = "#8e7bff",
  intensity = 1,
  speed = 1,
  interactive = true,
  className,
}: {
  variant?: ShaderVariant;
  /** Cell size in CSS px */
  pixel?: number;
  tint?: string;
  intensity?: number;
  speed?: number;
  interactive?: boolean;
  className?: string;
}) {
  const ref = React.useRef<HTMLCanvasElement>(null);
  const [fallback, setFallback] = React.useState(false);

  React.useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: false,
      depth: false,
      premultipliedAlpha: true,
      powerPreference: "low-power",
    });
    if (!gl) {
      setFallback(true);
      return;
    }

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    const prog = gl.createProgram();
    if (!vs || !fs || !prog) {
      setFallback(true);
      return;
    }
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      setFallback(true);
      return;
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const u = {
      res: gl.getUniformLocation(prog, "uRes"),
      time: gl.getUniformLocation(prog, "uTime"),
      pixel: gl.getUniformLocation(prog, "uPixel"),
      mouse: gl.getUniformLocation(prog, "uMouse"),
      mouseOn: gl.getUniformLocation(prog, "uMouseOn"),
      tint: gl.getUniformLocation(prog, "uTint"),
      variant: gl.getUniformLocation(prog, "uVariant"),
      intensity: gl.getUniformLocation(prog, "uIntensity"),
    };
    gl.uniform3fv(u.tint, hexToRgb(tint));
    gl.uniform1f(u.variant, VARIANT_ID[variant]);
    gl.uniform1f(u.intensity, intensity);
    gl.clearColor(0, 0, 0, 0);

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    let dpr = 1;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, w, h);
      gl.uniform2f(u.res, w, h);
      gl.uniform1f(u.pixel, Math.max(1, Math.round(pixel * dpr)));
    };

    // Pointer, eased so the glow trails the cursor.
    const target = { x: 0.5, y: 0.5, on: 0 };
    const mouse = { x: 0.5, y: 0.5, on: 0 };
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = 1 - (e.clientY - r.top) / r.height;
      target.x = x;
      target.y = y;
      target.on = x > -0.1 && x < 1.1 && y > -0.1 && y < 1.1 ? 1 : 0;
    };
    const useMouse = interactive && !coarse && !reduced;
    if (useMouse) window.addEventListener("pointermove", onMove, { passive: true });

    let raf = 0;
    let visible = false;
    let start = performance.now();
    let elapsed = 0;

    const draw = (time: number) => {
      mouse.x += (target.x - mouse.x) * 0.08;
      mouse.y += (target.y - mouse.y) * 0.08;
      mouse.on += (target.on - mouse.on) * 0.05;
      gl.uniform1f(u.time, time * speed);
      gl.uniform2f(u.mouse, mouse.x, mouse.y);
      gl.uniform1f(u.mouseOn, mouse.on);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const loop = (now: number) => {
      elapsed = (now - start) / 1000;
      draw(elapsed);
      raf = requestAnimationFrame(loop);
    };
    const play = () => {
      if (reduced || raf) return;
      start = performance.now() - elapsed * 1000;
      raf = requestAnimationFrame(loop);
    };
    const pause = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };

    const ro = new ResizeObserver(() => {
      resize();
      if (!raf) draw(reduced ? 6 : elapsed);
    });
    ro.observe(canvas);
    resize();
    draw(reduced ? 6 : 0);

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible && !document.hidden) play();
        else pause();
      },
      { rootMargin: "100px" },
    );
    io.observe(canvas);
    const onVis = () => (document.hidden || !visible ? pause() : play());
    document.addEventListener("visibilitychange", onVis);

    return () => {
      pause();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      if (useMouse) window.removeEventListener("pointermove", onMove);
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, [variant, pixel, tint, intensity, speed, interactive]);

  if (fallback) return <DitherStatic preset={FALLBACK[variant]} pixel={pixel} tint={tint} className={className} />;
  return <canvas ref={ref} aria-hidden className={cn("dither-canvas", className)} />;
}
