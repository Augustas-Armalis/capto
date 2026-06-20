"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Upload,
  Play,
  Pause,
  Wand2,
  Download,
  Save,
  Trash2,
  Type,
  ListVideo,
  AlertCircle,
  Link2,
  Check,
  Lock,
  Sparkles,
  Crown,
  Gem,
  Send,
  Smile,
  Languages,
  X,
  Image as ImageIcon,
  FileText,
  SlidersHorizontal,
  Plus,
  Copy,
  Cpu,
  KeyRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Combobox } from "@/components/ui/combobox";
import { PoweredByContles } from "@/components/marketing/powered-by-contles";
import { PRESETS, getPreset } from "@/lib/caption-presets";
import {
  drawCaption,
  drawWatermark,
  CAPTION_ANIMS,
  type Pos,
  type CaptionAnim,
} from "@/lib/caption-render";
import {
  wordsToCues,
  activeCueIndex,
  fmtTime,
  type Cue,
  type Word,
} from "@/lib/cues";
import { exportCaptionedVideo, downloadBlob } from "@/lib/export-video";
import { pickVideoFile, saveHandle, tryRelink, fsAccessSupported } from "@/lib/media-handles";
import { cn } from "@/lib/utils";

type Plan = "free" | "pro" | "ultra";
type ExportQuality = "lossless" | "high" | "friend";

export type InitialProject = {
  id: string;
  name: string;
  state: {
    videoName?: string;
    durationSec?: number;
    presetId?: string;
    pos?: Pos;
    language?: string;
    cues?: Cue[];
    anim?: CaptionAnim;
  } | null;
};

const LANGS = [
  ["auto", "Auto-detect"],
  ["en", "English"],
  ["es", "Spanish"],
  ["fr", "French"],
  ["de", "German"],
  ["pt", "Portuguese"],
  ["it", "Italian"],
  ["nl", "Dutch"],
  ["hi", "Hindi"],
  ["ja", "Japanese"],
] as const;

