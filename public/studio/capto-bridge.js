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
      if (r.ok) { window.__captoUser = await r.json(); renderQuotaUI(); renderExportOptions(); }
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
    // Punchy 2–3 word captions by default — clean, fast, easy to read on phones.
    const MAXW = 3, MAXGAP = 0.5, MAXCHARS = 24;
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

  // ───────────────── project persistence (Capto DB, per-account) ─────────────────
  // The video stays on the device; we persist only name + editor state (cues,
  // style, meta) + a small thumbnail to Capto's DB, so projects follow the user
  // across devices/accounts. On reopen we relink the local file.
  let captoProject = null;     // current full state {meta,style,originalName,language,cues}
  let pendingRelinkId = null;  // a reopened project whose local video isn't loaded yet
  const thumbCache = {};       // id -> data-url thumbnail (for the home grid)

  function captureThumb() {
    try {
      const v = document.getElementById('video');
      if (!v || !v.videoWidth) return null;
      const w = 320, h = Math.round((v.videoHeight / v.videoWidth) * w) || 180;
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d').drawImage(v, 0, 0, w, h);
      return c.toDataURL('image/jpeg', 0.6);
    } catch { return null; }
  }

  const captoApi = {
    async list() {
      try {
        const r = await realFetch('/api/projects');
        if (!r.ok) throw 0;
        const data = await r.json();
        return (data.projects || []).map((row) => {
          let st = {};
          try { st = row.state ? JSON.parse(row.state) : {}; } catch {}
          if (row.thumbnailUrl) thumbCache[row.id] = row.thumbnailUrl;
          const meta = st.meta || {};
          return {
            id: row.id, name: row.name, originalName: row.name,
            duration: meta.duration || row.durationSec || 0,
            width: meta.width, height: meta.height,
            cueCount: (st.cues || []).length, language: st.language, updatedAt: row.updatedAt,
          };
        });
      } catch { return null; }
    },
    async create(name, durationSec, state) {
      const r = await realFetch('/api/projects', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, durationSec, state }),
      });
      if (!r.ok) throw new Error('create failed');
      return (await r.json()).id;
    },
    async get(id) {
      const r = await realFetch('/api/projects/' + id);
      if (!r.ok) throw new Error('get failed');
      const data = await r.json();
      let st = {};
      try { st = data.project && data.project.state ? JSON.parse(data.project.state) : {}; } catch {}
      st.originalName = st.originalName || (data.project && data.project.name);
      return st;
    },
    save(id, fields) {
      return realFetch('/api/projects/' + id, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      }).catch(() => {});
    },
    del(id) { return realFetch('/api/projects/' + id, { method: 'DELETE' }).catch(() => {}); },
  };

  // Social safe-zone guides over the video frame — shaded "avoid" areas where
  // TikTok / Reels / Shorts paint their own UI (caption, username, action
  // buttons, top status), so the user doesn't place captions in a bad zone.
  function safeZone(l, t, w, h, label, labelTop) {
    return (
      `<div style="position:absolute;left:${l};top:${t};width:${w};height:${h};` +
      `background:repeating-linear-gradient(45deg,rgba(251,113,133,.10),rgba(251,113,133,.10) 7px,transparent 7px,transparent 15px);` +
      `border:1px dashed rgba(251,113,133,.55)">` +
      `<span style="position:absolute;${labelTop ? 'top' : 'bottom'}:4px;left:6px;font-size:9px;font-weight:700;` +
      `letter-spacing:.04em;text-transform:uppercase;color:#ffc4cc;background:rgba(0,0,0,.45);padding:1px 6px;border-radius:5px">${label}</span></div>`
    );
  }
  function setupSafeZones() {
    const frame = document.getElementById('frame');
    const tools = document.querySelector('.canvas-tools');
    if (!frame || !tools || document.getElementById('capto-safe')) return;
    const ov = document.createElement('div');
    ov.id = 'capto-safe';
    ov.style.cssText = 'position:absolute;inset:0;z-index:5;pointer-events:none;display:none;border-radius:4px;overflow:hidden';
    ov.innerHTML =
      safeZone('0', '0', '100%', '8%', 'Status bar', true) +
      safeZone('0', '80%', '100%', '20%', 'Caption + nav', false) +
      safeZone('84%', '34%', '16%', '46%', 'Buttons', true);
    frame.appendChild(ov);
    const sep = document.createElement('span');
    sep.className = 'ct-sep';
    const btn = document.createElement('button');
    btn.id = 'capto-safe-btn';
    btn.title = 'Safe zones — where TikTok / Reels / Shorts cover the screen';
    // A phone frame with a marked bottom zone — reads as "safe areas".
    btn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="7" y="2.5" width="10" height="19" rx="2.5"/><rect x="9" y="15.5" width="6" height="3.2" rx="1" fill="currentColor" stroke="none" opacity="0.55"/></svg>';
    btn.onclick = () => {
      const on = ov.style.display === 'none';
      ov.style.display = on ? 'block' : 'none';
      btn.style.color = on ? 'var(--accent-2)' : '';
    };
    tools.appendChild(sep);
    tools.appendChild(btn);
  }

  function clearRelink() {
    const o = document.getElementById('capto-relink');
    if (o) o.remove();
    pendingRelinkId = null;
  }
  function showRelink(id, name) {
    if (document.getElementById('capto-relink')) return;
    const area = document.getElementById('canvasArea');
    if (!area) return;
    const o = document.createElement('div');
    o.id = 'capto-relink';
    o.style.cssText = 'position:absolute;inset:0;z-index:20;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:rgba(8,8,10,.88);backdrop-filter:blur(6px);text-align:center;padding:24px';
    o.innerHTML =
      `<div style="font-size:15px;font-weight:600;color:var(--text)">Locate “${escHtml(name || 'your video')}”</div>` +
      `<div style="font-size:13px;color:var(--muted);max-width:380px;line-height:1.5">Your video stays on your device, so reopening a project needs you to point Capto at the original file again. Your captions and style are saved.</div>`;
    const btn = document.createElement('button');
    btn.className = 'btn primary lg';
    btn.textContent = 'Choose video file';
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'video/*'; input.style.display = 'none';
    btn.onclick = () => input.click();
    input.onchange = () => {
      const f = input.files && input.files[0];
      if (!f) return;
      if (window.__captoMedia && window.__captoMedia.url) { try { URL.revokeObjectURL(window.__captoMedia.url); } catch {} }
      readVideoMeta(f).then(({ url, meta }) => {
        window.__captoMedia = { id, file: f, url, meta };
        clearRelink();
        const v = document.getElementById('video');
        if (v) { v.src = url; v.load(); }
      });
    };
    o.appendChild(btn);
    o.appendChild(input);
    area.appendChild(o);
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
  const supportsSavePicker = typeof window.showSaveFilePicker === 'function';
  // Desktop: the user picks the save location up front (File System Access);
  // we write the finished export straight there. Mobile / unsupported: a normal
  // download (lands in the gallery / Downloads).
  async function saveBlob(blob, name) {
    const h = window.__captoSaveHandle;
    if (h) {
      try {
        const w = await h.createWritable();
        await w.write(blob);
        await w.close();
        window.__captoSaveHandle = null;
        return;
      } catch { /* user revoked / error → fall back to download */ }
    }
    downloadBlob(blob, name);
  }
  async function chooseSaveLocation() {
    if (!supportsSavePicker) return;
    const base = ((window.__captoMedia && window.__captoMedia.file && window.__captoMedia.file.name) || 'video').replace(/\.[^.]+$/, '');
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: `${base}-captioned.mp4`,
        types: [{ description: 'Video', accept: { 'video/mp4': ['.mp4'], 'video/webm': ['.webm'] } }],
      });
      window.__captoSaveHandle = handle;
      const p = document.getElementById('exPath');
      if (p) { p.textContent = handle.name; p.title = handle.name; }
    } catch { /* cancelled */ }
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
  function getVal(elId, def) { const e = document.getElementById(elId); return e ? e.value : def; }
  function clampNum(v, lo, hi) { v = parseFloat(v); if (isNaN(v)) v = lo; return Math.max(lo, Math.min(hi, v)); }

  // Encoding settings per export tier, read live from the modal controls.
  function readExportSettings(quality, meta) {
    const nH = meta.height || 1080;
    const dur = Math.max(1, meta.duration || 10);
    if (quality === 'friend') {
      const mb = clampNum(getVal('capto-mb', 25), 3, 300);
      const totalBps = (mb * 8 * 1024 * 1024) / dur;
      return { maxH: Math.min(nH, 720), fps: 30, videoBitrate: Math.max(350000, Math.round(totalBps - 128000)) };
    }
    if (quality === 'lossless') return { maxH: nH, fps: 30, videoBitrate: 16000000 };
    const res = parseInt(getVal('capto-res', '1080'), 10) || 1080; // "custom" (middle tier)
    const fps = parseInt(getVal('capto-fps', '30'), 10) || 30;
    const bsel = getVal('capto-bitrate-sel', '10');
    const mbps = bsel === 'custom' ? clampNum(getVal('capto-bitrate', 10), 1, 50) : (parseInt(bsel, 10) || 10);
    return { maxH: Math.min(nH, res), fps, videoBitrate: Math.round(mbps * 1000000) };
  }

  function currentTier() {
    const on = document.querySelector('#tiers .tier.on');
    return on ? on.dataset.q : 'lossless';
  }
  function renderExportOptions() {
    const opts = document.getElementById('capto-export-opts');
    if (!opts) return;
    const u = window.__captoUser || {};
    const free = !u.signedIn || u.plan === 'free';
    document.querySelectorAll('#tiers .tier').forEach((t) => {
      const locked = free && (t.dataset.q === 'friend' || t.dataset.q === 'lossless');
      t.style.opacity = locked ? '.45' : '';
      t.style.pointerEvents = locked ? 'none' : '';
      let badge = t.querySelector('.capto-prolock');
      if (locked && !badge) {
        badge = document.createElement('span');
        badge.className = 'capto-prolock';
        badge.textContent = 'Pro';
        badge.style.cssText = 'position:absolute;top:8px;right:8px;font-size:9px;font-weight:800;letter-spacing:.04em;padding:2px 7px;border-radius:99px;color:#0b0c14;background:linear-gradient(120deg,#82a5ff,#8983ff)';
        t.style.position = 'relative';
        t.appendChild(badge);
      } else if (!locked && badge) badge.remove();
    });
    let q = currentTier();
    if (free && (q === 'friend' || q === 'lossless')) {
      const hi = document.querySelector('#tiers .tier[data-q="high"]');
      if (hi) { hi.click(); q = 'high'; }
    }
    if (q === 'friend') {
      opts.innerHTML = `<label style="display:flex;align-items:center;gap:10px;font-size:12.5px;color:var(--muted)">Target size <input id="capto-mb" type="number" min="3" max="300" value="25" style="width:96px"> MB</label>`;
    } else if (q === 'lossless') {
      opts.innerHTML = `<div style="font-size:12px;color:var(--faint)">Full resolution, original audio copied.</div>`;
    } else {
      const lock = free ? 'disabled' : '';
      const sel = 'width:auto;min-width:88px;display:inline-block;padding:7px 26px 7px 10px;font-size:12.5px';
      opts.innerHTML =
        `<div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center">` +
        `<label style="font-size:12px;color:var(--muted)">Resolution <select id="capto-res" ${lock} style="${sel}"><option value="1080">1080p</option><option value="720">720p</option><option value="480">480p</option></select></label>` +
        `<label style="font-size:12px;color:var(--muted)">FPS <select id="capto-fps" ${lock} style="${sel}"><option value="24">24</option><option value="30" selected>30</option><option value="60">60</option></select></label>` +
        `<label style="font-size:12px;color:var(--muted)">Bitrate <select id="capto-bitrate-sel" style="${sel}">` +
          `<option value="3">Lower</option>` +
          `<option value="6">Medium</option>` +
          `<option value="10" selected>High</option>` +
          `<option value="20" ${free ? 'disabled' : ''}>Highest${free ? ' (Pro)' : ''}</option>` +
          `<option value="custom">Custom…</option>` +
        `</select></label>` +
        `<span id="capto-bitrate-custom" style="display:none;font-size:12px;color:var(--muted)"><input id="capto-bitrate" type="number" min="1" max="50" value="10" style="width:74px"> Mbps</span>` +
        `</div>` +
        (free ? `<div style="margin-top:9px;font-size:11px;color:var(--faint)">Free is capped at 1080p / 30fps. <span style="color:var(--accent-2);cursor:pointer" id="capto-up">Upgrade</span> for send-to-friend, lossless, 60fps and highest bitrate.</div>` : '');
      const up = document.getElementById('capto-up');
      if (up) up.onclick = goTop('/billing');
      const bsel = document.getElementById('capto-bitrate-sel');
      const bcustom = document.getElementById('capto-bitrate-custom');
      if (bsel && bcustom) bsel.onchange = () => { bcustom.style.display = bsel.value === 'custom' ? 'inline' : 'none'; };
    }
  }
  function setupExportOptions() {
    const tiersEl = document.getElementById('tiers');
    if (!tiersEl || document.getElementById('capto-export-opts')) return;
    const opts = document.createElement('div');
    opts.id = 'capto-export-opts';
    opts.style.cssText = 'margin:0 0 14px';
    tiersEl.parentNode.insertBefore(opts, tiersEl.nextSibling);
    tiersEl.querySelectorAll('.tier').forEach((t) => t.addEventListener('click', () => setTimeout(renderExportOptions, 0)));
    renderExportOptions();
  }

  // ── thumbnail picker: after choosing the export tier, pick the thumbnail
  // (scrub a frame or upload one). It becomes the project's home-grid thumb. ──
  let chosenThumb = null;
  let thumbVid = null;
  function frameToDataURL(v) {
    try {
      const w = 480, h = Math.round((v.videoHeight / v.videoWidth) * w) || 270;
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d').drawImage(v, 0, 0, w, h);
      return c.toDataURL('image/jpeg', 0.72);
    } catch { return null; }
  }
  function initThumbPreview() {
    const media = window.__captoMedia;
    const prev = document.getElementById('capto-thumb-preview');
    const scrub = document.getElementById('capto-thumb-scrub');
    if (!media || !prev || !scrub) return;
    if (!thumbVid) { thumbVid = document.createElement('video'); thumbVid.muted = true; thumbVid.preload = 'auto'; thumbVid.playsInline = true; }
    if (thumbVid.src !== media.url) thumbVid.src = media.url;
    const dur = (media.meta && media.meta.duration) || 0;
    const grab = (pct) => {
      if (!dur) return;
      thumbVid.currentTime = Math.min(Math.max(0, dur - 0.05), (dur * pct) / 100);
      thumbVid.onseeked = () => { const d = frameToDataURL(thumbVid); if (d) { chosenThumb = d; prev.src = d; } };
    };
    scrub.oninput = () => grab(+scrub.value);
    // seed with the live editor frame, then let the slider refine it
    chosenThumb = captureThumb();
    if (chosenThumb) prev.src = chosenThumb; else grab(+scrub.value);
  }
  function setupThumbPicker() {
    const exStart = document.getElementById('exStart');
    const actions = document.getElementById('exMainActions');
    if (!exStart || !actions || document.getElementById('capto-thumb')) return;
    const panel = document.createElement('div');
    panel.id = 'capto-thumb';
    panel.style.cssText = 'display:none;margin:2px 0 14px';
    panel.innerHTML =
      `<div style="font-size:12px;color:var(--muted);margin-bottom:8px">Thumbnail — drag to a frame, or upload your own</div>` +
      `<img id="capto-thumb-preview" alt="" style="max-height:300px;max-width:100%;width:auto;object-fit:contain;border-radius:10px;border:1px solid var(--line);background:#000;display:block;margin:0 auto">` +
      `<input id="capto-thumb-scrub" type="range" min="0" max="100" value="35" style="width:100%;margin-top:10px">` +
      `<div style="margin-top:8px"><button id="capto-thumb-upload" class="btn ghost sm" type="button">Upload image</button></div>` +
      `<input id="capto-thumb-file" type="file" accept="image/*" hidden>`;
    actions.parentNode.insertBefore(panel, actions);
    panel.querySelector('#capto-thumb-upload').onclick = () => panel.querySelector('#capto-thumb-file').click();
    panel.querySelector('#capto-thumb-file').onchange = (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = () => { chosenThumb = String(r.result); document.getElementById('capto-thumb-preview').src = chosenThumb; };
      r.readAsDataURL(f);
    };
    const toggle = (ids, show) => ids.forEach((id) => { const el = document.getElementById(id); if (el) el.style.display = show ? '' : 'none'; });
    const orig = exStart.onclick;
    let step = 0;
    const reset = () => { step = 0; panel.style.display = 'none'; chosenThumb = null; window.__captoChosenThumb = null; exStart.textContent = 'Export'; toggle(['tiers', 'capto-export-opts'], true); if (supportsSavePicker) toggle(['exDest'], true); };
    exStart.onclick = (e) => {
      if (step === 0) {
        toggle(['tiers', 'capto-export-opts', 'exDest'], false);
        panel.style.display = 'block';
        initThumbPreview();
        exStart.textContent = 'Export';
        document.getElementById('exTitle').textContent = 'Pick a thumbnail';
        step = 1;
        return;
      }
      panel.style.display = 'none';
      window.__captoChosenThumb = chosenThumb;
      if (chosenThumb && window.__captoMedia) {
        thumbCache[window.__captoMedia.id] = chosenThumb;
        captoApi.save(window.__captoMedia.id, { name: (captoProject && captoProject.originalName) || 'Untitled project', thumbnail: chosenThumb });
      }
      step = 0;
      if (orig) orig.call(exStart, e);
    };
    const eb = document.getElementById('exportBtn');
    if (eb) eb.addEventListener('click', () => setTimeout(reset, 0));
  }

  async function runExport(job, id, body) {
    const media = window.__captoMedia;
    if (!media || media.id !== id || !media.file) throw new Error('Video not available — re-open the clip.');
    const cues = body.cues || [];
    const style = body.style || {};
    const meta = media.meta || { width: 1080, height: 1920, duration: 0 };
    const nH = meta.height || 1080, nW = meta.width || 1080;
    const settings = readExportSettings(body.quality, meta);
    const outH = Math.min(nH, settings.maxH);
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

    const fps = settings.fps;
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
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: settings.videoBitrate });
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
    await saveBlob(blob, `${base}-captioned.${extFor(mime)}`);
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
      return (async () => json((await captoApi.list()) || []))();
    }
    if (path === '/api/projects' && method === 'POST') {
      return (async () => {
        const body = init && init.body;
        const file = body instanceof FormData ? body.get('video') : null;
        if (!(file instanceof File)) return json({ error: 'No video provided.' }, 400);
        const { url, meta } = await readVideoMeta(file);
        const style = defaultStyle(meta);
        const state = { meta, style, originalName: file.name, language: 'en', cues: [] };
        let id;
        try { id = await captoApi.create(file.name, meta.duration, state); }
        catch { id = genId(); } // offline / signed-out fallback (won't sync)
        if (window.__captoMedia && window.__captoMedia.url) { try { URL.revokeObjectURL(window.__captoMedia.url); } catch {} }
        window.__captoMedia = { id, file, url, meta };
        captoProject = state;
        pendingRelinkId = null;
        clearRelink();
        return json({ id, meta, originalName: file.name, style });
      })();
    }

    // single project (+ sub-routes)
    const m = path.match(/^\/api\/projects\/([^/]+)(\/.*)?$/);
    if (m) {
      const id = m[1];
      const sub = m[2] || '';

      if (sub === '/transcribe' && method === 'POST') {
        const file = window.__captoMedia && window.__captoMedia.id === id ? window.__captoMedia.file : null;
        let parsed = {}; try { parsed = JSON.parse(init.body); } catch {}
        if (!file) return Promise.resolve(json({ error: 'Locate the video first, then caption it.' }, 400));
        return transcribe(file, parsed);
      }
      if (sub === '/thumb') {
        const t = thumbCache[id];
        if (t) return realFetch(t); // data URLs are fetchable → returns the image
        return Promise.resolve(new Response('', { status: 404 }));
      }
      if (sub === '/video' || sub.startsWith('/preview/')) {
        if (window.__captoMedia && window.__captoMedia.id === id && window.__captoMedia.url) return realFetch(window.__captoMedia.url);
        return Promise.resolve(new Response('', { status: 404 }));
      }
      if (sub === '/export' && method === 'POST') {
        let parsed = {}; try { parsed = JSON.parse(init.body); } catch {}
        try { return Promise.resolve(json({ jobId: startExportJob(id, parsed) })); }
        catch (e) { return Promise.resolve(json({ error: (e && e.message) || 'Export failed.' }, 500)); }
      }

      if (sub === '' && method === 'GET') {
        return (async () => {
          try {
            const st = await captoApi.get(id);
            captoProject = st;
            pendingRelinkId = window.__captoMedia && window.__captoMedia.id === id ? null : id;
            return json({ meta: st.meta, originalName: st.originalName, style: st.style, cues: st.cues || [], language: st.language });
          } catch { return json({ error: 'Project not found.' }, 404); }
        })();
      }
      if (sub === '' && (method === 'PUT' || method === 'PATCH')) {
        return (async () => {
          let body = {}; try { body = JSON.parse(init.body); } catch {}
          if (!captoProject) captoProject = {};
          if (body.cues) captoProject.cues = body.cues;
          if (body.style) captoProject.style = body.style;
          if (body.name) captoProject.originalName = body.name;
          const fields = { name: captoProject.originalName || 'Untitled project' };
          if (method === 'PUT') {
            fields.state = captoProject;
            if (captoProject.meta && captoProject.meta.duration) fields.durationSec = captoProject.meta.duration;
            const thumb = window.__captoChosenThumb || captureThumb();
            if (thumb) { fields.thumbnail = thumb; thumbCache[id] = thumb; }
          }
          await captoApi.save(id, fields);
          return json({ ok: true });
        })();
      }
      if (sub === '' && method === 'DELETE') {
        return (async () => { await captoApi.del(id); delete thumbCache[id]; return json({ ok: true }); })();
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
  function escHtml(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
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
        pill.textContent = canTopUp ? `${lbl} · ${u.plan === 'free' ? 'Upgrade' : 'Top up'}` : lbl;
        pill.onclick = canTopUp ? goTop('/billing') : null;
      } else pill.style.display = 'none';

      // Profile chip on the right — avatar + name, jumps to account settings.
      let prof = document.getElementById('capto-profile');
      if (!prof) {
        prof = document.createElement('button');
        prof.id = 'capto-profile';
        prof.className = 'btn ghost lg';
        prof.title = 'Account';
        actions.appendChild(prof);
      }
      if (u.signedIn) {
        const nm = u.name || (u.email ? u.email.split('@')[0] : 'Account');
        const initial = (nm.trim()[0] || 'A').toUpperCase();
        prof.style.display = '';
        prof.innerHTML =
          `<span style="display:inline-flex;width:22px;height:22px;border-radius:50%;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--accent-2),var(--accent));color:#0b0c11;font-weight:700;font-size:11px;margin-right:6px">${initial}</span>` +
          escHtml(nm);
        prof.onclick = goTop('/settings');
      } else {
        prof.style.display = '';
        prof.textContent = 'Sign in';
        prof.onclick = goTop('/signin');
      }
    }

    // Big colourful minutes card on the home, above the projects.
    const wrap = document.querySelector('.home-wrap');
    const anchor = document.querySelector('.home-row');
    if (wrap && anchor) {
      let card = document.getElementById('capto-min-card');
      if (!card) {
        card = document.createElement('div');
        card.id = 'capto-min-card';
        card.style.cssText = 'margin:0 0 26px;padding:16px 18px;border:1px solid var(--line);border-radius:16px;background:linear-gradient(120deg, rgba(130,165,255,.10), rgba(137,131,255,.05) 60%, rgba(98,216,255,.06));';
        wrap.insertBefore(card, anchor);
      }
      const m = u.minutes;
      if (u.signedIn && m) {
        card.style.display = '';
        const unlimited = m.unlimited || m.limit == null;
        const pct = unlimited ? 12 : Math.min(100, Math.round(((m.used || 0) / Math.max(1, m.limit)) * 100));
        const planName = (u.plan || 'free').charAt(0).toUpperCase() + (u.plan || 'free').slice(1);
        card.innerHTML =
          `<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:11px">` +
            `<div style="display:flex;align-items:center;gap:9px">` +
              `<span style="font-size:13.5px;font-weight:650;color:var(--text)">Caption minutes</span>` +
              `<span style="font-size:10.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;padding:2px 8px;border-radius:99px;color:#0b0c14;background:linear-gradient(120deg,#a0c1ff,#8983ff)">${planName}</span>` +
            `</div>` +
            (canTopUp ? `<button id="capto-topup" class="btn primary sm">${u.plan === 'free' ? 'Upgrade' : 'Top up'}</button>` : '') +
          `</div>` +
          `<div style="height:9px;border-radius:99px;background:rgba(255,255,255,.07);overflow:hidden">` +
            `<div style="height:100%;width:${pct}%;border-radius:99px;background:linear-gradient(90deg,#82a5ff,#8983ff,#62d8ff);transition:width .4s"></div>` +
          `</div>` +
          `<div style="margin-top:9px;font-size:12px;color:var(--muted)">` +
            (unlimited
              ? `Unlimited minutes on ${planName}`
              : `<b style="color:var(--text)">${m.remaining}</b> of ${m.limit} min left · ${m.used || 0} used this month`) +
          `</div>`;
        const tu = document.getElementById('capto-topup');
        if (tu) tu.onclick = goTop('/billing');
      } else {
        card.style.display = 'none';
      }
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
    // "Open folder" (post-export reveal) is desktop-app only — never on web.
    const openFolder = document.getElementById('exOpenFolder');
    if (openFolder) openFolder.style.display = 'none';
    // Save-location row: on desktop (File System Access) let the user choose
    // where to save BEFORE exporting; on mobile / unsupported, hide it (the file
    // just downloads to the gallery / Downloads).
    const dest = document.getElementById('exDest');
    const chooseBtn = document.getElementById('exChooseDir');
    const pathEl = document.getElementById('exPath');
    if (dest) {
      if (supportsSavePicker) {
        dest.style.display = '';
        if (pathEl) { pathEl.textContent = 'Ask on export'; pathEl.title = ''; }
        if (chooseBtn) { chooseBtn.textContent = 'Choose location…'; chooseBtn.onclick = chooseSaveLocation; }
      } else {
        dest.style.display = 'none';
      }
    }
    // When a reopened project's video can't load (no local file), offer relink.
    const vid = document.getElementById('video');
    if (vid) vid.addEventListener('error', () => {
      if (pendingRelinkId) showRelink(pendingRelinkId, captoProject && captoProject.originalName);
    });
    // Home thumbnails are saved as data URLs in the DB; the grid loads them via
    // CSS background-image (which bypasses our fetch shim), so paint them in.
    const grid = document.getElementById('homeGrid');
    if (grid) {
      const applyThumbs = () => {
        grid.querySelectorAll('.proj[data-id]').forEach((card) => {
          const t = thumbCache[card.dataset.id];
          if (t) {
            const th = card.querySelector('.thumb');
            if (th) th.style.backgroundImage = `url(${t})`;
          }
        });
      };
      new MutationObserver(applyThumbs).observe(grid, { childList: true });
    }
    // "Powered by Contles" chip at the foot of the home.
    const wrap = document.querySelector('.home-wrap');
    if (wrap && !document.getElementById('capto-contles')) {
      const c = document.createElement('div');
      c.id = 'capto-contles';
      c.style.cssText = 'margin:36px 0 8px;display:flex;justify-content:center';
      c.innerHTML =
        `<span style="display:inline-flex;align-items:center;gap:7px;font-size:11.5px;color:var(--faint);` +
        `border:1px solid var(--line);border-radius:99px;padding:6px 13px">` +
        `<span style="width:6px;height:6px;border-radius:50%;background:linear-gradient(120deg,#82a5ff,#62d8ff)"></span>` +
        `Powered by Contles</span>`;
      wrap.appendChild(c);
    }
    setupSafeZones();
    setupExportOptions();
    setupThumbPicker();
    renderQuotaUI();
    fetchMe();
  });
})();
