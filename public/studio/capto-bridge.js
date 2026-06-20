'use strict';
/*
 * Capto web bridge for the original Subby editor.
 *
 * Subby was a local Node app: the browser uploaded the video to a server that
 * stored it, ran Whisper/ffmpeg, and streamed it back. Capto's model is the
 * opposite — the video NEVER leaves the device, transcription goes through a
 * Groq proxy, and export happens in the browser. This shim keeps app.js
 * verbatim and only swaps its data layer: it overrides window.fetch for the
 * /api/* routes app.js calls and answers them client-side.
 *
 * Loaded BEFORE app.js so the override is active when init() calls /api/health.
 */
(function () {
  const realFetch = window.fetch.bind(window);

  // The currently-loaded clip. The <video> plays this object URL directly
  // (see the previewSrc() patch in app.js), and transcription posts this File
  // to Capto's Groq proxy.
  window.__captoMedia = null; // { id, file, url, meta }

  const LS_KEY = 'capto-studio-projects';
  const loadStore = () => { try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch { return {}; } };
  const saveStore = (s) => { try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch { /* quota */ } };

  const json = (obj, status = 200) =>
    new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
  const genId = () => 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  // Read width/height/duration from the File locally (no upload).
  function readVideoMeta(file) {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const v = document.createElement('video');
      v.preload = 'metadata';
      v.muted = true;
      v.onloadedmetadata = () => resolve({ url, meta: { width: v.videoWidth || 1080, height: v.videoHeight || 1920, duration: v.duration || 0 } });
      v.onerror = () => resolve({ url, meta: { width: 1080, height: 1920, duration: 0 } });
      v.src = url;
    });
  }

  // Mirrors Subby's server-side defaultStyle(meta) exactly.
  function defaultStyle(meta) {
    const H = meta.height || 1920;
    const fontSize = Math.round(H * 0.058);
    return {
      fontFamily: 'Inter', fontSize, weight: 700, italic: false, lineHeight: 1.1, caseMode: 'sentence',
      primaryColor: '#FFFFFF', letterSpacing: -Math.round(fontSize * 0.06),
      outlineWidth: 0, outlineColor: '#000000',
      shadowEnabled: true, shadowColor: '#000000', shadowOpacity: 60,
      shadowDistance: Math.max(2, Math.round(H * 0.0025)), shadowBlur: Math.max(2, Math.round(H * 0.0035)),
      highlightEnabled: false, highlightColor: '#C4B5FD', highlightScale: 100,
      posX: 0.5, posY: 0.82, entrance: 'none', exit: 'none', animMs: 180,
    };
  }

  // Capto's /api/transcribe returns flat word timings; Subby wants grouped cues.
  // Break into caption lines on pauses / max words / max chars (punchy chunks).
  function wordsToCues(words) {
    const MAXW = 7, MAXGAP = 0.6, MAXCHARS = 42;
    const out = [];
    let cur = null;
    for (const w of words || []) {
      const word = String(w.word || w.text || '').trim();
      if (!word) continue;
      const start = +w.start, end = +w.end;
      if (!cur) { cur = [{ word, start, end }]; continue; }
      const last = cur[cur.length - 1];
      const text = cur.map((x) => x.word).join(' ');
      if (start - last.end > MAXGAP || cur.length >= MAXW || text.length + word.length + 1 > MAXCHARS) {
        out.push(cur); cur = [{ word, start, end }];
      } else cur.push({ word, start, end });
    }
    if (cur) out.push(cur);
    return out.map((ws) => ({ start: ws[0].start, end: ws[ws.length - 1].end, text: ws.map((w) => w.word).join(' '), words: ws }));
  }

  async function transcribe(file, body) {
    const fd = new FormData();
    fd.append('file', file, file.name || 'clip');
    fd.append('language', body.language || 'auto');
    const dur = window.__captoMedia && window.__captoMedia.meta && window.__captoMedia.meta.duration;
    if (dur) fd.append('durationSec', String(Math.round(dur)));
    let res;
    try {
      res = await realFetch('/api/transcribe', { method: 'POST', body: fd });
    } catch {
      return json({ error: 'Network error reaching the caption engine.' }, 502);
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return json({ error: data.error || 'Transcription failed.' }, res.status);
    return json({ cues: wordsToCues(data.words), language: data.language || body.language });
  }

  window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    const path = url.replace(/^https?:\/\/[^/]+/, '').split('?')[0];
    if (!path.startsWith('/api/')) return realFetch(input, init);
    const method = ((init && init.method) || (input && input.method) || 'GET').toUpperCase();

    // engines/models — Capto runs managed Groq; local + OpenAI disabled here.
    if (path === '/api/health')
      return Promise.resolve(json({ engines: { local: false, groq: true, openai: false }, defaultEngine: 'groq', defaultModel: 'large-v3' }));

    // API keys + export dir are managed in Capto's account pages — no-op.
    if (path === '/api/settings/keys') return Promise.resolve(json({}));
    if (path === '/api/settings/export-dir') return Promise.resolve(json({ dir: '' }));

    // projects collection
    if (path === '/api/projects' && method === 'GET') {
      const store = loadStore();
      const list = Object.values(store)
        .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
        .map((p) => ({
          id: p.id, name: p.name || p.originalName, originalName: p.originalName,
          duration: (p.meta && p.meta.duration) || 0, width: p.meta && p.meta.width, height: p.meta && p.meta.height,
          cueCount: (p.cues || []).length, language: p.language, updatedAt: p.updatedAt,
        }));
      return Promise.resolve(json(list));
    }
    if (path === '/api/projects' && method === 'POST') {
      return (async () => {
        const body = init && init.body;
        const file = body instanceof FormData ? body.get('video') : null;
        if (!(file instanceof File)) return json({ error: 'No video provided.' }, 400);
        const { url, meta } = await readVideoMeta(file);
        const id = genId();
        const style = defaultStyle(meta);
        if (window.__captoMedia && window.__captoMedia.url) { try { URL.revokeObjectURL(window.__captoMedia.url); } catch {} }
        window.__captoMedia = { id, file, url, meta };
        const store = loadStore();
        store[id] = { id, originalName: file.name, name: file.name, meta, style, cues: [], language: 'en', updatedAt: new Date().toISOString() };
        saveStore(store);
        return json({ id, meta, originalName: file.name, style });
      })();
    }

    // single project (+ sub-routes)
    const m = path.match(/^\/api\/projects\/([^/]+)(\/.*)?$/);
    if (m) {
      const id = m[1];
      const sub = m[2] || '';
      const store = loadStore();

      if (sub === '/transcribe' && method === 'POST') {
        const file = window.__captoMedia && window.__captoMedia.id === id ? window.__captoMedia.file : null;
        let parsed = {}; try { parsed = JSON.parse(init.body); } catch {}
        if (!file) return Promise.resolve(json({ error: 'Re-open the clip to caption it.' }, 400));
        return transcribe(file, parsed);
      }
      if (sub === '/thumb') return Promise.resolve(new Response('', { status: 404 }));
      if (sub === '/video' || sub.startsWith('/preview/')) {
        if (window.__captoMedia && window.__captoMedia.url) return realFetch(window.__captoMedia.url);
        return Promise.resolve(new Response('', { status: 404 }));
      }
      if (sub === '/export' && method === 'POST')
        return Promise.resolve(json({ error: 'Web export is being finalized — your project is saved. Coming next.' }, 501));

      if (sub === '' && method === 'GET') {
        const p = store[id];
        if (!p) return Promise.resolve(json({ error: 'Project not found.' }, 404));
        return Promise.resolve(json({ meta: p.meta, originalName: p.originalName, style: p.style, cues: p.cues, language: p.language }));
      }
      if (sub === '' && (method === 'PUT' || method === 'PATCH')) {
        let body = {}; try { body = JSON.parse(init.body); } catch {}
        const p = store[id] || { id };
        Object.assign(p, body, { id, updatedAt: new Date().toISOString() });
        store[id] = p; saveStore(store);
        return Promise.resolve(json({ ok: true }));
      }
      if (sub === '' && method === 'DELETE') {
        delete store[id]; saveStore(store);
        return Promise.resolve(json({ ok: true }));
      }
    }

    // desktop-only endpoints (jobs/download/folder pickers) — not on web.
    if (/^\/api\/(jobs|download|pick-folder|reveal)/.test(path))
      return Promise.resolve(json({ error: 'unavailable' }, 501));

    // anything else under /api — let it hit Capto directly (carries cookies).
    return realFetch(input, init);
  };

  // The home "Settings" button jumps to Capto's account settings.
  document.addEventListener('DOMContentLoaded', () => {
    const s = document.getElementById('homeSettings');
    if (s) s.addEventListener('click', (e) => {
      e.preventDefault();
      try { window.top.location.href = '/settings'; } catch { window.location.href = '/settings'; }
    });
  });
})();
