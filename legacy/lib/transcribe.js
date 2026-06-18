// Transcription engine dispatch. Returns a flat, normalized word list:
//   { words: [{word, start, end}], language }
// Engines: 'local' (faster-whisper, default), 'groq' (free online, large-v3),
//          'openai' (paid). Chosen per-request, falling back to env default.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const execFileP = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// Which engines are actually usable right now (keys present / local installed)?
export function availableEngines() {
  return {
    local: fs.existsSync(path.join(ROOT, '.venv', 'bin', 'python')),
    groq: Boolean(process.env.GROQ_API_KEY),
    openai: Boolean(process.env.OPENAI_API_KEY),
  };
}

// Hosted engines only accept their own model names. The UI's `model` field
// is for the local Whisper picker (tiny/base/small/medium/large-v3) — ignore
// it for hosted engines unless it's clearly a hosted model name.
const HOSTED_MODELS = {
  groq:   { default: 'whisper-large-v3', allowed: ['whisper-large-v3', 'whisper-large-v3-turbo'] },
  openai: { default: 'whisper-1',        allowed: ['whisper-1'] },
};

export async function transcribe(audioPath, opts = {}) {
  const engine = (opts.engine || process.env.TRANSCRIBE_ENGINE || 'local').toLowerCase();
  const language = opts.language && opts.language !== 'auto' ? opts.language : null;

  if (engine === 'groq' || engine === 'openai') {
    const cfg = HOSTED_MODELS[engine];
    const model = cfg.allowed.includes(opts.model) ? opts.model : cfg.default;
    const isGroq = engine === 'groq';
    return transcribeHosted(audioPath, language, {
      url: isGroq ? 'https://api.groq.com/openai/v1/audio/transcriptions'
                  : 'https://api.openai.com/v1/audio/transcriptions',
      key: isGroq ? process.env.GROQ_API_KEY : process.env.OPENAI_API_KEY,
      keyName: isGroq ? 'GROQ_API_KEY' : 'OPENAI_API_KEY',
      model, engineName: isGroq ? 'Groq' : 'OpenAI',
    });
  }
  return transcribeLocal(audioPath, language, opts.model || null);
}

// ---- Local: faster-whisper via Python -----------------------------------
function localPython() {
  const venv = path.join(ROOT, '.venv', 'bin', 'python');
  return fs.existsSync(venv) ? venv : 'python3';
}

async function transcribeLocal(audioPath, language, model) {
  const py = localPython();
  const script = path.join(ROOT, 'transcribe.py');
  const whModel = model || process.env.WHISPER_MODEL || 'small';

  let stdout;
  try {
    ({ stdout } = await execFileP(py, [script, audioPath], {
      maxBuffer: 1024 * 1024 * 64,
      env: { ...process.env, WHISPER_MODEL: whModel, WHISPER_LANGUAGE: language || '' },
    }));
  } catch (err) {
    const msg = (err.stderr || err.message || '').toString();
    if (/No module named ['"]?faster_whisper/.test(msg)) {
      throw new Error('Local Whisper is not installed yet. Run ./setup-local-whisper.sh once, or pick the Groq (free online) engine.');
    }
    throw new Error('Local transcription failed: ' + msg.slice(-1500));
  }

  const data = JSON.parse(stdout);
  const words = [];
  for (const seg of data.segments || []) {
    if (seg.words && seg.words.length) {
      for (const w of seg.words) words.push({ word: w.word, start: w.start, end: w.end });
    } else if (seg.text?.trim()) {
      words.push({ word: seg.text.trim(), start: seg.start, end: seg.end });
    }
  }
  return { words, language: data.language || 'en' };
}

// ---- Hosted OpenAI-compatible (OpenAI / Groq) ---------------------------
async function transcribeHosted(audioPath, language, { url, key, keyName, model, engineName }) {
  if (!key) throw new Error(`${engineName} engine selected but ${keyName} is not set in .env.`);

  const buf = fs.readFileSync(audioPath);
  const form = new FormData();
  // MIME and filename derived from the actual file extension so the API
  // routes to the right decoder (m4a for hosted = much smaller files).
  const ext = (audioPath.split('.').pop() || 'm4a').toLowerCase();
  const mime = ext === 'wav' ? 'audio/wav' : ext === 'mp3' ? 'audio/mpeg' : 'audio/mp4';
  form.append('file', new Blob([buf], { type: mime }), `audio.${ext}`);
  form.append('model', model);
  form.append('response_format', 'verbose_json');
  form.append('timestamp_granularities[]', 'word');
  form.append('timestamp_granularities[]', 'segment');
  if (language) form.append('language', language);

  const res = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: form });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`${engineName} transcription failed (${res.status}): ${t.slice(0, 800)}`);
  }
  const data = await res.json();
  let words = [];
  if (Array.isArray(data.words) && data.words.length) {
    words = data.words.map((w) => ({ word: w.word, start: w.start, end: w.end }));
  } else if (Array.isArray(data.segments)) {
    words = data.segments.map((s) => ({ word: (s.text || '').trim(), start: s.start, end: s.end }));
  }
  return { words, language: data.language || language || 'en' };
}