export function EditorShell({
  plan = "free",
  initialProject = null,
  initialLanguage,
}: {
  plan?: Plan;
  initialProject?: InitialProject | null;
  initialLanguage?: string;
}) {
  const [isNarrow, setIsNarrow] = React.useState(false);

  React.useEffect(() => {
    // Mobile layout is for actual phones only — a touch device with a small
    // screen. A computer (fine pointer) ALWAYS gets the full desktop editor,
    // regardless of window width / devtools, so it never flips to "mobile".
    const check = () => {
      const coarse = window.matchMedia("(pointer: coarse)").matches;
      const noHover = window.matchMedia("(hover: none)").matches;
      setIsNarrow((coarse || noHover) && window.innerWidth < 1024);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return (
    <Editor plan={plan} initialProject={initialProject} isNarrow={isNarrow} initialLanguage={initialLanguage} />
  );
}

function Editor({
  plan,
  initialProject,
  isNarrow,
  initialLanguage,
}: {
  plan: Plan;
  initialProject: InitialProject | null;
  isNarrow: boolean;
  initialLanguage?: string;
}) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const wrapRef = React.useRef<HTMLDivElement | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const [src, setSrc] = React.useState<string | null>(null);
  const [fileObj, setFileObj] = React.useState<File | null>(null);
  const [meta, setMeta] = React.useState<{ w: number; h: number; dur: number } | null>(null);

  const [cues, setCues] = React.useState<Cue[]>(initialProject?.state?.cues ?? []);
  const [presetId, setPresetId] = React.useState(initialProject?.state?.presetId ?? "inter-bold");
  const [pos, setPos] = React.useState<Pos>(initialProject?.state?.pos ?? { x: 0.5, y: 0.82 });
  const [anim, setAnim] = React.useState<CaptionAnim>(initialProject?.state?.anim ?? "pop");
  const [language, setLanguage] = React.useState(
    initialProject?.state?.language ?? initialLanguage ?? "auto",
  );

  const [projectId, setProjectId] = React.useState<string | null>(initialProject?.id ?? null);
  const [projectName, setProjectName] = React.useState(initialProject?.name ?? "Untitled project");

  const [playing, setPlaying] = React.useState(false);
  const [time, setTime] = React.useState(0);
  const [tab, setTab] = React.useState<"captions" | "script" | "style" | "settings">("captions");
  const [mobileTab, setMobileTab] = React.useState<"style" | "captions">("captions");
  const [friendMB, setFriendMB] = React.useState(8);
  // Which AI engine produced the current captions, + a snapshot of its raw
  // output. On save we diff this against the edited captions to feed the
  // learning loop (accuracy per engine + the user's learned vocabulary).
  const [engine, setEngine] = React.useState<{
    provider: string;
    model: string;
    label: string;
    managed: boolean;
  } | null>(null);
  const aiOriginalRef = React.useRef<string>("");
  const [enhancing, setEnhancing] = React.useState<null | "translate" | "emoji">(null);
  const [targetLang, setTargetLang] = React.useState("es");
  const [exportMenuOpen, setExportMenuOpen] = React.useState(false);
  // Custom project thumbnail (a frame the user picked). Falls back to an
  // auto-captured frame on save when unset.
  const [customThumb, setCustomThumb] = React.useState<string | null>(null);

  const [transcribing, setTranscribing] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [exporting, setExporting] = React.useState(false);
  const [exportPct, setExportPct] = React.useState(0);
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [capReached, setCapReached] = React.useState(false);
  const [upgradeOpen, setUpgradeOpen] = React.useState(false);

  const isFree = plan === "free";
  const FREE_STYLE_LIMIT = 4;
  const preset = getPreset(presetId);

  // Re-chunk the current cues into one word per cue (popular punchy look). Pure
  // client transform — no re-transcription needed.
  const wordByWord = () => {
    setCues((prev) =>
      prev.flatMap((c, ci) =>
        c.words.map((w, wi) => ({
          id: `c${ci}w${wi}`,
          start: w.start,
          end: w.end,
          text: w.word,
          words: [w],
        })),
      ),
    );
  };
  const needsRelink = !!initialProject && !src;
  const expectedName = initialProject?.state?.videoName;

  // ── file handling ───────────────────────────────────────────────────────
  const loadFile = React.useCallback(
    (file: File, keepCues: boolean) => {
      setErr(null);
      if (src) URL.revokeObjectURL(src);
      const url = URL.createObjectURL(file);
      setFileObj(file);
      setSrc(url);
      if (!keepCues) {
        setCues([]);
        setProjectName(file.name.replace(/\.[^.]+$/, "").slice(0, 80) || "Untitled project");
      }
    },
    [src],
  );

  // Holds the File System Access handle for the current video, so the project
  // can re-link its media automatically next visit (no re-upload).
  const fileHandleRef = React.useRef<FileSystemFileHandle | null>(null);
  const [autoRelinking, setAutoRelinking] = React.useState(false);

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      fileHandleRef.current = null; // input picks don't yield a persistable handle
      loadFile(f, needsRelink);
    }
    e.target.value = "";
  };

  // Open the file picker. Prefers the File System Access API so we get a handle
  // we can store and silently re-open later; falls back to the <input>.
  const pickFile = React.useCallback(async () => {
    if (fsAccessSupported()) {
      const picked = await pickVideoFile();
      if (picked) {
        fileHandleRef.current = picked.handle;
        loadFile(picked.file, needsRelink);
        return;
      }
      return; // user cancelled the native picker
    }
    fileInputRef.current?.click();
  }, [loadFile, needsRelink]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f && f.type.startsWith("video/")) {
      fileHandleRef.current = null;
      loadFile(f, needsRelink);
    }
  };

  // Auto-relink: on reopening a saved project, try to silently re-read its file
  // from the stored handle. Only if that's not possible do we show the
  // "media lost → re-upload" prompt.
  React.useEffect(() => {
    const id = initialProject?.id;
    if (!id || src) return;
    let cancelled = false;
    (async () => {
      setAutoRelinking(true);
      try {
        const file = await tryRelink(id, false);
        if (!cancelled && file) loadFile(file, true);
      } finally {
        if (!cancelled) setAutoRelinking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Manual relink button: try the stored handle interactively (may prompt to
  // re-grant), else fall back to the normal file picker.
  const relinkMedia = React.useCallback(async () => {
    const id = initialProject?.id;
    if (id) {
      const file = await tryRelink(id, true);
      if (file) {
        loadFile(file, true);
        return;
      }
    }
    await pickFile();
  }, [initialProject?.id, loadFile, pickFile]);

  // Release the active object URL when the editor unmounts or the source changes
  // (revoking an already-revoked URL is a harmless no-op).
  React.useEffect(() => {
    return () => {
      if (src) URL.revokeObjectURL(src);
    };
  }, [src]);

  // ── video element wiring ──────────────────────────────────────────────────
  React.useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onMeta = () => setMeta({ w: v.videoWidth, h: v.videoHeight, dur: v.duration || 0 });
    const onTime = () => setTime(v.currentTime);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnd = () => setPlaying(false);
    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("ended", onEnd);
    return () => {
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("ended", onEnd);
    };
  }, [src]);

  // ── preview canvas drawing (matches export exactly) ───────────────────────
  const drawPreview = React.useCallback(() => {
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c) return;
    const rect = c.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = Math.max(1, Math.round(rect.width * dpr));
    const H = Math.max(1, Math.round(rect.height * dpr));
    if (c.width !== W || c.height !== H) {
      c.width = W;
      c.height = H;
    }
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    const t = v.currentTime;
    const idx = activeCueIndex(cues, t);
    drawCaption({ ctx, cue: idx >= 0 ? cues[idx] : null, t, preset, width: W, height: H, pos, anim });
    if (plan === "free") drawWatermark(ctx, W, H);
  }, [cues, preset, pos, anim, plan]);

  React.useEffect(() => {
    let raf = 0;
    const loop = () => {
      drawPreview();
      raf = requestAnimationFrame(loop);
    };
    if (playing) {
      raf = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(raf);
    }
    drawPreview();
  }, [playing, drawPreview]);

  React.useEffect(() => {
    const onResize = () => drawPreview();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [drawPreview]);

  // ── transcription ─────────────────────────────────────────────────────────
  const transcribe = async () => {
    if (!fileObj) return;
    setErr(null);
    setTranscribing(true);
    // Hard timeout so the button can never spin forever on a stalled request.
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 150_000);
    try {
      const fd = new FormData();
      fd.append("file", fileObj, fileObj.name);
      fd.append("language", language);
      if (meta?.dur) fd.append("durationSec", String(Math.round(meta.dur)));
      const res = await fetch("/api/transcribe", { method: "POST", body: fd, signal: ctrl.signal });
      const data = (await res.json()) as {
        words?: Word[];
        text?: string;
        engine?: { provider: string; model: string; label: string; managed: boolean };
        error?: string;
        detail?: string;
        code?: string;
      };
      if (!res.ok) {
        // Out of the monthly free allowance → nudge to upgrade.
        if (data.code === "cap_reached" && isFree) setUpgradeOpen(true);
        throw new Error(data.error || "Transcription failed.");
      }
      const words = data.words || [];
      if (!words.length) throw new Error("No speech detected in this clip.");
      const c = wordsToCues(words, { totalDuration: meta?.dur ?? Infinity });
      setCues(c);
      // Snapshot the raw AI output for the learning loop on save.
      aiOriginalRef.current = data.text || c.map((x) => x.text).join(" ");
      if (data.engine) setEngine(data.engine);
      setTab("captions");
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError")
        setErr("Transcription timed out. Try a shorter clip or check your connection.");
      else setErr(e instanceof Error ? e.message : "Transcription failed.");
    } finally {
      clearTimeout(timer);
      setTranscribing(false);
    }
  };

  // ── cue editing ─────────────────────────────────────────────────────────
  const seek = (t: number) => {
    const v = videoRef.current;
    if (v) {
      v.currentTime = Math.max(0, Math.min(t, (meta?.dur ?? 0) - 0.05));
      setTime(v.currentTime);
      drawPreview();
    }
  };

  const editCueText = (id: string, text: string) => {
    setCues((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const parts = text.split(/\s+/).filter(Boolean);
        const span = Math.max(0.001, c.end - c.start);
        let words: Word[];
        if (parts.length === 0) {
          words = c.words;
        } else if (parts.length === c.words.length) {
          // Same word count (e.g. fixing a typo): keep the real per-word timing.
          words = parts.map((w, i) => ({ word: w, start: c.words[i].start, end: c.words[i].end }));
        } else {
          // Added/removed words: fall back to even spacing across the cue.
          words = parts.map((w, i) => ({
            word: w,
            start: c.start + (span * i) / parts.length,
            end: c.start + (span * (i + 1)) / parts.length,
          }));
        }
        return { ...c, text, words };
      }),
    );
  };

  const deleteCue = (id: string) => setCues((prev) => prev.filter((c) => c.id !== id));

  // Insert a blank caption at the current playhead (original Subby's "Add caption").
  const addCueAtPlayhead = () => {
    const t = videoRef.current?.currentTime ?? time;
    const end = Math.min((meta?.dur ?? t + 1.5), t + 1.5);
    const c: Cue = {
      id: `c-${Math.round(t * 1000)}-${cues.length}`,
      start: t,
      end,
      text: "New caption",
      words: [{ word: "New", start: t, end: (t + end) / 2 }, { word: "caption", start: (t + end) / 2, end }],
    };
    setCues((prev) => [...prev, c].sort((a, b) => a.start - b.start));
    setTab("captions");
  };

  // Clear all captions (Script tab action).
  const clearCues = () => setCues([]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play();
    else v.pause();
  };

  // ── persistence ───────────────────────────────────────────────────────────
  const buildState = () => ({
    v: 1,
    videoName: fileObj?.name ?? expectedName,
    durationSec: meta?.dur,
    presetId,
    pos,
    anim,
    language,
    cues,
  });

  // Grab the current frame as a small JPEG for the dashboard thumbnail. The
  // source is a local blob URL (not cross-origin), so the canvas isn't tainted.
  const captureThumbnail = (): string | null => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return null;
    try {
      const w = 320;
      const h = Math.max(1, Math.round((w * v.videoHeight) / v.videoWidth));
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(v, 0, 0, w, h);
      return c.toDataURL("image/jpeg", 0.6);
    } catch {
      return null;
    }
  };

  // Set the current frame as this project's custom thumbnail.
  const setThumbnailFromFrame = () => {
    const t = captureThumbnail();
    if (t) {
      setCustomThumb(t);
      setSaved(false);
    }
  };

  const saveProject = async () => {
    setSaving(true);
    setSaved(false);
    setErr(null);
    try {
      const payload = {
        name: projectName,
        durationSec: meta?.dur,
        thumbnail: customThumb ?? captureThumbnail(),
        state: buildState(),
      };
      let savedId = projectId;
      if (projectId) {
        const r = await fetch(`/api/projects/${projectId}`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!r.ok) throw new Error("Could not save.");
      } else {
        const r = await fetch("/api/projects", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        const d = (await r.json()) as { id?: string; error?: string };
        if (!r.ok || !d.id) throw new Error(d.error || "Could not save.");
        setProjectId(d.id);
        savedId = d.id;
      }
      // Remember the file handle for this project so it auto-relinks next time.
      if (savedId && fileHandleRef.current) {
        void saveHandle(savedId, fileHandleRef.current);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);

      // Learning loop: tell the server how much the user changed the AI output.
      // Best-effort, fire-and-forget — never blocks the save.
      if (engine && aiOriginalRef.current && cues.length) {
        fetch("/api/ai/feedback", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            provider: engine.provider,
            model: engine.model,
            originalText: aiOriginalRef.current,
            finalText: cues.map((c) => c.text).join(" "),
          }),
        }).catch(() => {});
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save the project.");
    } finally {
      setSaving(false);
    }
  };

  // ── premium caption enhancement (Gemini) ────────────────────────────────
  const runEnhance = async (action: "translate" | "emoji") => {
    if (!cues.length || enhancing) return;
    setErr(null);
    setEnhancing(action);
    try {
      const res = await fetch("/api/ai/enhance", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, targetLang, cues }),
      });
      const data = (await res.json()) as { cues?: Cue[]; error?: string; code?: string };
      if (!res.ok) {
        // Upgrade-gated → show only the modal, not a redundant error banner.
        if (data.code === "upgrade") {
          setUpgradeOpen(true);
          return;
        }
        throw new Error(data.error || "Enhancement failed.");
      }
      if (Array.isArray(data.cues) && data.cues.length) setCues(data.cues);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Enhancement failed.");
    } finally {
      setEnhancing(null);
    }
  };

  // ── export ────────────────────────────────────────────────────────────────
  // Quality tiers. "lossless" (Pro/Ultra) keeps native resolution at a very high
  // bitrate; "high" is the balanced default; "friend" targets a small file size
  // (custom MB) so a clip can be shared over chat without compression upload.
  const runExport = async (quality: ExportQuality = isFree ? "high" : "lossless", targetMB = 12) => {
    if (!src || !cues.length) return;

    // Lossless is a paid feature — nudge free users to upgrade instead.
    if (quality === "lossless" && isFree) {
      setUpgradeOpen(true);
      return;
    }

    setErr(null);
    setCapReached(false);

    // Reserve one export (enforces the free monthly cap server-side).
    let watermark = plan === "free";
    try {
      const r = await fetch("/api/usage/export", { method: "POST" });
      const d = (await r.json()) as { allowed?: boolean; watermark?: boolean };
      if (r.status === 402 || d.allowed === false) {
        setCapReached(true);
        return;
      }
      if (typeof d.watermark === "boolean") watermark = d.watermark;
    } catch {
      /* offline / no account: still let them export with watermark */
    }

    // Resolve resolution cap + bitrate from the chosen quality.
    const duration = meta?.dur ?? 0;
    let maxEdge = 1920;
    let videoBitrate = 12_000_000;
    if (quality === "lossless") {
      maxEdge = plan === "ultra" ? 3840 : 2560;
      videoBitrate = 40_000_000;
    } else if (quality === "friend") {
      maxEdge = 1080;
      // bits = MB → bytes → bits, minus the ~192kbps audio track, spread over time.
      const bits = targetMB * 1024 * 1024 * 8;
      const audio = 192_000 * Math.max(1, duration);
      videoBitrate = Math.max(500_000, Math.round((bits - audio) / Math.max(1, duration)));
    }

    const v = videoRef.current;
    if (v && !v.paused) v.pause();
    setExporting(true);
    setExportPct(0);
    try {
      const { blob, ext } = await exportCaptionedVideo({
        src,
        cues,
        preset,
        pos,
        anim,
        watermark,
        maxEdge,
        videoBitrate,
        onProgress: (f) => setExportPct(Math.round(f * 100)),
      });
      const base = (projectName || "capto").replace(/[^\w-]+/g, "-").toLowerCase();
      downloadBlob(blob, `${base}-captioned.${ext}`);
    } catch (e) {
      // The export was reserved before rendering — refund it so a failed or
      // cancelled render doesn't burn the user's monthly quota.
      fetch("/api/usage/export", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ refund: true }),
      }).catch(() => {});
      if (!(e instanceof DOMException && e.name === "AbortError"))
        setErr(e instanceof Error ? e.message : "Export failed.");
    } finally {
      setExporting(false);
      setExportPct(0);
    }
  };

  const activeIdx = activeCueIndex(cues, time);
  const dur = meta?.dur ?? 0;
  const aspect = meta ? `${meta.w} / ${meta.h}` : "9 / 16";

  // ── mobile layout ─────────────────────────────────────────────────────────
  // A purpose-built phone editor: video on top, a tabbed sheet (Style /
  // Captions / Export) below. No timeline — seeking is a scrubber. Same engine,
  // same state, different shell.
  if (isNarrow) {
    return (
      <div className="flex h-[100dvh] flex-col bg-[var(--color-bg)]">
        {/* top bar: back · name · export */}
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--color-border)] bg-[var(--color-bg)]/85 px-3 py-2 backdrop-blur-xl">
          <Link
            href="/dashboard"
            aria-label="Back to dashboard"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-[var(--color-fg-muted)] hover:bg-white/5 hover:text-white"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="min-w-0 flex-1 truncate rounded-md bg-transparent px-2 py-1 text-center text-sm font-medium text-white outline-none focus:bg-white/[0.06]"
            spellCheck={false}
            aria-label="Project name"
          />
          {src && (
            <button
              onClick={saveProject}
              aria-label="Save"
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-[var(--color-fg-muted)] hover:bg-white/5 hover:text-white"
            >
              {saved ? <Check className="size-5 text-[var(--color-success)]" /> : <Save className="size-5" />}
            </button>
          )}
          <Button
            onClick={() => setExportMenuOpen(true)}
            variant="primary"
            size="sm"
            disabled={!cues.length || exporting}
            loading={exporting}
            className="shrink-0"
          >
            <Download className="size-4" />
            {exporting ? `${exportPct}%` : "Export"}
          </Button>
        </header>

        {/* video stage */}
        <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-3">
          {!src ? (
            <Dropzone
              onClick={needsRelink ? relinkMedia : pickFile}
              onDrop={onDrop}
              relink={needsRelink}
              expectedName={expectedName}
              autoRelinking={autoRelinking}
            />
          ) : (
            <div
              className="relative overflow-hidden rounded-[var(--radius-lg)] border border-white/10 bg-black shadow-[var(--shadow-pop)]"
              style={{ aspectRatio: aspect, maxHeight: "100%", height: "min(100%, 52vh)" }}
            >
              <video
                ref={videoRef}
                src={src}
                className="absolute inset-0 size-full object-contain"
                playsInline
                onClick={togglePlay}
              />
              <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 size-full" />
              {!playing && (
                <button
                  onClick={togglePlay}
                  aria-label="Play"
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <span className="inline-flex size-16 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm">
                    <Play className="size-7 translate-x-0.5" />
                  </span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* transport (scrubber, no timeline on mobile) */}
        {src && (
          <div className="flex shrink-0 items-center gap-3 border-t border-[var(--color-border)] px-4 py-2.5">
            <button
              onClick={togglePlay}
              aria-label={playing ? "Pause" : "Play"}
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-black active:scale-95"
            >
              {playing ? <Pause className="size-4" /> : <Play className="size-4 translate-x-px" />}
            </button>
            <input
              type="range"
              min={0}
              max={dur || 0}
              step={0.01}
              value={Math.min(time, dur || 0)}
              onChange={(e) => seek(parseFloat(e.target.value))}
              aria-label="Seek"
              className="flex-1 accent-[var(--color-brand)]"
            />
            <span className="mono shrink-0 text-[11px] text-[var(--color-fg-muted)] tnum">
              {fmtTime(time)} / {fmtTime(dur)}
            </span>
          </div>
        )}

        {/* tabbed sheet */}
        <div className="flex shrink-0 flex-col border-t border-[var(--color-border)] bg-[var(--color-bg-elev)]/70">
          <div className="grid grid-cols-2 gap-1 p-2">
            <TabBtn active={mobileTab === "style"} onClick={() => setMobileTab("style")} icon={<Type className="size-4" />}>
              Style
            </TabBtn>
            <TabBtn active={mobileTab === "captions"} onClick={() => setMobileTab("captions")} icon={<ListVideo className="size-4" />}>
              Captions
            </TabBtn>
          </div>
          <div className="max-h-[44vh] min-h-[180px] overflow-y-auto px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-1">
            {err && (
              <div className="mb-4 flex items-start gap-2 rounded-[var(--radius-md)] border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 p-3 text-xs text-[var(--color-danger)]">
                <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                <span>{err}</span>
              </div>
            )}
            {capReached && (
              <div className="mb-4 rounded-[var(--radius-md)] border border-[var(--color-brand)]/30 bg-[var(--color-brand-soft)] p-4 text-sm">
                <p className="font-medium text-white">You have used your 3 free exports this month.</p>
                <Button href="/billing" variant="primary" size="sm" className="mt-3 w-full">
                  Upgrade to Pro
                </Button>
              </div>
            )}
            {mobileTab === "captions" && (
              <CaptionsPanel
                cues={cues}
                activeIdx={activeIdx}
                hasVideo={!!src}
                transcribing={transcribing}
                language={language}
                onLanguage={setLanguage}
                onTranscribe={transcribe}
                onSeek={seek}
                onEdit={editCueText}
                onDelete={deleteCue}
                onWordByWord={wordByWord}
                engineLabel={engine?.label ?? null}
                enhancing={enhancing}
                onTranslate={() => runEnhance("translate")}
                onEmoji={() => runEnhance("emoji")}
                targetLang={targetLang}
                onTargetLang={setTargetLang}
              />
            )}
            {mobileTab === "style" && (
              <StylePanel
                presetId={presetId}
                onPreset={setPresetId}
                pos={pos}
                onPos={setPos}
                anim={anim}
                onAnim={setAnim}
                freeLimit={isFree ? FREE_STYLE_LIMIT : null}
                onLocked={() => setUpgradeOpen(true)}
                thumbnail={customThumb}
                onSetThumbnail={setThumbnailFromFrame}
              />
            )}
          </div>
        </div>

        <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={onPick} />
        {upgradeOpen && <UpgradeModal onClose={() => setUpgradeOpen(false)} />}

        {/* Export popup (bottom sheet) — replaces the old export tab */}
        {exportMenuOpen && (
          <div
            className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 backdrop-blur-sm"
            onClick={() => !exporting && setExportMenuOpen(false)}
          >
            <div
              className="w-full max-w-md rounded-t-3xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="heading text-lg text-white">Export</h3>
                <button
                  onClick={() => setExportMenuOpen(false)}
                  aria-label="Close"
                  className="inline-flex size-8 items-center justify-center rounded-full text-[var(--color-fg-muted)] hover:bg-white/5 hover:text-white"
                >
                  <X className="size-5" />
                </button>
              </div>
              <ExportPanel
                isFree={isFree}
                hasCues={cues.length > 0}
                exporting={exporting}
                exportPct={exportPct}
                friendMB={friendMB}
                onFriendMB={setFriendMB}
                thumbnail={customThumb}
                onSetThumbnail={setThumbnailFromFrame}
                onExport={(q) => {
                  if (q !== "friend") setExportMenuOpen(false);
                  runExport(q, friendMB);
                }}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-0px)] flex-col">
      {/* top bar */}
      <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-bg)]/80 px-4 py-2.5 backdrop-blur-xl">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-elev)] hover:text-[var(--color-fg)]"
          >
            <ArrowLeft className="size-4" />
            Back
          </Link>
          <input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="min-w-0 max-w-[40vw] truncate rounded-md bg-transparent px-2 py-1 text-sm font-medium text-white outline-none hover:bg-white/[0.04] focus:bg-white/[0.06]"
            spellCheck={false}
          />
          <Badge variant="brand" className="shrink-0">Beta</Badge>
        </div>
        <div className="flex items-center gap-2">
          {src && (
            <Button onClick={saveProject} variant="ghost" size="sm" loading={saving}>
              {saved ? <Check className="size-4 text-[var(--color-success)]" /> : <Save className="size-4" />}
              {saved ? "Saved" : "Save"}
            </Button>
          )}
          <div className="relative">
            <Button
              onClick={() => setExportMenuOpen((o) => !o)}
              variant="primary"
              size="sm"
              disabled={!cues.length || exporting}
              loading={exporting}
            >
              <Download className="size-4" />
              {exporting ? `Exporting ${exportPct}%` : "Export"}
            </Button>
            {exportMenuOpen && !exporting && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setExportMenuOpen(false)} />
                <div className="absolute right-0 z-50 mt-2 w-80 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3 shadow-[var(--shadow-pop)]">
                  <ExportPanel
                    isFree={isFree}
                    hasCues={cues.length > 0}
                    exporting={exporting}
                    exportPct={exportPct}
                    friendMB={friendMB}
                    onFriendMB={setFriendMB}
                    thumbnail={customThumb}
                    onSetThumbnail={setThumbnailFromFrame}
                    onExport={(q) => {
                      setExportMenuOpen(false);
                      runExport(q, friendMB);
                    }}
                  />
                </div>
              </>
            )}
          </div>
          <div className="hidden lg:block">
            <PoweredByContles variant="chip" />
          </div>
        </div>
      </div>

      {/* body */}
      <div className="flex min-h-0 flex-1">
        {/* stage */}
        <div className="flex min-w-0 flex-1 flex-col bg-[var(--color-bg)]">
          <div className="flex flex-1 items-center justify-center p-5 sm:p-8">
            {!src ? (
              <Dropzone
                onClick={needsRelink ? relinkMedia : pickFile}
                onDrop={onDrop}
                relink={needsRelink}
                expectedName={expectedName}
                autoRelinking={autoRelinking}
              />
            ) : (
              <div
                ref={wrapRef}
                className="relative max-h-full w-auto overflow-hidden rounded-[var(--radius-lg)] border border-white/10 bg-black shadow-[var(--shadow-pop)]"
                style={{ aspectRatio: aspect, maxHeight: "100%", height: "min(100%, 72vh)" }}
              >
                <video
                  ref={videoRef}
                  src={src}
                  className="absolute inset-0 size-full object-contain"
                  playsInline
                  onClick={togglePlay}
                />
                <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 size-full" />
              </div>
            )}
          </div>

          {/* transport + timeline */}
          {src && (
            <div className="border-t border-[var(--color-border)] bg-[var(--color-bg-elev)]/60 px-4 py-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={togglePlay}
                  aria-label={playing ? "Pause" : "Play"}
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-black transition-transform hover:scale-105 active:scale-95"
                >
                  {playing ? <Pause className="size-4" aria-hidden /> : <Play className="size-4 translate-x-px" aria-hidden />}
                </button>
                <span className="mono shrink-0 text-xs text-[var(--color-fg-muted)] tnum">
                  {fmtTime(time)} / {fmtTime(dur)}
                </span>
                <Timeline
                  dur={dur}
                  time={time}
                  cues={cues}
                  activeIdx={activeIdx}
                  onSeek={seek}
                />
              </div>
              {exporting && (
                <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-magic transition-[width] duration-200"
                    style={{ width: `${exportPct}%` }}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* sidebar */}
        <aside className="flex w-[340px] shrink-0 flex-col border-l border-[var(--color-border)] bg-[var(--color-bg-elev)]/40">
          {/* tabs */}
          <div className="flex shrink-0 items-center gap-1 border-b border-[var(--color-border)] p-2">
            <TabBtn active={tab === "captions"} onClick={() => setTab("captions")} icon={<ListVideo className="size-4" />}>
              Captions
            </TabBtn>
            <TabBtn active={tab === "script"} onClick={() => setTab("script")} icon={<FileText className="size-4" />}>
              Script
            </TabBtn>
            <TabBtn active={tab === "style"} onClick={() => setTab("style")} icon={<Type className="size-4" />}>
              Style
            </TabBtn>
            <TabBtn active={tab === "settings"} onClick={() => setTab("settings")} icon={<SlidersHorizontal className="size-4" />}>
              Settings
            </TabBtn>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {err && (
              <div className="mb-4 flex items-start gap-2 rounded-[var(--radius-md)] border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 p-3 text-xs text-[var(--color-danger)]">
                <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                <span>{err}</span>
              </div>
            )}
            {capReached && (
              <div className="mb-4 rounded-[var(--radius-md)] border border-[var(--color-brand)]/30 bg-[var(--color-brand-soft)] p-4 text-sm">
                <p className="font-medium text-white">You have used your 3 free exports this month.</p>
                <p className="mt-1 text-xs text-[var(--color-fg-muted)]">
                  Upgrade to Pro for unlimited, watermark-free, lossless exports.
                </p>
                <Button href="/billing" variant="primary" size="sm" className="mt-3 w-full">
                  Upgrade to Pro
                </Button>
              </div>
            )}

            {tab === "captions" && (
              <CaptionsPanel
                cues={cues}
                activeIdx={activeIdx}
                hasVideo={!!src}
                transcribing={transcribing}
                language={language}
                onLanguage={setLanguage}
                onTranscribe={transcribe}
                onSeek={seek}
                onEdit={editCueText}
                onDelete={deleteCue}
                onWordByWord={wordByWord}
                onAddCue={addCueAtPlayhead}
                engineLabel={engine?.label ?? null}
                enhancing={enhancing}
                onTranslate={() => runEnhance("translate")}
                onEmoji={() => runEnhance("emoji")}
                targetLang={targetLang}
                onTargetLang={setTargetLang}
              />
            )}
            {tab === "script" && (
              <ScriptPanel
                cues={cues}
                hasVideo={!!src}
                onWordByWord={wordByWord}
                onClear={clearCues}
                onSeek={seek}
              />
            )}
            {tab === "style" && (
              <StylePanel
                presetId={presetId}
                onPreset={setPresetId}
                pos={pos}
                onPos={setPos}
                anim={anim}
                onAnim={setAnim}
                freeLimit={isFree ? FREE_STYLE_LIMIT : null}
                onLocked={() => setUpgradeOpen(true)}
                thumbnail={customThumb}
                onSetThumbnail={setThumbnailFromFrame}
              />
            )}
            {tab === "settings" && (
              <EditorSettingsPanel
                language={language}
                onLanguage={setLanguage}
                engineLabel={engine?.label ?? null}
                plan={plan}
              />
            )}
          </div>

          <div className="shrink-0 border-t border-[var(--color-border)] p-3 text-center">
            <p className="mono text-[11px] text-[var(--color-fg-subtle)]">
              Your video stays on this device. Only captions are saved.
            </p>
          </div>
        </aside>
      </div>

      <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={onPick} />

      {upgradeOpen && <UpgradeModal onClose={() => setUpgradeOpen(false)} />}
    </div>
  );
}

// ── sub-components ──────────────────────────────────────────────────────────

function Dropzone({
  onClick,
  onDrop,
  relink,
  expectedName,
  autoRelinking,
}: {
  onClick: () => void;
  onDrop: (e: React.DragEvent) => void;
  relink: boolean;
  expectedName?: string;
  autoRelinking?: boolean;
}) {
  if (autoRelinking) {
    return (
      <div className="flex aspect-[16/10] w-full max-w-2xl flex-col items-center justify-center rounded-[var(--radius-xl)] border-2 border-dashed border-white/12 bg-white/[0.02] p-10 text-center">
        <div className="inline-flex size-14 items-center justify-center rounded-2xl bg-[var(--color-brand)]/15 text-[var(--color-brand)]">
          <Link2 className="size-7 animate-pulse" />
        </div>
        <h2 className="heading mt-5 text-xl text-white">Reconnecting your video…</h2>
        <p className="mt-2 max-w-sm text-sm text-[var(--color-fg-muted)]">
          Finding <span className="text-white">{expectedName || "your file"}</span> where you left it.
        </p>
      </div>
    );
  }
  return (
    <button
      onClick={onClick}
      onDrop={onDrop}
      onDragOver={(e) => e.preventDefault()}
      className="group flex aspect-[16/10] w-full max-w-2xl flex-col items-center justify-center rounded-[var(--radius-xl)] border-2 border-dashed border-white/12 bg-white/[0.02] p-10 text-center transition-colors hover:border-[var(--color-brand)]/50 hover:bg-white/[0.04]"
    >
      <div className="inline-flex size-14 items-center justify-center rounded-2xl bg-[var(--color-brand)]/15 text-[var(--color-brand)] transition-transform group-hover:scale-105">
        {relink ? <Link2 className="size-7" /> : <Upload className="size-7" />}
      </div>
      <h2 className="heading mt-5 text-xl text-white">
        {relink ? "Re-link your video" : "Drop a video to caption"}
      </h2>
      <p className="mt-2 max-w-sm text-sm text-[var(--color-fg-muted)]">
        {relink ? (
          <>
            This project&rsquo;s captions are saved. Select{" "}
            <span className="text-white">{expectedName || "the original file"}</span> again to keep editing or
            export. The file never leaves your device.
          </>
        ) : (
          <>MP4, MOV or WebM. It is processed locally on your device, nothing is uploaded to our servers.</>
        )}
      </p>
      <span className="mt-5 inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-white px-4 py-2 text-sm font-medium text-black">
        <Upload className="size-4" />
        {relink ? "Reconnect file" : "Choose file"}
      </span>
    </button>
  );
}

function Timeline({
  dur,
  time,
  cues,
  activeIdx,
  onSeek,
}: {
  dur: number;
  time: number;
  cues: Cue[];
  activeIdx: number;
  onSeek: (t: number) => void;
}) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const pct = dur > 0 ? (time / dur) * 100 : 0;
  const onClick = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el || dur <= 0) return;
    const r = el.getBoundingClientRect();
    onSeek(((e.clientX - r.left) / r.width) * dur);
  };
  return (
    <div
      ref={ref}
      onClick={onClick}
      className="relative h-9 flex-1 cursor-pointer overflow-hidden rounded-[var(--radius-sm)] border border-white/[0.07] bg-black/40"
    >
      {dur > 0 &&
        cues.map((c, i) => (
          <div
            key={c.id}
            className={cn(
              "absolute top-1.5 bottom-1.5 rounded-[3px] transition-colors",
              i === activeIdx ? "bg-magic" : "bg-white/15",
            )}
            style={{ left: `${(c.start / dur) * 100}%`, width: `${Math.max(0.5, ((c.end - c.start) / dur) * 100)}%` }}
          />
        ))}
      <div
        className="absolute top-0 bottom-0 w-px bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"
        style={{ left: `${pct}%` }}
      />
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-sm)] px-2 py-2 text-[13px] font-medium transition-colors [&_svg]:shrink-0",
        active ? "bg-white/[0.07] text-white" : "text-[var(--color-fg-muted)] hover:text-white",
      )}
    >
      {icon}
      {children}
    </button>
  );
}

