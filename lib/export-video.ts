// Client-side video export. The original file never leaves the device: we play
// it through a canvas, paint captions on each frame, capture the canvas + the
// original audio with MediaRecorder, and hand back a downloadable blob. No
// server, no upload, works on Cloudflare's edge runtime.

import type { CaptionPreset } from "./caption-presets";
import { activeCueIndex, type Cue } from "./cues";
import { drawCaption, drawWatermark, type Pos, type CaptionAnim } from "./caption-render";

export type ExportOpts = {
  src: string; // object URL of the local file
  cues: Cue[];
  preset: CaptionPreset;
  pos: Pos;
  watermark: boolean;
  anim?: CaptionAnim;
  /** cap on the long edge in px (perf). 1920 by default. */
  maxEdge?: number;
  /** video bitrate (bits/s). Higher = better quality + bigger file. */
  videoBitrate?: number;
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
};

export type ExportResult = { blob: Blob; ext: string; mime: string };

function pickMime(): { mime: string; ext: string } {
  const candidates: { mime: string; ext: string }[] = [
    { mime: "video/mp4;codecs=h264,aac", ext: "mp4" },
    { mime: "video/mp4", ext: "mp4" },
    { mime: "video/webm;codecs=vp9,opus", ext: "webm" },
    { mime: "video/webm;codecs=vp8,opus", ext: "webm" },
    { mime: "video/webm", ext: "webm" },
  ];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c.mime)) return c;
  }
  return { mime: "video/webm", ext: "webm" };
}

export async function exportCaptionedVideo(opts: ExportOpts): Promise<ExportResult> {
  const { src, cues, preset, pos, watermark, anim = "none", onProgress, signal } = opts;
  const maxEdge = opts.maxEdge ?? 1920;
  const videoBitrate = opts.videoBitrate ?? 12_000_000;

  // Dedicated offscreen element so the preview element's audio is untouched.
  const video = document.createElement("video");
  video.src = src;
  video.crossOrigin = "anonymous";
  video.playsInline = true;
  video.preload = "auto";

  await new Promise<void>((res, rej) => {
    video.onloadedmetadata = () => res();
    video.onerror = () => rej(new Error("Could not load the video for export."));
  });

  const duration = video.duration || 0;
  if (!duration || !isFinite(duration)) throw new Error("Video has no readable duration.");

  // Output size: native aspect, long edge capped.
  let w = video.videoWidth || 1080;
  let h = video.videoHeight || 1920;
  const long = Math.max(w, h);
  if (long > maxEdge) {
    const k = maxEdge / long;
    w = Math.round((w * k) / 2) * 2;
    h = Math.round((h * k) / 2) * 2;
  }

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("Canvas is not available.");

  // Make sure the caption fonts are ready before the first frame.
  try {
    if (document.fonts?.load) {
      await Promise.all([
        document.fonts.load(`${preset.fontWeight} 64px ${preset.fontFamily}`),
        document.fonts.ready,
      ]);
    }
  } catch {
    /* fonts optional */
  }

  // Audio: route the element's audio into a MediaStream for the recorder.
  const AudioCtx =
    window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audioCtx = new AudioCtx();
  const sourceNode = audioCtx.createMediaElementSource(video);
  const destNode = audioCtx.createMediaStreamDestination();
  sourceNode.connect(destNode);

  const canvasStream = canvas.captureStream(30);
  const mixed = new MediaStream();
  canvasStream.getVideoTracks().forEach((tk) => mixed.addTrack(tk));
  destNode.stream.getAudioTracks().forEach((tk) => mixed.addTrack(tk));

  const { mime, ext } = pickMime();
  const recorder = new MediaRecorder(mixed, {
    mimeType: mime,
    videoBitsPerSecond: videoBitrate,
    audioBitsPerSecond: 192_000,
  });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size) chunks.push(e.data);
  };

  const cleanup = () => {
    try {
      video.pause();
    } catch {
      /* noop */
    }
    canvasStream.getTracks().forEach((tk) => tk.stop());
    audioCtx.close().catch(() => {});
  };

  const result = await new Promise<ExportResult>((resolve, reject) => {
    let raf = 0;

    const onAbort = () => {
      cancelAnimationFrame(raf);
      try {
        recorder.stop();
      } catch {
        /* noop */
      }
      cleanup();
      reject(new DOMException("Export cancelled", "AbortError"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });

    recorder.onstop = () => {
      cleanup();
      signal?.removeEventListener("abort", onAbort);
      const blob = new Blob(chunks, { type: mime });
      if (!chunks.length || blob.size === 0) {
        reject(new Error("Export produced no data. Try a shorter clip or a different browser."));
        return;
      }
      onProgress?.(1);
      resolve({ blob, ext, mime });
    };
    recorder.onerror = () => {
      cleanup();
      reject(new Error("Recording failed."));
    };

    const tick = () => {
      const t = video.currentTime;
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(video, 0, 0, w, h);
      const idx = activeCueIndex(cues, t);
      drawCaption({ ctx, cue: idx >= 0 ? cues[idx] : null, t, preset, width: w, height: h, pos, anim });
      if (watermark) drawWatermark(ctx, w, h);
      onProgress?.(Math.min(1, t / duration));

      if (video.ended || t >= duration - 1 / 30) {
        cancelAnimationFrame(raf);
        onProgress?.(1);
        // Flush any buffered frame data, then stop on the next tick.
        try {
          recorder.requestData?.();
          recorder.stop();
        } catch {
          /* noop */
        }
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    const begin = async () => {
      try {
        video.currentTime = 0;
        await audioCtx.resume().catch(() => {});
        recorder.start(250);
        await video.play();
        raf = requestAnimationFrame(tick);
      } catch (e) {
        cleanup();
        reject(e instanceof Error ? e : new Error("Could not start export."));
      }
    };
    void begin();
  });

  return result;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
