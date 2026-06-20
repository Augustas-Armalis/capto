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

  // Plan + usage for the signed-in user (minutes indicator, export watermark).
  window.__captoUser = { signedIn: false, plan: 'free', watermark: true, minutes: null };
  async function fetchMe() {
    try {
      const r = await realFetch('/api/studio/me');
      if (r.ok) { window.__captoUser = await r.json(); renderQuotaUI(); }
    } catch { /* keep defaults */ }
  }

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
      highlightEnabled: false, highlightColor: '#A0C1FF', highlightScale: 100,
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

  // ───────────────────────── client-side export ─────────────────────────
  // Subby exported via server ffmpeg. On the web we burn captions in the
  // browser: draw each video frame + the active caption(s) onto a canvas with
  // Subby's exact style math, capture canvas+audio with MediaRecorder, and
  // download the result. Drives app.js's existing export-modal job flow.
  const jobs = {}; // jobId -> { status, progress, error }

  function pickExportMime() {
    const c = ['video/mp4;codecs=h264,aac', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
    for (const m of c) if (window.MediaRecorder && MediaRecorder.isTypeSupported(m)) return m;
    return 'video/webm';
  }
  function extFor(mime) { return mime.indexOf('mp4') >= 0 ? 'mp4' : 'webm'; }
  function downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 15000);
  }
  function applyCaseLocal(t, mode) {
    if (mode === 'lower') return String(t).toLocaleLowerCase();
    if (mode === 'upper') return String(t).toLocaleUpperCase();
    if (mode === 'title') return String(t).replace(/\S+/g, (w) => w.charAt(0).toLocaleUpperCase() + w.slice(1).toLocaleLowerCase());
    return t;
  }
  function hexALocal(hex, o) {
    const h = String(hex || '#000000').replace('#', '');
    return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${o})`;
  }
  function scaleStyle(s, k) {
    const out = Object.assign({}, s);
    for (const key of ['fontSize', 'letterSpacing', 'outlineWidth', 'shadowDistance', 'shadowBlur'])
      if (typeof s[key] === 'number') out[key] = s[key] * k;
    return out;
  }
  function drawWord(ctx, text, x, y, s, active) {
    const ow = s.outlineWidth || 0;
    const fill = active && s.highlightEnabled ? s.highlightColor : s.primaryColor;
    ctx.save();
    if (s.shadowEnabled) {
      ctx.shadowColor = hexALocal(s.shadowColor, (s.shadowOpacity == null ? 60 : s.shadowOpacity) / 100);
      ctx.shadowBlur = s.shadowBlur || 0;
      ctx.shadowOffsetX = s.shadowDistance || 0;
      ctx.shadowOffsetY = s.shadowDistance || 0;
    }
    // first paint seeds the drop shadow (outline ring if present, else the fill)
    if (ow > 0) { ctx.fillStyle = s.outlineColor; ctx.fillText(text, x + ow, y + ow); }
    else { ctx.fillStyle = fill; ctx.fillText(text, x, y); }
    ctx.restore();
    // full outline ring, then the fill on top
    if (ow > 0) {
      ctx.fillStyle = s.outlineColor;
      for (const d of [[ow, 0], [-ow, 0], [0, ow], [0, -ow], [ow, ow], [-ow, -ow], [ow, -ow], [-ow, ow]]) ctx.fillText(text, x + d[0], y + d[1]);
    }
    ctx.fillStyle = fill;
    ctx.fillText(text, x, y);
  }
  function drawCue(ctx, cue, t, s, W, H) {
    const fontPx = s.fontSize;
    const weight = typeof s.weight === 'number' ? s.weight : (s.bold ? 700 : 400);
    ctx.save();
    ctx.font = `${s.italic ? 'italic ' : ''}${weight} ${fontPx}px '${s.fontFamily}'`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    try { ctx.letterSpacing = (s.letterSpacing || 0) + 'px'; } catch {}
    const words = (cue.words && cue.words.length) ? cue.words : [{ word: cue.text, start: cue.start, end: cue.end }];
    let aw = -1; for (let k = 0; k < words.length; k++) if (t >= words[k].start) aw = k;
    const toks = words.map((w, i) => ({ text: applyCaseLocal(w.word, s.caseMode), idx: i }));
    for (const tk of toks) tk.w = ctx.measureText(tk.text).width;
    const spaceW = ctx.measureText(' ').width || fontPx * 0.3;
    const maxW = (typeof s.boxWidth === 'number' && s.boxWidth > 0) ? s.boxWidth * W : 0.92 * W;
    const lines = []; let line = []; let lineW = 0;
    for (const tk of toks) {
      const add = (line.length ? spaceW : 0) + tk.w;
      if (line.length && lineW + add > maxW) { lines.push({ items: line, w: lineW }); line = []; lineW = 0; }
      line.push(tk); lineW += (line.length > 1 ? spaceW : 0) + tk.w;
    }
    if (line.length) lines.push({ items: line, w: lineW });
    const lineH = fontPx * (typeof s.lineHeight === 'number' ? s.lineHeight : 1.12);
    const cx = s.posX * W;
    const rowOffset = (cue.row || 0) * (s.fontSize * 2.4 / H);
    const cy = (s.posY - rowOffset) * H;
    let y = cy - (lines.length * lineH) / 2 + lineH / 2;
    for (const ln of lines) {
      let x = cx - ln.w / 2;
      for (const it of ln.items) { drawWord(ctx, it.text, x + it.w / 2 - it.w / 2, y, s, it.idx === aw); x += it.w + spaceW; }
      y += lineH;
    }
    ctx.restore();
  }
  // Bottom-right "Made with Capto" mark, burned into free-tier exports.
  function drawWatermark(ctx, W, H) {
    const px = Math.round(Math.min(W, H) * 0.026);
    ctx.save();
    ctx.font = `600 ${px}px 'Inter', system-ui, sans-serif`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    try { ctx.letterSpacing = '0px'; } catch {}
    const pad = Math.round(W * 0.03);
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = px * 0.4;
    ctx.shadowOffsetY = px * 0.06;
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillText('Made with Capto', W - pad, H - pad);
    ctx.restore();
  }
  function drawCaptions(ctx, t, cues, s, W, H) {
    const rows = cues.reduce((m, c) => Math.max(m, (c.row || 0) + 1), 1);
    for (let r = 0; r < rows; r++) {
      let cue = null;
      for (const c of cues) if ((c.row || 0) === r && t >= c.start && t <= c.end) { cue = c; break; }
      if (cue) drawCue(ctx, cue, t, s, W, H);
    }
  }
  async function runExport(job, id, body) {
    const media = window.__captoMedia;
    if (!media || media.id !== id || !media.file) throw new Error('Video not available — re-open the clip.');
    const cues = body.cues || [];
    const style = body.style || {};
    const meta = media.meta || { width: 1080, height: 1920, duration: 0 };
    const tiers = { friend: { maxH: 720, bitrate: 2_500_000 }, high: { maxH: 1080, bitrate: 8_000_000 }, lossless: { maxH: 100000, bitrate: 14_000_000 } };
    const cfg = tiers[body.quality] || tiers.lossless;
    const nH = meta.height || 1080, nW = meta.width || 1080;
    const outH = Math.min(nH, cfg.maxH);
    const k = outH / nH;
    const W = Math.max(2, Math.round(nW * k / 2) * 2), H = Math.max(2, Math.round(outH / 2) * 2);

    const v = document.createElement('video');
    v.src = media.url; v.playsInline = true; v.preload = 'auto';
    // Attach off-screen so the browser keeps it "foreground" — a detached or
    // hidden <video> (especially audio-less clips) gets paused to save power.
    v.style.cssText = 'position:fixed;left:-9999px;top:0;width:2px;height:2px;opacity:0;pointer-events:none;';
    document.body.appendChild(v);
    await new Promise((res, rej) => { v.onloadedmetadata = () => res(); v.onerror = () => rej(new Error('Could not load the video for export.')); });
    try { await document.fonts.load(`${style.weight || 700} 64px '${style.fontFamily}'`); await document.fonts.ready; } catch {}

    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    const drawStyle = scaleStyle(style, k);
    const dur = meta.duration || v.duration || 0;

    const fps = 30;
    const cstream = canvas.captureStream(fps);
    let audioTrack = null;
    try {
      const vstream = v.captureStream ? v.captureStream() : (v.mozCaptureStream ? v.mozCaptureStream() : null);
      if (vstream) audioTrack = vstream.getAudioTracks()[0] || null;
    } catch { /* no audio capture */ }
    const tracks = cstream.getVideoTracks();
    if (audioTrack) tracks.push(audioTrack);
    const stream = new MediaStream(tracks);
    const mime = pickExportMime();
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: cfg.bitrate });
    const chunks = [];
    rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };

    let raf = 0;
    const watermark = !!(window.__captoUser && window.__captoUser.watermark);
    function frame() {
      try {
        ctx.drawImage(v, 0, 0, W, H);
        drawCaptions(ctx, v.currentTime, cues, drawStyle, W, H);
        if (watermark) drawWatermark(ctx, W, H);
      } catch {}
      job.progress = dur ? Math.min(0.999, v.currentTime / dur) : 0;
      if (!v.paused && !v.ended) raf = requestAnimationFrame(frame);
    }
    const blob = await new Promise((resolve, reject) => {
      rec.onstop = () => { cancelAnimationFrame(raf); resolve(new Blob(chunks, { type: mime })); };
      rec.onerror = (e) => reject((e && e.error) || new Error('Recorder error.'));
      v.onended = () => { try { rec.stop(); } catch {} };
      v.play().then(() => { rec.start(); frame(); }).catch(reject);
    });
    try { v.pause(); v.removeAttribute('src'); v.load(); v.remove(); } catch {}
    const base = (media.file.name || 'video').replace(/\.[^.]+$/, '');
    downloadBlob(blob, `${base}-captioned.${extFor(mime)}`);
    return blob;
  }
  function startExportJob(id, body) {
    const jobId = 'j_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const job = { status: 'running', progress: 0, error: null };
    jobs[jobId] = job;
    runExport(job, id, body)
      .then(() => { job.status = 'done'; })
      .catch((e) => { job.status = 'error'; job.error = (e && e.message) || 'Export failed.'; });
    return jobId;
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
      if (sub === '/export' && method === 'POST') {
        let parsed = {}; try { parsed = JSON.parse(init.body); } catch {}
        try { return Promise.resolve(json({ jobId: startExportJob(id, parsed) })); }
        catch (e) { return Promise.resolve(json({ error: (e && e.message) || 'Export failed.' }, 500)); }
      }

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

    // export job polling — the browser export auto-downloads on completion.
    const jm = path.match(/^\/api\/jobs\/([^/]+)$/);
    if (jm) {
      const job = jobs[jm[1]];
      if (!job) return Promise.resolve(json({ status: 'error', error: 'Job expired.' }));
      return Promise.resolve(json({ status: job.status, progress: job.progress, error: job.error }));
    }

    // desktop-only endpoints (download/folder pickers) — not on web.
    if (/^\/api\/(download|pick-folder|reveal)/.test(path))
      return Promise.resolve(json({ error: 'unavailable' }, 501));

    // anything else under /api — let it hit Capto directly (carries cookies).
    return realFetch(input, init);
  };

  function goTop(href) { return (e) => { if (e) e.preventDefault(); try { window.top.location.href = href; } catch { window.location.href = href; } }; }
  function minutesLabel(u) {
    if (!u || !u.minutes) return '';
    const m = u.minutes;
    if (m.unlimited || m.limit == null) return 'Unlimited minutes';
    return `${m.remaining} of ${m.limit} min left`;
  }
  // Minutes indicator on the home hero + the watermark/quota note in the export
  // modal. Idempotent — safe to call before and after /api/studio/me resolves.
  function renderQuotaUI() {
    const u = window.__captoUser || {};
    const lbl = minutesLabel(u);
    const canTopUp = u.plan === 'free' || u.plan === 'pro';

    const actions = document.querySelector('.home-actions');
    if (actions) {
      let pill = document.getElementById('capto-minutes');
      if (!pill) {
        pill = document.createElement('button');
        pill.id = 'capto-minutes';
        pill.className = 'btn ghost lg';
        actions.insertBefore(pill, actions.firstChild);
      }
      if (u.signedIn && lbl) {
        pill.style.display = '';
        pill.textContent = canTopUp ? `${lbl} · Top up` : lbl;
        pill.onclick = canTopUp ? goTop('/billing') : null;
      } else pill.style.display = 'none';
    }

    const tiers = document.getElementById('tiers');
    if (tiers && tiers.parentNode) {
      let line = document.getElementById('capto-export-quota');
      if (!line) {
        line = document.createElement('div');
        line.id = 'capto-export-quota';
        line.style.cssText = 'font-size:11.5px;color:var(--faint);margin:-4px 0 14px;line-height:1.5;';
        tiers.parentNode.insertBefore(line, tiers.nextSibling);
      }
      const parts = [];
      if (u.watermark) parts.push('Free exports include a “Made with Capto” watermark');
      if (lbl) parts.push(lbl);
      line.textContent = parts.join(' · ');
      line.style.display = parts.length ? '' : 'none';
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    // Home "Settings" button jumps to Capto's account settings.
    const s = document.getElementById('homeSettings');
    if (s) s.addEventListener('click', goTop('/settings'));
    // The export "Save to ~/Desktop" picker + "Open folder" are desktop-only;
    // on the web the file downloads straight to the browser.
    const dest = document.getElementById('exDest');
    if (dest) dest.style.display = 'none';
    const openFolder = document.getElementById('exOpenFolder');
    if (openFolder) openFolder.style.display = 'none';
    renderQuotaUI();
    fetchMe();
  });
})();