function CaptionsPanel({
  cues,
  activeIdx,
  hasVideo,
  transcribing,
  language,
  onLanguage,
  onTranscribe,
  onSeek,
  onEdit,
  onDelete,
  onWordByWord,
  onAddCue,
  engineLabel,
  enhancing,
  onTranslate,
  onEmoji,
  targetLang,
  onTargetLang,
}: {
  cues: Cue[];
  activeIdx: number;
  hasVideo: boolean;
  transcribing: boolean;
  language: string;
  onLanguage: (l: string) => void;
  onTranscribe: () => void;
  onSeek: (t: number) => void;
  onEdit: (id: string, text: string) => void;
  onDelete: (id: string) => void;
  onWordByWord: () => void;
  onAddCue?: () => void;
  engineLabel: string | null;
  enhancing: null | "translate" | "emoji";
  onTranslate: () => void;
  onEmoji: () => void;
  targetLang: string;
  onTargetLang: (l: string) => void;
}) {
  if (!hasVideo) {
    return (
      <p className="text-sm text-[var(--color-fg-muted)]">
        Drop a video to get started. Captions will appear here.
      </p>
    );
  }

  if (!cues.length) {
    return (
      <div>
        <label className="eyebrow mb-2 block">Spoken language</label>
        <div className="mb-4">
          <Combobox
            value={language}
            onChange={onLanguage}
            options={LANGS.map(([v, l]) => ({ value: v, label: l }))}
            ariaLabel="Spoken language"
          />
        </div>
        <Button onClick={onTranscribe} variant="magic" size="lg" className="w-full" loading={transcribing}>
          {transcribing ? (
            "Transcribing…"
          ) : (
            <>
              <Wand2 className="size-4" />
              Generate captions
            </>
          )}
        </Button>
        <p className="mt-3 text-xs text-[var(--color-fg-subtle)] leading-relaxed">
          Capto picks the best AI engine automatically (Whisper, Deepgram &amp; more) — change it in
          Settings, or plug in your own key. Best with clips under a couple of minutes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {engineLabel && (
        <p className="mb-2 inline-flex items-center gap-1.5 text-[11px] text-[var(--color-fg-subtle)]">
          <Sparkles className="size-3 text-[var(--color-brand)]" />
          Captioned with {engineLabel}
        </p>
      )}
      {/* Quick caption actions */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {onAddCue && (
          <button
            onClick={onAddCue}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-brand)]/30 bg-[var(--color-brand-soft)] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:border-[var(--color-brand)]/60"
          >
            <Plus className="size-3.5 text-[var(--color-brand)]" />
            Add caption
          </button>
        )}
        <button
          onClick={onWordByWord}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-[var(--color-fg-muted)] transition-colors hover:border-white/25 hover:text-white"
        >
          <Wand2 className="size-3.5" />
          Word by word
        </button>
        <button
          onClick={onTranscribe}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-[var(--color-fg-muted)] transition-colors hover:border-white/25 hover:text-white"
        >
          <ListVideo className="size-3.5" />
          Regenerate
        </button>
        <button
          onClick={onEmoji}
          disabled={!!enhancing}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-[var(--color-fg-muted)] transition-colors hover:border-white/25 hover:text-white disabled:opacity-60"
        >
          <Smile className="size-3.5" />
          {enhancing === "emoji" ? "Adding…" : "Add emoji"}
        </button>
      </div>
      {/* Translate (premium) */}
      <div className="mb-3 flex items-center gap-2">
        <div className="w-36">
          <Combobox
            value={targetLang}
            onChange={onTargetLang}
            options={LANGS.filter(([v]) => v !== "auto").map(([v, l]) => ({ value: v, label: l }))}
            ariaLabel="Translation language"
            size="sm"
          />
        </div>
        <button
          onClick={onTranslate}
          disabled={!!enhancing}
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-brand)]/30 bg-[var(--color-brand-soft)] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:border-[var(--color-brand)]/60 disabled:opacity-60"
        >
          <Languages className="size-3.5 text-[var(--color-brand)]" />
          {enhancing === "translate" ? "Translating…" : "Translate"}
        </button>
      </div>
      {cues.map((c, i) => (
        <div
          key={c.id}
          className={cn(
            "group rounded-[var(--radius-md)] border p-2.5 transition-colors",
            i === activeIdx
              ? "border-[var(--color-brand)]/40 bg-[var(--color-brand-soft)]"
              : "border-white/[0.06] bg-white/[0.02] hover:border-white/15",
          )}
        >
          <div className="flex items-center justify-between">
            <button
              onClick={() => onSeek(c.start)}
              className="mono text-[10px] text-[var(--color-fg-subtle)] hover:text-[var(--color-fg)] tnum"
            >
              {fmtTime(c.start)}
            </button>
            <button
              onClick={() => onDelete(c.id)}
              aria-label={`Delete caption at ${fmtTime(c.start)}`}
              className="text-[var(--color-fg-subtle)] opacity-0 transition-opacity hover:text-[var(--color-danger)] group-hover:opacity-100"
            >
              <Trash2 className="size-3.5" aria-hidden />
            </button>
          </div>
          <input
            value={c.text}
            onChange={(e) => onEdit(c.id, e.target.value)}
            aria-label={`Caption at ${fmtTime(c.start)}`}
            className="mt-1 w-full rounded bg-transparent px-1 text-sm text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)]"
            spellCheck={false}
          />
        </div>
      ))}
    </div>
  );
}

