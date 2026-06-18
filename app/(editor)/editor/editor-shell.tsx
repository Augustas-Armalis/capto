"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Monitor,
  Smartphone,
  Upload,
  Play,
  Pause,
  Wand2,
  Download,
  Save,
  Trash2,
  Loader2,
  Type,
  ListVideo,
  AlertCircle,
  Link2,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PoweredByContles } from "@/components/marketing/powered-by-contles";
import { PRESETS, getPreset } from "@/lib/caption-presets";
import { drawCaption, drawWatermark, type Pos } from "@/lib/caption-render";
import {
  wordsToCues,
  activeCueIndex,
  fmtTime,
  type Cue,
  type Word,
} from "@/lib/cues";
import { exportCaptionedVideo, downloadBlob } from "@/lib/export-video";
import { cn } from "@/lib/utils";

type Plan = "free" | "pro" | "ultra";

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
}: {
  plan?: Plan;
  initialProject?: InitialProject | null;
}) {
  const [isNarrow, setIsNarrow] = React.useState(false);
  const [proceedMobile, setProceedMobile] = React.useState(false);

  React.useEffect(() => {
    const check = () => setIsNarrow(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (isNarrow && !proceedMobile) {
    return (
      <div className="min-h-screen flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-md rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-7 text-center">
          <div className="mx-auto inline-flex size-14 items-center justify-center rounded-2xl bg-[var(--color-brand)]/15 text-[var(--color-brand)]">
            <Monitor className="size-7" />
          </div>
          <h1 className="heading mt-5 text-2xl">Best on desktop.</h1>
          <p className="mt-3 text-sm text-[var(--color-fg-muted)] leading-relaxed">
            The Capto editor uses a real timeline with word-level precision. It works on a
            phone, but you will have a much better time on a laptop or desktop.
          </p>
          <div className="mt-7 space-y-2">
            <Button onClick={() => setProceedMobile(true)} variant="secondary" size="md" className="w-full">
              <Smartphone className="size-4" />
              Continue on mobile anyway
            </Button>
            <Button href="/dashboard" variant="ghost" size="md" className="w-full">
              <ArrowLeft className="size-4" />
              Back to dashboard
            </Button>
          </div>
          <div className="mt-5 flex items-center justify-center">
            <PoweredByContles variant="chip" />
          </div>
        </div>
      </div>
    );
  }

  return <Editor plan={plan} initialProject={initialProject} />;
}

function Editor({ plan, initialProject }: { plan: Plan; initialProject: InitialProject | null }) {
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
  const [language, setLanguage] = React.useState(initialProject?.state?.language ?? "auto");

  const [projectId, setProjectId] = React.useState<string | null>(initialProject?.id ?? null);
  const [projectName, setProjectName] = React.useState(initialProject?.name ?? "Untitled project");

  const [playing, setPlaying] = React.useState(false);
  const [time, setTime] = React.useState(0);
  const [tab, setTab] = React.useState<"captions" | "style">("captions");

  const [transcribing, setTranscribing] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [exporting, setExporting] = React.useState(false);
  const [exportPct, setExportPct] = React.useState(0);
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [capReached, setCapReached] = React.useState(false);

  const preset = getPreset(presetId);
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

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) loadFile(f, needsRelink);
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f && f.type.startsWith("video/")) loadFile(f, needsRelink);
  };

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
    drawCaption({ ctx, cue: idx >= 0 ? cues[idx] : null, t, preset, width: W, height: H, pos });
    if (plan === "free") drawWatermark(ctx, W, H);
  }, [cues, preset, pos, plan]);

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
    try {
      const fd = new FormData();
      fd.append("file", fileObj, fileObj.name);
      fd.append("language", language);
      const res = await fetch("/api/transcribe", { method: "POST", body: fd });
      const data = (await res.json()) as { words?: Word[]; error?: string; detail?: string };
      if (!res.ok) throw new Error(data.error || "Transcription failed.");
      const words = data.words || [];
      if (!words.length) throw new Error("No speech detected in this clip.");
      const c = wordsToCues(words, { totalDuration: meta?.dur ?? Infinity });
      setCues(c);
      setTab("captions");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Transcription failed.");
    } finally {
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
        const words: Word[] =
          parts.length > 0
            ? parts.map((w, i) => ({
                word: w,
                start: c.start + (span * i) / parts.length,
                end: c.start + (span * (i + 1)) / parts.length,
              }))
            : c.words;
        return { ...c, text, words };
      }),
    );
  };

  const deleteCue = (id: string) => setCues((prev) => prev.filter((c) => c.id !== id));

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
    language,
    cues,
  });

  const saveProject = async () => {
    setSaving(true);
    setSaved(false);
    setErr(null);
    try {
      const payload = {
        name: projectName,
        durationSec: meta?.dur,
        state: buildState(),
      };
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
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save the project.");
    } finally {
      setSaving(false);
    }
  };

  // ── export ────────────────────────────────────────────────────────────────
  const runExport = async () => {
    if (!src || !cues.length) return;
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
        watermark,
        maxEdge: plan === "ultra" ? 3840 : 1920,
        onProgress: (f) => setExportPct(Math.round(f * 100)),
      });
      const base = (projectName || "capto").replace(/[^\w-]+/g, "-").toLowerCase();
      downloadBlob(blob, `${base}-captioned.${ext}`);
    } catch (e) {
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
          <Button
            onClick={runExport}
            variant="primary"
            size="sm"
            disabled={!cues.length || exporting}
            loading={exporting}
          >
            <Download className="size-4" />
            {exporting ? `Exporting ${exportPct}%` : "Export"}
          </Button>
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
                onClick={() => fileInputRef.current?.click()}
                onDrop={onDrop}
                relink={needsRelink}
                expectedName={expectedName}
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
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-black transition-transform hover:scale-105 active:scale-95"
                >
                  {playing ? <Pause className="size-4" /> : <Play className="size-4 translate-x-px" />}
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
        <aside className="hidden w-[340px] shrink-0 flex-col border-l border-[var(--color-border)] bg-[var(--color-bg-elev)]/40 lg:flex">
          {/* tabs */}
          <div className="flex shrink-0 items-center gap-1 border-b border-[var(--color-border)] p-2">
            <TabBtn active={tab === "captions"} onClick={() => setTab("captions")} icon={<ListVideo className="size-4" />}>
              Captions
            </TabBtn>
            <TabBtn active={tab === "style"} onClick={() => setTab("style")} icon={<Type className="size-4" />}>
              Style
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

            {tab === "captions" ? (
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
              />
            ) : (
              <StylePanel presetId={presetId} onPreset={setPresetId} pos={pos} onPos={setPos} />
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
    </div>
  );
}

// ── sub-components ──────────────────────────────────────────────────────────

function Dropzone({
  onClick,
  onDrop,
  relink,
  expectedName,
}: {
  onClick: () => void;
  onDrop: (e: React.DragEvent) => void;
  relink: boolean;
  expectedName?: string;
}) {
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
        Choose file
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
        "inline-flex flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium transition-colors",
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
        <select
          value={language}
          onChange={(e) => onLanguage(e.target.value)}
          className="mb-4 w-full rounded-[var(--radius-md)] border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none focus:border-white/25"
        >
          {LANGS.map(([v, l]) => (
            <option key={v} value={v} className="bg-[var(--color-bg-elev)]">
              {l}
            </option>
          ))}
        </select>
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
          Powered by Whisper large-v3 on Groq. Uses your key from Settings, or our managed key.
          Best with clips under a couple of minutes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
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
              className="text-[var(--color-fg-subtle)] opacity-0 transition-opacity hover:text-[var(--color-danger)] group-hover:opacity-100"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
          <input
            value={c.text}
            onChange={(e) => onEdit(c.id, e.target.value)}
            className="mt-1 w-full bg-transparent text-sm text-white outline-none"
            spellCheck={false}
          />
        </div>
      ))}
    </div>
  );
}

