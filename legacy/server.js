import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

import { probe, extractAudio, burnSubtitles, FFMPEG } from './lib/ffmpeg.js';
import { transcribe, availableEngines } from './lib/transcribe.js';
import { buildAss, wordsToCues } from './lib/ass.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS = path.join(__dirname, 'uploads');
const OUTPUTS = path.join(__dirname, 'outputs');
const PROJECTS = path.join(OUTPUTS, 'projects');
const FONTS = path.join(__dirname, 'fonts');
for (const d of [UPLOADS, OUTPUTS, PROJECTS, FONTS]) fs.mkdirSync(d, { recursive: true });

const app = express();
app.use(express.json({ limit: '50mb' }));
// Force no-cache on every response — WKWebView aggressively caches otherwise,
// which means JS/CSS updates don't reach the user until Subby.app is fully restarted.
app.use((_req, res, next) => { res.set('Cache-Control', 'no-store, no-cache, must-revalidate'); next(); });
app.use(express.static(path.join(__dirname, 'public'), { etag: false, lastModified: false, maxAge: 0 }));
app.use('/fonts', express.static(FONTS));

// ---- project persistence -------------------------------------------------
const projects = new Map(); // id -> project
function projectFile(id) { return path.join(PROJECTS, `${id}.json`); }
async function saveProject(p) {
  projects.set(p.id, p);
  // Defensive: the directory may have been removed (cleanup, disk swap) since boot
  await fsp.mkdir(PROJECTS, { recursive: true });
  await fsp.writeFile(projectFile(p.id), JSON.stringify(p, null, 2));
}
async function loadProjects() {
  for (const f of fs.readdirSync(PROJECTS).filter((f) => f.endsWith('.json'))) {
    try {
      const p = JSON.parse(await fsp.readFile(path.join(PROJECTS, f), 'utf8'));
      if (fs.existsSync(p.path)) projects.set(p.id, p);
    } catch { /* ignore corrupt */ }
  }
}

app.get('/api/health', (_req, res) => res.json({
  ok: true,
  defaultEngine: (process.env.TRANSCRIBE_ENGINE || 'local'),
  engines: availableEngines(),
  defaultModel: process.env.WHISPER_MODEL || 'small',
}));

// Update API keys in .env from the Settings UI. We rewrite the file line-by-line
// so existing user comments / settings are preserved, then reload process.env.
const ENV_PATH = path.join(__dirname, '.env');
app.post('/api/settings/keys', async (req, res) => {
  try {
    const updates = {};
    if (typeof req.body.GROQ_API_KEY === 'string') updates.GROQ_API_KEY = req.body.GROQ_API_KEY.trim();
    if (typeof req.body.OPENAI_API_KEY === 'string') updates.OPENAI_API_KEY = req.body.OPENAI_API_KEY.trim();
    if (typeof req.body.CUSTOM_API_KEY === 'string')   updates.CUSTOM_API_KEY = req.body.CUSTOM_API_KEY.trim();
    if (typeof req.body.CUSTOM_API_URL === 'string')   updates.CUSTOM_API_URL = req.body.CUSTOM_API_URL.trim();
    if (typeof req.body.CUSTOM_API_MODEL === 'string') updates.CUSTOM_API_MODEL = req.body.CUSTOM_API_MODEL.trim();
    if (typeof req.body.TRANSCRIBE_ENGINE === 'string') updates.TRANSCRIBE_ENGINE = req.body.TRANSCRIBE_ENGINE.trim();
    if (typeof req.body.WHISPER_MODEL === 'string') updates.WHISPER_MODEL = req.body.WHISPER_MODEL.trim();

    let txt = '';
    try { txt = await fsp.readFile(ENV_PATH, 'utf8'); } catch {}
    const lines = txt.split('\n');
    const written = new Set();
    const newLines = lines.map((line) => {
      const m = line.match(/^\s*([A-Z_]+)\s*=/);
      if (m && Object.prototype.hasOwnProperty.call(updates, m[1])) { written.add(m[1]); return `${m[1]}=${updates[m[1]]}`; }
      return line;
    });
    for (const k of Object.keys(updates)) if (!written.has(k)) newLines.push(`${k}=${updates[k]}`);
    await fsp.writeFile(ENV_PATH, newLines.join('\n'));

    // reload process.env so the change takes effect without a restart
    for (const k of Object.keys(updates)) process.env[k] = updates[k];
    res.json({ ok: true, engines: availableEngines() });
  } catch (err) {
    res.status(500).json({ error: String(err.message || err) });
  }
});