// Script tab — the full transcript at a glance, plus the same quick actions the
// original Subby exposed (copy, one-word-per-word, clear).
function ScriptPanel({
  cues,
  hasVideo,
  onWordByWord,
  onClear,
  onSeek,
}: {
  cues: Cue[];
  hasVideo: boolean;
  onWordByWord: () => void;
  onClear: () => void;
  onSeek: (t: number) => void;
}) {
  const [copied, setCopied] = React.useState(false);
  if (!hasVideo) {
    return <p className="text-sm text-[var(--color-fg-muted)]">Drop a video and generate captions to see the script.</p>;
  }
  if (!cues.length) {
    return <p className="text-sm text-[var(--color-fg-muted)]">No captions yet. Generate them in the Captions tab.</p>;
  }
  const full = cues.map((c) => c.text).join(" ");
  const copy = () => {
    navigator.clipboard?.writeText(full).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        <button
          onClick={copy}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-[var(--color-fg-muted)] transition-colors hover:border-white/25 hover:text-white"
        >
          <Copy className="size-3.5" />
          {copied ? "Copied" : "Copy transcript"}
        </button>
        <button
          onClick={onWordByWord}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-[var(--color-fg-muted)] transition-colors hover:border-white/25 hover:text-white"
        >
          <Wand2 className="size-3.5" />
          One word per word
        </button>
        <button
          onClick={() => {
            if (confirm("Clear all captions?")) onClear();
          }}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-[var(--color-fg-muted)] transition-colors hover:border-[var(--color-danger)]/40 hover:text-[var(--color-danger)]"
        >
          <Trash2 className="size-3.5" />
          Clear
        </button>
      </div>
      <div className="rounded-[var(--radius-md)] border border-white/[0.06] bg-white/[0.02] p-4 text-sm leading-relaxed text-[var(--color-fg)]">
        {cues.map((c, i) => (
          <button
            key={c.id}
            onClick={() => onSeek(c.start)}
            className="cursor-pointer rounded px-0.5 text-left hover:bg-[var(--color-brand-soft)] hover:text-white"
            title={fmtTime(c.start)}
          >
            {c.text}
            {i < cues.length - 1 ? " " : ""}
          </button>
        ))}
      </div>
    </div>
  );
}

