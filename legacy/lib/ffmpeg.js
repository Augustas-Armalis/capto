// Thin wrappers around the bundled ffmpeg / ffprobe static binaries.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { spawn } from 'node:child_process';
import path from 'node:path';
import ffmpegStatic from 'ffmpeg-static';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const execFileP = promisify(execFile);

// Resolve a working ffprobe. The legacy `ffprobe-static` package ships a
// MISLABELED x86_64 binary in its darwin/arm64 folder, which posix_spawn rejects
// with errno -86 ("bad CPU type") on Apple Silicon Macs without Rosetta.
// Try @ffprobe-installer (arch-correct), then ffprobe-static, then $PATH.
function resolveFfprobe() {
  try { const m = require('@ffprobe-installer/ffprobe'); if (m?.path) return m.path; } catch {}
  try { const m = require('ffprobe-static'); if (m?.path) return m.path; } catch {}
  return 'ffprobe'; // last resort: rely on PATH (Homebrew, system install)
}

export const FFMPEG = ffmpegStatic;
export const FFPROBE = resolveFfprobe();

// Probe a media file -> { width, height, duration, fps, hasAudio, codec }
export async function probe(input) {
  const { stdout } = await execFileP(FFPROBE, [
    '-v', 'error',
    '-print_format', 'json',
    '-show_format',
    '-show_streams',
    input,
  ], { maxBuffer: 1024 * 1024 * 16 });

  const data = JSON.parse(stdout);
  const video = (data.streams || []).find((s) => s.codec_type === 'video');
  const audio = (data.streams || []).find((s) => s.codec_type === 'audio');

  let fps = 30;
  if (video?.avg_frame_rate && video.avg_frame_rate !== '0/0') {
    const [n, d] = video.avg_frame_rate.split('/').map(Number);
    if (d) fps = n / d;
  }

  // Rotation: phones store portrait clips as landscape + a 90/270° display flag.
  // ffmpeg applies the rotation on decode, so the DISPLAY dimensions are swapped.
  // We must report display dims so the .ass canvas matches the burned frame.
  let rot = 0;
  const sd = (video?.side_data_list || []).find((s) => typeof s.rotation === 'number');
  if (sd) rot = sd.rotation;
  else if (video?.tags?.rotate) rot = Number(video.tags.rotate);
  const swapped = Math.abs(rot % 180) === 90;

  let w = video ? Number(video.width) : 0;
  let h = video ? Number(video.height) : 0;
  if (swapped) { const t = w; w = h; h = t; }

  return {
    width: w,
    height: h,
    duration: Number(data.format?.duration || video?.duration || 0),
    fps: Math.round(fps * 1000) / 1000,
    rotation: rot,
    hasAudio: Boolean(audio),
    videoCodec: video?.codec_name || null,
    audioCodec: audio?.codec_name || null,
  };
}

// Extract mono 16kHz audio for transcription.
// Default: AAC/m4a (~8 KB/sec) — small enough that a 1-hr video stays well
// under hosted-API size limits. All Whisper variants accept m4a.
// Pass a .wav extension to get the legacy PCM format for local engines.
export async function extractAudio(input, outPath) {
  const isWav = String(outPath).toLowerCase().endsWith('.wav');
  const codec = isWav
    ? ['-c:a', 'pcm_s16le']
    : ['-c:a', 'aac', '-b:a', '64k', '-movflags', '+faststart'];
  await execFileP(FFMPEG, [
    '-y', '-i', input, '-vn',
    '-ac', '1', '-ar', '16000',
    ...codec,
    outPath,
  ], { maxBuffer: 1024 * 1024 * 16 });
  return outPath;
}

// Burn an ASS subtitle file into the video.
// Runs with cwd = dir(assPath) so the subtitles filter gets a simple,
// space-free relative filename and we never fight ffmpeg's filter escaping.
// onProgress(fraction 0..1) is called as encoding proceeds.
export function burnSubtitles({ input, assPath, fontsDir, output, durationSec, crf = 18, preset = 'medium', scaleMax = null, audioKbps = null }, onProgress) {
  const jobDir = path.dirname(assPath);
  const assName = path.basename(assPath);

  // fontsdir value lives inside the filtergraph; escape the chars libavfilter
  // treats specially. (macOS paths won't contain ':' or '\\' but be safe.)
  const escFonts = fontsDir.replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "\\'");
  // Burn subtitles at source resolution first (the .ass is authored for it),
  // then optionally scale the whole frame down for small "share" exports.
  let vf = `subtitles=${assName}:fontsdir=${escFonts}`;
  if (scaleMax) {
    vf += `,scale=w='if(gte(iw,ih),min(${scaleMax}\\,iw),-2)':h='if(gte(iw,ih),-2,min(${scaleMax}\\,ih))'`;
  }

  const audioArgs = audioKbps
    ? ['-c:a', 'aac', '-b:a', `${audioKbps}k`]
    : ['-c:a', 'copy'];

  const args = [
    '-y',
    '-i', path.resolve(input),
    '-vf', vf,
    '-c:v', 'libx264',
    '-preset', preset,
    '-crf', String(crf),
    '-pix_fmt', 'yuv420p',
    ...audioArgs,
    '-movflags', '+faststart',
    '-progress', 'pipe:1',
    '-nostats',
    path.resolve(output),
  ];

  return new Promise((resolve, reject) => {
    const proc = spawn(FFMPEG, args, { cwd: jobDir });
    let stderr = '';

    proc.stdout.on('data', (buf) => {
      const text = buf.toString();
      const m = [...text.matchAll(/out_time_ms=(\d+)/g)].pop();
      if (m && durationSec > 0 && onProgress) {
        const sec = Number(m[1]) / 1_000_000;
        onProgress(Math.min(0.99, sec / durationSec));
      }
    });
    proc.stderr.on('data', (buf) => { stderr += buf.toString(); });

    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) { onProgress?.(1); resolve(output); }
      else reject(new Error(`ffmpeg exited ${code}\n${stderr.slice(-4000)}`));
    });
  });
}