// Returns booleans only (never the actual key) so the UI can show "key is set" without revealing it.
app.get('/api/settings/keys', (_req, res) => res.json({
  groqSet: Boolean(process.env.GROQ_API_KEY),
  openaiSet: Boolean(process.env.OPENAI_API_KEY),
}));

// ---- upload --------------------------------------------------------------
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    // re-create on each upload in case the dir was wiped externally
    fs.mkdirSync(UPLOADS, { recursive: true });
    cb(null, UPLOADS);
  },
  filename: (_req, file, cb) => {
    const id = crypto.randomUUID();
    const ext = (path.extname(file.originalname) || '.mp4').toLowerCase();
    cb(null, `${id}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 2 * 1024 * 1024 * 1024 } });

app.post('/api/projects', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No video uploaded.' });
    const id = path.basename(req.file.filename, path.extname(req.file.filename));
    const meta = await probe(req.file.path);
    if (!meta.width || !meta.height) {
      await fsp.unlink(req.file.path).catch(() => {});
      return res.status(400).json({ error: 'Could not read that file as a video.' });
    }
    const project = {
      id,
      originalName: req.file.originalname,
      path: req.file.path,
      ext: path.extname(req.file.filename),
      meta,
      cues: null,
      style: defaultStyle(meta),
      createdAt: new Date().toISOString(),
    };
    await saveProject(project);
    res.json({ id, meta, originalName: project.originalName, style: project.style });
  } catch (err) {
    res.status(500).json({ error: String(err.message || err) });
  }
});

function defaultStyle(meta) {
  const H = meta.height || 1920;
  const fontSize = Math.round(H * 0.058);
  return {
    fontFamily: 'Inter',
    fontSize,
    weight: 700,                                 // custom numeric weight 300–900
    italic: false,
    lineHeight: 1.1,                             // multi-line caption line spacing
    caseMode: 'sentence',                       // lower | sentence | title | upper
    primaryColor: '#FFFFFF',
    letterSpacing: -Math.round(fontSize * 0.06), // ~ -6%
    outlineWidth: 0,
    outlineColor: '#000000',
    shadowEnabled: true,
    shadowColor: '#000000',
    shadowOpacity: 60,
    shadowDistance: Math.max(2, Math.round(H * 0.0025)),
    shadowBlur: Math.max(2, Math.round(H * 0.0035)),
    highlightEnabled: false,
    highlightColor: '#C4B5FD',
    highlightScale: 100,
    posX: 0.5,
    posY: 0.82,
    entrance: 'none',  // off by default — feels snappier, on-point
    exit: 'none',
    animMs: 180,       // kept for when the user enables fade/pop/slide
  };
}

// ---- video streaming (range support for scrubbing) -----------------------
app.get('/api/projects/:id/video', (req, res) => {
  const p = projects.get(req.params.id);
  if (!p || !fs.existsSync(p.path)) return res.status(404).end();
  res.sendFile(p.path);
});

// Lower-resolution playback proxy so high-res (e.g. 4K) videos don't stutter in
// the preview. Cached per (project, height). Export still uses the original file.
const PROXIES = path.join(OUTPUTS, 'proxies');
const proxyLocks = new Map();
app.get('/api/projects/:id/preview/:h', async (req, res) => {
  const p = projects.get(req.params.id);
  if (!p || !fs.existsSync(p.path)) return res.status(404).end();
  const h = Math.max(240, Math.min(1080, parseInt(req.params.h, 10) || 720));
  await fsp.mkdir(PROXIES, { recursive: true });
  const out = path.join(PROXIES, `${p.id}-${h}.mp4`);
  if (!fs.existsSync(out)) {
    if (!proxyLocks.has(out)) {
      proxyLocks.set(out, (async () => {
        const { execFile } = await import('node:child_process');
        const { promisify } = await import('node:util');
        const exec = promisify(execFile);
        await exec(FFMPEG, ['-y', '-i', p.path, '-vf', `scale=-2:${h}`, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '28', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', out], { maxBuffer: 1024 * 1024 * 32 });
      })().catch(() => {}).finally(() => proxyLocks.delete(out)));
    }
    await proxyLocks.get(out);
  }
  if (!fs.existsSync(out)) return res.status(500).end();
  res.sendFile(out);
});

// List every saved project — used by the home view
app.get('/api/projects', (_req, res) => {
  const list = [...projects.values()]
    .filter((p) => fs.existsSync(p.path))
    .map((p) => {
      const st = (() => { try { return fs.statSync(p.path); } catch { return null; } })();
      return {
        id: p.id,
        name: p.originalName || 'video',
        width: p.meta?.width || 0,
        height: p.meta?.height || 0,
        duration: p.meta?.duration || 0,
        cueCount: Array.isArray(p.cues) ? p.cues.length : 0,
        language: p.language || null,
        createdAt: p.createdAt || (st?.birthtime?.toISOString?.()),
        updatedAt: st?.mtime?.toISOString?.(),
        size: st?.size || 0,
      };
    })
    .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  res.json(list);
});

app.get('/api/projects/:id', async (req, res) => {
  const p = projects.get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  // Re-probe once so older projects pick up corrected (rotation-aware) dimensions.
  if (!p._reprobed && fs.existsSync(p.path)) {
    try {
      const fresh = await probe(p.path);
      if (fresh.width && fresh.height) {
        const oldH = p.meta?.height || fresh.height;
        // If rotation correction changed the height, rescale font-size-like style
        // props so captions keep their visual proportion on the corrected canvas.
        if (p.style && oldH && Math.abs(fresh.height - oldH) > 2) {
          const k = fresh.height / oldH;
          for (const key of ['fontSize', 'letterSpacing', 'shadowDistance', 'shadowBlur', 'outlineWidth']) {
            if (typeof p.style[key] === 'number') p.style[key] = Math.round(p.style[key] * k * 100) / 100;
          }
        }
        p.meta = { ...p.meta, ...fresh }; p._reprobed = true; await saveProject(p);
      }
    } catch {}
  }
  res.json({ id: p.id, meta: p.meta, originalName: p.originalName, cues: p.cues, style: p.style });
});

// Generate a JPEG thumbnail from the middle frame of the video (cached on disk)
const THUMBS = path.join(OUTPUTS, 'thumbs');
app.get('/api/projects/:id/thumb', async (req, res) => {
  const p = projects.get(req.params.id);
  if (!p || !fs.existsSync(p.path)) return res.status(404).end();
  await fsp.mkdir(THUMBS, { recursive: true });
  const out = path.join(THUMBS, `${p.id}.jpg`);
  if (!fs.existsSync(out)) {
    const t = Math.max(0.1, (p.meta?.duration || 1) * 0.4);
    try {
      const { execFile } = await import('node:child_process');
      const { promisify } = await import('node:util');
      const exec = promisify(execFile);
      await exec(FFMPEG, ['-y', '-ss', String(t), '-i', p.path, '-frames:v', '1', '-vf', 'scale=480:-2', out], { maxBuffer: 1024 * 1024 * 16 });
    } catch (err) {
      return res.status(500).json({ error: String(err.message || err) });
    }
  }
  res.sendFile(out);
});

// Rename a project (just the displayed name; the on-disk video stays put)
app.patch('/api/projects/:id', async (req, res) => {
  const p = projects.get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  if (typeof req.body.name === 'string' && req.body.name.trim()) p.originalName = req.body.name.trim().slice(0, 200);
  await saveProject(p);
  res.json({ ok: true, name: p.originalName });
});

// Delete a project + its video + json + thumb
app.delete('/api/projects/:id', async (req, res) => {
  const p = projects.get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  await fsp.unlink(p.path).catch(() => {});
  await fsp.unlink(projectFile(p.id)).catch(() => {});
  await fsp.unlink(path.join(THUMBS, `${p.id}.jpg`)).catch(() => {});
  projects.delete(p.id);
  res.json({ ok: true });
});

// ---- transcribe ----------------------------------------------------------
app.post('/api/projects/:id/transcribe', async (req, res) => {
  const p = projects.get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  try {
    if (!p.meta.hasAudio) return res.status(400).json({ error: 'This video has no audio track to transcribe.' });
    const langChoice = (req.body && req.body.language) || 'auto';
    const engine = (req.body && req.body.engine) || process.env.TRANSCRIBE_ENGINE || 'local';
    const model = (req.body && req.body.model) || undefined;
    // Hosted engines get tiny m4a so long videos fit under the API size cap.
    // Local engine gets raw WAV (faster-whisper prefers it, no internet limit).
    const ext = (engine === 'local') ? 'wav' : 'm4a';
    const audioPath = path.join(UPLOADS, `${p.id}.${ext}`);
    await extractAudio(p.path, audioPath);
    const { words, language } = await transcribe(audioPath, { language: langChoice, engine, model });
    await fsp.unlink(audioPath).catch(() => {});
    if (!words.length) return res.status(422).json({ error: 'No speech detected in the video.' });
    const cues = wordsToCues(words, { totalDuration: p.meta.duration || Infinity });
    p.cues = cues;
    p.language = language;
    p.langChoice = langChoice;
    await saveProject(p);
    res.json({ cues, language });
  } catch (err) {
    res.status(500).json({ error: String(err.message || err) });
  }
});

// ---- save edits ----------------------------------------------------------
app.put('/api/projects/:id', async (req, res) => {
  const p = projects.get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  if (Array.isArray(req.body.cues)) p.cues = req.body.cues;
  if (req.body.style && typeof req.body.style === 'object') p.style = { ...p.style, ...req.body.style };
  await saveProject(p);
  res.json({ ok: true });
});

// ---- export (async job with progress) ------------------------------------
const jobs = new Map(); // jobId -> { status, progress, downloadUrl, error }
const QUALITY = {
  friend:   { crf: 30, preset: 'veryfast', scaleMax: 720,  audioKbps: 96 },  // small, Discord-friendly
  high:     { crf: 20, preset: 'medium',   scaleMax: null, audioKbps: null }, // copy audio
  lossless: { crf: 14, preset: 'slow',     scaleMax: null, audioKbps: null }, // near-lossless (default)
};

app.post('/api/projects/:id/export', async (req, res) => {
  const p = projects.get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });

  const cues = Array.isArray(req.body.cues) ? req.body.cues : p.cues;
  const style = { ...p.style, ...(req.body.style || {}) };
  if (!cues || !cues.length) return res.status(400).json({ error: 'No captions to burn in.' });

  // Re-probe so the .ass canvas matches the DISPLAY dimensions (fixes rotated
  // phone videos whose stored meta was the pre-rotation landscape size).
  try {
    const fresh = await probe(p.path);
    if (fresh.width && fresh.height) p.meta = { ...p.meta, ...fresh };
  } catch {}

  // persist latest edits
  p.cues = cues; p.style = style; await saveProject(p);

  const q = QUALITY[req.body.quality] || QUALITY.lossless;
  const jobId = crypto.randomUUID();
  jobs.set(jobId, { status: 'running', progress: 0 });
  res.json({ jobId });

  (async () => {
    try {
      const jobDir = path.join(OUTPUTS, `job-${jobId}`);
      await fsp.mkdir(jobDir, { recursive: true });
      const assPath = path.join(jobDir, 'subs.ass');
      await fsp.writeFile(assPath, buildAss(cues, style, p.meta));

      const outName = `${sanitize(p.originalName)}-captioned.mp4`;
      const outPath = path.join(OUTPUTS, `${jobId}-${outName}`);

      await burnSubtitles({
        input: p.path,
        assPath,
        fontsDir: FONTS,
        output: outPath,
        durationSec: p.meta.duration,
        crf: q.crf,
        preset: q.preset,
        scaleMax: q.scaleMax,
        audioKbps: q.audioKbps,
      }, (frac) => {
        const j = jobs.get(jobId); if (j) j.progress = frac;
      });

      await fsp.rm(jobDir, { recursive: true, force: true });

      // Save the finished file directly into the user's chosen folder (default Desktop).
      let savedPath = outPath;
      try {
        const dir = resolveExportDir(req.body.outDir);
        await fsp.mkdir(dir, { recursive: true });
        savedPath = uniquePath(path.join(dir, outName));
        await fsp.copyFile(outPath, savedPath);
        await fsp.unlink(outPath).catch(() => {});
      } catch (e) {
        // If we can't write to the chosen folder, keep the file in OUTPUTS as a fallback.
        savedPath = outPath;
      }

      jobs.set(jobId, {
        status: 'done', progress: 1,
        downloadUrl: `/api/download/${jobId}`,
        fileName: outName,
        savedPath,
        _path: savedPath,
      });
    } catch (err) {
      jobs.set(jobId, { status: 'error', error: String(err.message || err) });
    }
  })();
});

// ---- export folder handling ----------------------------------------------
function resolveExportDir(outDir) {
  if (outDir && typeof outDir === 'string') {
    return outDir.startsWith('~') ? path.join(os.homedir(), outDir.slice(1)) : outDir;
  }
  return process.env.SUBBY_EXPORT_DIR || path.join(os.homedir(), 'Desktop');
}
function uniquePath(p) {
  if (!fs.existsSync(p)) return p;
  const ext = path.extname(p), base = p.slice(0, -ext.length);
  let i = 2; while (fs.existsSync(`${base} ${i}${ext}`)) i++;
  return `${base} ${i}${ext}`;
}

// Native folder picker (macOS). Returns the chosen POSIX path.
app.get('/api/pick-folder', async (_req, res) => {
  try {
    const { execFile } = await import('node:child_process');
    const { promisify } = await import('node:util');
    const exec = promisify(execFile);
    const { stdout } = await exec('osascript', ['-e', 'POSIX path of (choose folder with prompt "Choose where to save your video")']);
    res.json({ path: stdout.trim() });
  } catch (err) {
    // user cancelled or no osascript
    res.json({ path: null });
  }
});

// Reveal a saved file (or folder) in Finder.
app.get('/api/reveal', async (req, res) => {
  try {
    const target = req.query.path;
    if (!target || !fs.existsSync(target)) return res.status(404).json({ error: 'Not found' });
    const { execFile } = await import('node:child_process');
    execFile('open', ['-R', target], () => {}); // -R reveals the file in its folder
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: String(err.message || err) }); }
});

// Remember the last export folder.
app.get('/api/settings/export-dir', (_req, res) => res.json({ dir: resolveExportDir() }));
app.post('/api/settings/export-dir', (req, res) => {
  if (req.body && typeof req.body.dir === 'string') process.env.SUBBY_EXPORT_DIR = req.body.dir;
  res.json({ dir: resolveExportDir() });
});

app.get('/api/jobs/:jobId', (req, res) => {
  const j = jobs.get(req.params.jobId);
  if (!j) return res.status(404).json({ error: 'Not found' });
  const { _path, ...pub } = j;
  res.json(pub);
});

app.get('/api/download/:jobId', (req, res) => {
  const j = jobs.get(req.params.jobId);
  if (!j || j.status !== 'done' || !fs.existsSync(j._path)) return res.status(404).end();
  res.download(j._path, j.fileName);
});

function sanitize(name) {
  return (name || 'video').replace(/\.[^.]+$/, '').replace(/[^\w.-]+/g, '_').slice(0, 60) || 'video';
}

// ---- boot ----------------------------------------------------------------
const PORT = process.env.PORT || 5050;
await loadProjects();
app.listen(PORT, () => {
  const engine = (process.env.TRANSCRIBE_ENGINE || 'local').toLowerCase();
  const eng = availableEngines();
  console.log(`\n  ✨  Subby running:  http://localhost:${PORT}`);
  console.log(`      default engine: ${engine}${engine === 'local' ? ` (model: ${process.env.WHISPER_MODEL || 'small'})` : ''}`);
  console.log(`      engines ready: local=${eng.local} groq=${eng.groq} openai=${eng.openai}\n`);
});