// Settings tab in the editor — quick per-project AI controls + link to full settings.
function EditorSettingsPanel({
  language,
  onLanguage,
  engineLabel,
  plan,
}: {
  language: string;
  onLanguage: (l: string) => void;
  engineLabel: string | null;
  plan: Plan;
}) {
  return (
    <div className="space-y-6">
      <div>
        <label className="eyebrow mb-2 block">Spoken language</label>
        <Combobox
          value={language}
          onChange={onLanguage}
          options={LANGS.map(([v, l]) => ({ value: v, label: l }))}
          ariaLabel="Spoken language"
        />
        <p className="mt-2 text-xs text-[var(--color-fg-subtle)]">Used the next time you generate captions.</p>
      </div>

      <div className="rounded-[var(--radius-md)] border border-white/[0.06] bg-white/[0.02] p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-white">
          <Cpu className="size-4 text-[var(--color-brand)]" />
          AI engine
        </div>
        <p className="mt-1.5 text-xs text-[var(--color-fg-muted)]">
          {engineLabel ? `Last used: ${engineLabel}. ` : ""}
          {plan === "free"
            ? "Free uses our managed Groq within your monthly minutes, or your own key."
            : "Runs on our managed AI. Switch models or add your own key in Settings."}
        </p>
        <Button href="/settings" variant="secondary" size="sm" className="mt-3">
          <SlidersHorizontal className="size-4" />
          AI &amp; model settings
        </Button>
      </div>

      <div className="rounded-[var(--radius-md)] border border-white/[0.06] bg-white/[0.02] p-4">
        <div className="text-sm font-medium text-white">API keys</div>
        <p className="mt-1.5 text-xs text-[var(--color-fg-muted)]">
          Bring your own Groq, OpenAI, Deepgram or Gemini key. Encrypted, never exposed.
        </p>
        <Button href="/settings#api-keys" variant="secondary" size="sm" className="mt-3">
          <KeyRound className="size-4" />
          Manage keys
        </Button>
      </div>

      <p className="mono text-[11px] leading-relaxed text-[var(--color-fg-subtle)]">
        Your video stays on this device. Only the captions + a thumbnail are saved.
      </p>
    </div>
  );
}