function StylePanel({
  presetId,
  onPreset,
  pos,
  onPos,
}: {
  presetId: string;
  onPreset: (id: string) => void;
  pos: Pos;
  onPos: (p: Pos) => void;
}) {
  return (
    <div>
      <label className="eyebrow mb-2 block">Caption style</label>
      <div className="grid grid-cols-2 gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => onPreset(p.id)}
            className={cn(
              "relative flex h-16 items-center justify-center rounded-[var(--radius-md)] border px-2 text-center transition-colors",
              presetId === p.id
                ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)]"
                : "border-white/[0.08] bg-white/[0.02] hover:border-white/20",
            )}
          >
            <span
              className="text-sm font-bold text-white"
              style={{ fontWeight: p.fontWeight, textTransform: p.caseMode === "upper" ? "uppercase" : "none" }}
            >
              {p.name}
            </span>
            {p.popular && (
              <span className="absolute -top-1.5 right-1.5 rounded-full bg-white px-1.5 text-[9px] font-semibold text-black">
                default
              </span>
            )}
          </button>
        ))}
      </div>

      <label className="eyebrow mb-2 mt-6 block">Vertical position</label>
      <input
        type="range"
        min={0.4}
        max={0.92}
        step={0.01}
        value={pos.y}
        onChange={(e) => onPos({ ...pos, y: parseFloat(e.target.value) })}
        className="w-full accent-[var(--color-brand)]"
      />
      <div className="mt-1 flex justify-between text-[10px] text-[var(--color-fg-subtle)]">
        <span>Higher</span>
        <span>Lower</span>
      </div>
    </div>
  );
}