function StylePanel({
  presetId,
  onPreset,
  pos,
  onPos,
  anim,
  onAnim,
  freeLimit,
  onLocked,
  thumbnail,
  onSetThumbnail,
}: {
  presetId: string;
  onPreset: (id: string) => void;
  pos: Pos;
  onPos: (p: Pos) => void;
  anim: CaptionAnim;
  onAnim: (a: CaptionAnim) => void;
  freeLimit: number | null;
  onLocked: () => void;
  thumbnail: string | null;
  onSetThumbnail: () => void;
}) {
  const isFreeTier = freeLimit !== null;
  return (
    <div>
      <label className="eyebrow mb-2 block">Caption style</label>
      <div className="grid grid-cols-2 gap-2">
        {PRESETS.map((p, idx) => {
          const locked = freeLimit !== null && idx >= freeLimit;
          return (
            <button
              key={p.id}
              onClick={() => (locked ? onLocked() : onPreset(p.id))}
              className={cn(
                "relative flex h-16 items-center justify-center rounded-[var(--radius-md)] border px-2 text-center transition-colors",
                presetId === p.id
                  ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)]"
                  : "border-white/[0.08] bg-white/[0.02] hover:border-white/20",
                locked && "opacity-60",
              )}
            >
              <span
                className="text-sm font-bold text-white"
                style={{ fontWeight: p.fontWeight, textTransform: p.caseMode === "upper" ? "uppercase" : "none" }}
              >
                {p.name}
              </span>
              {p.popular && !locked && (
                <span className="absolute -top-1.5 right-1.5 rounded-full bg-white px-1.5 text-[9px] font-semibold text-black">
                  default
                </span>
              )}
              {locked && (
                <span className="absolute -top-1.5 right-1.5 inline-flex items-center gap-0.5 rounded-full bg-[var(--color-brand)] px-1.5 py-0.5 text-[9px] font-semibold text-white">
                  <Lock className="size-2.5" />
                  Pro
                </span>
              )}
            </button>
          );
        })}
      </div>
      {freeLimit !== null && (
        <button
          onClick={onLocked}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-brand)]/30 bg-[var(--color-brand-soft)] px-3 py-2 text-xs font-medium text-white transition-colors hover:border-[var(--color-brand)]/60"
        >
          <Sparkles className="size-3.5 text-[var(--color-brand)]" />
          Unlock every style + custom colors with Pro
        </button>
      )}

      {/* Animation — premium */}
      <div className="mb-2 mt-6 flex items-center gap-2">
        <label className="eyebrow">Animation</label>
        {isFreeTier && (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-[var(--color-brand)] px-1.5 py-0.5 text-[9px] font-semibold text-white">
            <Lock className="size-2.5" /> Pro
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {CAPTION_ANIMS.map((a) => (
          <button
            key={a.id}
            onClick={() => (isFreeTier ? onLocked() : onAnim(a.id))}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              !isFreeTier && anim === a.id
                ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)] text-white"
                : "border-white/[0.08] bg-white/[0.02] text-[var(--color-fg-muted)] hover:border-white/20 hover:text-white",
              isFreeTier && "opacity-60",
            )}
          >
            {a.name}
          </button>
        ))}
      </div>

      <label htmlFor="caption-y" className="eyebrow mb-2 mt-6 block">Vertical position</label>
      <input
        id="caption-y"
        type="range"
        min={0.4}
        max={0.92}
        step={0.01}
        value={pos.y}
        aria-label="Caption vertical position"
        onChange={(e) => onPos({ ...pos, y: parseFloat(e.target.value) })}
        className="w-full accent-[var(--color-brand)]"
      />
      <div className="mt-1 flex justify-between text-[10px] text-[var(--color-fg-subtle)]">
        <span>Higher</span>
        <span>Lower</span>
      </div>

      {/* Horizontal position — premium-only extra control */}
      {!isFreeTier ? (
        <>
          <label htmlFor="caption-x" className="eyebrow mb-2 mt-6 block">Horizontal position</label>
          <input
            id="caption-x"
            type="range"
            min={0.1}
            max={0.9}
            step={0.01}
            value={pos.x}
            aria-label="Caption horizontal position"
            onChange={(e) => onPos({ ...pos, x: parseFloat(e.target.value) })}
            className="w-full accent-[var(--color-brand)]"
          />
          <div className="mt-1 flex justify-between text-[10px] text-[var(--color-fg-subtle)]">
            <span>Left</span>
            <span>Right</span>
          </div>
        </>
      ) : (
        <button
          onClick={onLocked}
          className="mt-5 flex w-full items-center justify-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-brand)]/30 bg-[var(--color-brand-soft)] px-3 py-2 text-xs font-medium text-white transition-colors hover:border-[var(--color-brand)]/60"
        >
          <Sparkles className="size-3.5 text-[var(--color-brand)]" />
          More controls — animations &amp; positioning with Pro
        </button>
      )}

      {/* Project thumbnail */}
      <label className="eyebrow mb-2 mt-6 block">Thumbnail</label>
      <div className="flex items-center gap-3">
        <div className="h-14 w-24 shrink-0 overflow-hidden rounded-md border border-white/10 bg-black/40">
          {thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumbnail} alt="" className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center text-[10px] text-[var(--color-fg-subtle)]">Auto</div>
          )}
        </div>
        <button
          onClick={onSetThumbnail}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-[var(--color-fg-muted)] transition-colors hover:border-white/25 hover:text-white"
        >
          <ImageIcon className="size-3.5" />
          Use current frame
        </button>
      </div>
    </div>
  );
}

function ExportPanel({
  isFree,
  hasCues,
  exporting,
  exportPct,
  friendMB,
  onFriendMB,
  onExport,
  thumbnail,
  onSetThumbnail,
}: {
  isFree: boolean;
  hasCues: boolean;
  exporting: boolean;
  exportPct: number;
  friendMB: number;
  onFriendMB: (n: number) => void;
  onExport: (q: ExportQuality) => void;
  thumbnail?: string | null;
  onSetThumbnail?: () => void;
}) {
  if (!hasCues) {
    return (
      <p className="py-4 text-sm text-[var(--color-fg-muted)]">
        Generate captions first — then pick how you want to export.
      </p>
    );
  }
  return (
    <div className="space-y-2.5">
      {/* Thumbnail */}
      {onSetThumbnail && (
        <div className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-white/[0.08] bg-white/[0.02] p-2.5">
          <div className="h-12 w-20 shrink-0 overflow-hidden rounded-md border border-white/10 bg-black/40">
            {thumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumbnail} alt="" className="size-full object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center text-[10px] text-[var(--color-fg-subtle)]">Auto</div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-white">Thumbnail</div>
            <div className="text-xs text-[var(--color-fg-subtle)]">Shown in your projects list.</div>
          </div>
          <button
            onClick={onSetThumbnail}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-[var(--color-fg-muted)] transition-colors hover:border-white/25 hover:text-white"
          >
            <ImageIcon className="size-3.5" />
            Current frame
          </button>
        </div>
      )}
      {/* Lossless (paid) */}
      <button
        onClick={() => onExport("lossless")}
        disabled={exporting}
        className="flex w-full items-center gap-3 rounded-[var(--radius-lg)] border border-white/[0.08] bg-white/[0.02] p-3.5 text-left transition-colors hover:border-white/20 disabled:opacity-60"
      >
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-brand)]/15 text-[var(--color-brand)]">
          <Gem className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 text-sm font-medium text-white">
            Lossless
            {isFree && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-[var(--color-brand)] px-1.5 py-0.5 text-[9px] font-semibold text-white">
                <Lock className="size-2.5" />
                Pro
              </span>
            )}
          </span>
          <span className="mt-0.5 block text-xs text-[var(--color-fg-muted)]">
            Native resolution, maximum quality.
          </span>
        </span>
      </button>

      {/* High (default) */}
      <button
        onClick={() => onExport("high")}
        disabled={exporting}
        className="flex w-full items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-brand)]/30 bg-[var(--color-brand-soft)] p-3.5 text-left transition-colors hover:border-[var(--color-brand)]/60 disabled:opacity-60"
      >
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white">
          <Download className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="text-sm font-medium text-white">High — recommended</span>
          <span className="mt-0.5 block text-xs text-[var(--color-fg-muted)]">
            1080p, crisp and a sensible file size.
          </span>
        </span>
      </button>

      {/* Send to a friend (custom MB) */}
      <div className="rounded-[var(--radius-lg)] border border-white/[0.08] bg-white/[0.02] p-3.5">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white">
            <Send className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-white">Send to a friend</div>
            <div className="mt-0.5 text-xs text-[var(--color-fg-muted)]">
              Tiny file that drops straight into a chat.
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-[var(--color-fg-muted)]">
          <span>Target size</span>
          <span className="mono text-white tnum">~{friendMB} MB</span>
        </div>
        <input
          type="range"
          min={2}
          max={25}
          step={1}
          value={friendMB}
          onChange={(e) => onFriendMB(parseInt(e.target.value, 10))}
          aria-label="Target file size in megabytes"
          className="mt-2 w-full accent-[var(--color-brand)]"
        />
        <Button
          onClick={() => onExport("friend")}
          disabled={exporting}
          variant="secondary"
          size="md"
          className="mt-3 w-full"
        >
          Export ~{friendMB} MB
        </Button>
      </div>

      {exporting && (
        <div className="pt-1">
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-magic transition-[width] duration-200"
              style={{ width: `${exportPct}%` }}
            />
          </div>
          <p className="mt-1.5 text-center text-xs text-[var(--color-fg-muted)]">Exporting {exportPct}%…</p>
        </div>
      )}
    </div>
  );
}

function UpgradeModal({ onClose }: { onClose: () => void }) {
  const perks = [
    "Every caption style + custom colors",
    "Unlimited videos & exports",
    "Lossless 4K export, no watermark",
    "Regenerate captions any time",
  ];
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-[var(--color-brand)]/20 blur-3xl"
        />
        <div className="relative">
          <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-[var(--color-brand)]/15 text-[var(--color-brand)]">
            <Crown className="size-6" />
          </div>
          <h3 className="heading mt-4 text-2xl text-white">Unlock the full editor</h3>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-fg-muted)]">
            You&rsquo;re on the free plan. Upgrade to Pro to remove every limit and ship captions
            without the watermark.
          </p>
          <ul className="mt-5 space-y-2.5">
            {perks.map((perk) => (
              <li key={perk} className="flex items-start gap-2.5 text-sm text-[var(--color-fg)]">
                <Sparkles className="mt-0.5 size-4 shrink-0 text-[var(--color-brand)]" />
                {perk}
              </li>
            ))}
          </ul>
          <div className="mt-7 space-y-2.5">
            <Button href="/billing" size="lg" className="w-full">
              Upgrade to Pro
              <ArrowLeft className="size-4 rotate-180" />
            </Button>
            <Button onClick={onClose} variant="ghost" size="lg" className="w-full">
              Maybe later
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
