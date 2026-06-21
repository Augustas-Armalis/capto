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

  // Canonical engine + language catalogue — mirrors lib/ai/models.ts STT_MODELS
  // and the dashboard/settings language list, so the editor's Captions tab shows
  // exactly the same options as the rest of Capto (plan-gated the same way).
  window.__captoModels = [
    { id: 'groq-whisper-large-v3', label: 'Whisper Large v3 · Groq', minPlan: 'free' },
    { id: 'groq-whisper-large-v3-turbo', label: 'Whisper v3 Turbo · Groq', minPlan: 'free' },
    { id: 'deepgram-nova-3', label: 'Deepgram Nova-3', minPlan: 'pro' },
    { id: 'openai-whisper-1', label: 'OpenAI Whisper', minPlan: 'pro' },
  ];
  window.__captoLangs = [
    ['auto', 'Auto-detect'], ['en', 'English'], ['es', 'Spanish'], ['fr', 'French'],
    ['de', 'German'], ['pt', 'Portuguese'], ['it', 'Italian'], ['nl', 'Dutch'],
    ['hi', 'Hindi'], ['ja', 'Japanese'],
  ];
  window.__captoPlanRank = { free: 0, pro: 1, ultra: 2 };
  function gotoSignin() {
    // Don't bounce on localhost — keeps the editor testable in local dev.
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') return;
    try { window.top.location.href = '/signin'; } catch { window.location.href = '/signin'; }
  }
  async function fetchMe() {
    try {
      const r = await realFetch('/api/studio/me');
      if (r.status === 401) { gotoSignin(); return; }
      if (r.ok) {
        window.__captoUser = await r.json();
        // The editor is for signed-in accounts only. If someone reaches the raw
        // /studio/ assets directly (the static files are public), bounce them to
        // sign in — the real auth gate lives on the /editor route + here.
        if (window.__captoUser && window.__captoUser.signedIn === false) { gotoSignin(); return; }
        renderQuotaUI(); renderExportOptions();
        // Re-render the editor engine dropdowns now the plan is known, so Pro/Ultra
        // models become selectable for paid users (init ran before this resolved).
        if (typeof window.__captoRefreshEngines === 'function') { try { window.__captoRefreshEngines(); } catch {} }
      }
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

  // ───────────────── same-device auto-relink (File System Access) ─────────────────
  // The video never leaves the device, so reopening a project needs the local
  // file again. Instead of asking every time, we persist the file's
  // FileSystemFileHandle in IndexedDB keyed by project id. On reopen we silently
  // re-read it (re-granting permission within the click gesture), so the clip
  // links itself. We only fall back to the manual "Locate video" prompt when the
  // handle is missing, the file moved, or permission was denied (e.g. a new
  // device or a browser without the API). Chromium-only; other browsers degrade
  // gracefully to the manual relink.
  const HANDLE_DB = 'capto-media', HANDLE_STORE = 'handles', BLOB_STORE = 'blobs';
  function idb() {
    return new Promise((resolve, reject) => {
      let req;
      try { req = indexedDB.open(HANDLE_DB, 2); } catch (e) { return reject(e); }
      req.onupgradeneeded = () => {
        const db = req.result;
        try { if (!db.objectStoreNames.contains(HANDLE_STORE)) db.createObjectStore(HANDLE_STORE); } catch {}
        try { if (!db.objectStoreNames.contains(BLOB_STORE)) db.createObjectStore(BLOB_STORE); } catch {}
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  async function idbPutIn(store, key, val) {
    const db = await idb();
    await new Promise((res, rej) => { const tx = db.transaction(store, 'readwrite'); tx.objectStore(store).put(val, key); tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
  }
  async function idbGetIn(store, key) {
    try { const db = await idb(); return await new Promise((res, rej) => { const tx = db.transaction(store, 'readonly'); const r = tx.objectStore(store).get(key); r.onsuccess = () => res(r.result || null); r.onerror = () => rej(r.error); }); } catch { return null; }
  }
  async function idbDelIn(store, key) {
    try { const db = await idb(); await new Promise((res) => { const tx = db.transaction(store, 'readwrite'); tx.objectStore(store).delete(key); tx.oncomplete = res; tx.onerror = res; }); } catch {}
  }
  // handles (File System Access) — survive across devices only if re-granted
  async function idbPut(key, val) { try { await idbPutIn(HANDLE_STORE, key, val); } catch {} }
  const idbGet = (key) => idbGetIn(HANDLE_STORE, key);
  const idbDel = (key) => idbDelIn(HANDLE_STORE, key);
  // video blobs — the robust same-device store: the actual file bytes, so reopen
  // (after refresh, or days later) links silently with NO path prompt / permission.
  async function idbPutBlob(key, file) { await idbPutIn(BLOB_STORE, key, file); } // may throw on quota — caller catches
  const idbGetBlob = (key) => idbGetIn(BLOB_STORE, key);
  const idbDelBlob = (key) => idbDelIn(BLOB_STORE, key);
  // Keep only the most-recent few video blobs so storage can't grow without
  // bound (older projects fall back to the handle / manual relink).
  const BLOB_LRU_KEY = 'capto-blob-ids', BLOB_LRU_MAX = 6;
  function lruList() { try { return JSON.parse(localStorage.getItem(BLOB_LRU_KEY) || '[]'); } catch { return []; } }
  function lruSave(ids) { try { localStorage.setItem(BLOB_LRU_KEY, JSON.stringify(ids)); } catch {} }
  async function storeBlob(id, file) {
    try {
      await idbPutBlob(id, file);
      let ids = [id, ...lruList().filter((x) => x !== id)];
      for (const e of ids.slice(BLOB_LRU_MAX)) { try { await idbDelBlob(e); } catch {} }
      lruSave(ids.slice(0, BLOB_LRU_MAX));
    } catch { /* quota or error — blob just won't be cached for this one */ }
  }
  function forgetBlob(id) { idbDelBlob(id); lruSave(lruList().filter((x) => x !== id)); }
  const supportsHandles = typeof window.showOpenFilePicker === 'function';

  // The handle captured during the most recent file pick / drop, awaiting the
  // POST /api/projects that turns it into a project id we can key it under.
  let pendingHandle = null;     // a FileSystemFileHandle or a Promise of one
  // In-flight auto-relink attempts, keyed by project id, started within the
  // project-card click so the GET handler can await them before deciding.
  const pendingAuth = {};
  let currentProjectId = null;   // the project currently open in the editor

  async function storeHandleFor(id) {
    try {
      let h = pendingHandle; pendingHandle = null;
      if (h && typeof h.then === 'function') h = await h;
      if (h && h.kind === 'file') await idbPut(id, h);
    } catch { pendingHandle = null; }
  }
  // Re-link a project's video without asking. Tries, in order:
  //  1) the saved video BLOB (device-local bytes) — fully silent, survives refresh
  //     and days, the primary path that makes reopen "just work" on this device;
  //  2) a saved FileSystemFileHandle (needs a one-time permission re-grant).
  // Only when BOTH miss do we fall back to the manual "locate video" prompt.
  async function relinkFromHandle(id) {
    // 1) blob path — no gesture, no permission.
    try {
      const blob = await idbGetBlob(id);
      if (blob) {
        const file = blob instanceof File ? blob : new File([blob], (captoProject && captoProject.originalName) || 'video', { type: (blob && blob.type) || 'video/mp4' });
        const { url, meta } = await readVideoMeta(file);
        if (window.__captoMedia && window.__captoMedia.url) { try { URL.revokeObjectURL(window.__captoMedia.url); } catch {} }
        window.__captoMedia = { id, file, url, meta };
        return true;
      }
    } catch {}
    // 2) handle path — File System Access (may prompt for permission once).
    if (!supportsHandles) return false;
    try {
      const h = await idbGet(id);
      if (!h) return false;
      let perm = 'granted';
      try { perm = await h.queryPermission({ mode: 'read' }); } catch {}
      if (perm !== 'granted') { try { perm = await h.requestPermission({ mode: 'read' }); } catch {} }
      if (perm !== 'granted') return false;
      const file = await h.getFile(); // throws if the file was moved/deleted
      const { url, meta } = await readVideoMeta(file);
      if (window.__captoMedia && window.__captoMedia.url) { try { URL.revokeObjectURL(window.__captoMedia.url); } catch {} }
      window.__captoMedia = { id, file, url, meta, handle: h };
      return true;
    } catch { return false; }
  }
  function preauthorize(id) {
    if (!id || (window.__captoMedia && window.__captoMedia.id === id)) return;
    pendingAuth[id] = relinkFromHandle(id);
  }
  // Re-pick the local video for a project and (re)link it. Prefers the File
  // System Access picker so we ALSO capture a fresh handle for next-time
  // auto-relink; falls back to a plain file input (this session only).
  async function pickAndLink(id) {
    if (!id) id = currentProjectId;
    if (!id) return false;
    let file = null, handle = null;
    if (supportsHandles) {
      try {
        const picked = await window.showOpenFilePicker({ types: [{ description: 'Video', accept: { 'video/*': ['.mp4', '.mov', '.m4v', '.webm', '.mkv'] } }] });
        handle = picked && picked[0]; if (!handle) return false;
        file = await handle.getFile();
      } catch { return false; } // cancelled
    } else {
      file = await new Promise((res) => {
        const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'video/*'; inp.style.display = 'none';
        inp.onchange = () => res(inp.files && inp.files[0] ? inp.files[0] : null);
        document.body.appendChild(inp); inp.click(); setTimeout(() => { try { inp.remove(); } catch {} }, 1500);
      });
      if (!file) return false;
    }
    if (window.__captoMedia && window.__captoMedia.url) { try { URL.revokeObjectURL(window.__captoMedia.url); } catch {} }
    const { url, meta } = await readVideoMeta(file);
    window.__captoMedia = { id, file, url, meta, handle: handle || undefined };
    if (handle) await idbPut(id, handle); else await idbDel(id);
    await storeBlob(id, file); // so the next reopen is silent
    clearRelink();
    const v = document.getElementById('video');
    if (v) { v.src = url; v.load(); }
    return true;
  }
  window.__captoReplaceSource = () => pickAndLink(currentProjectId);

  // After a silent auto-relink, offer a brief "wrong file?" revert so an
  // accidental/mismatched link can be fixed; auto-dismisses after ~9s.
  function showRelinkRevert(id, name) {
    if (document.getElementById('capto-revert')) return;
    const bar = document.createElement('div');
    bar.id = 'capto-revert';
    bar.style.cssText = 'position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:120;display:flex;align-items:center;gap:12px;background:var(--surface-2,#17171b);border:1px solid var(--line-2,rgba(255,255,255,.12));border-radius:12px;padding:10px 12px 10px 14px;box-shadow:0 16px 40px -12px rgba(0,0,0,.7);font-size:13px;color:var(--text,#f1f1f4);max-width:92vw';
    bar.innerHTML = `<span style="width:7px;height:7px;border-radius:50%;background:#6ee7b7;flex-shrink:0"></span><span>Linked <b>${escHtml(name || 'your video')}</b> from this device.</span>`;
    const btn = document.createElement('button');
    btn.textContent = 'Wrong file? Re-pick';
    btn.style.cssText = 'background:none;border:1px solid var(--line-2,rgba(255,255,255,.14));color:var(--accent-2,#a0c1ff);border-radius:8px;padding:6px 10px;font:inherit;font-size:12.5px;cursor:pointer';
    btn.onclick = async () => { bar.remove(); await pickAndLink(id); };
    const x = document.createElement('button');
    x.textContent = '✕'; x.title = 'Dismiss';
    x.style.cssText = 'background:none;border:none;color:var(--faint,#65656f);cursor:pointer;font-size:14px;padding:2px 6px;line-height:1';
    x.onclick = () => bar.remove();
    bar.appendChild(btn); bar.appendChild(x);
    document.body.appendChild(bar);
    setTimeout(() => { if (bar.parentNode) bar.remove(); }, 9000);
  }

  // Wire up handle capture (so reopening auto-links) + a persistent "replace
  // source" control. All Chromium-gated; other browsers keep the manual flow.
  function setupHandleCapture() {
    const homeDz = document.getElementById('homeDropzone');
    const homeFi = document.getElementById('homeFileInput');
    const grid = document.getElementById('homeGrid');
    // 1) Drag-drop → capture the file's handle BEFORE app.js reads the File.
    if (homeDz) {
      homeDz.addEventListener('drop', (e) => {
        pendingHandle = null;
        try {
          const it = e.dataTransfer && e.dataTransfer.items && e.dataTransfer.items[0];
          // Only capture a handle for an actual video drop — app.js rejects
          // non-videos, so capturing one would leak a wrong handle to a later upload.
          if (it && it.kind === 'file' && /^video\//.test(it.type || '') && typeof it.getAsFileSystemHandle === 'function') {
            pendingHandle = it.getAsFileSystemHandle();
          }
        } catch { pendingHandle = null; }
      }, true);
    }
    // 2) Click-to-pick → use the FS Access picker (captures a handle), then feed
    //    the file into app.js's existing change-driven upload pipeline.
    if (homeDz && homeFi && supportsHandles) {
      homeDz.addEventListener('click', async (e) => {
        if (e.target.closest('#homeTxRow')) return; // engine/lang selects, not the card
        e.preventDefault(); e.stopImmediatePropagation();
        try {
          const picked = await window.showOpenFilePicker({ types: [{ description: 'Video', accept: { 'video/*': ['.mp4', '.mov', '.m4v', '.webm', '.mkv'] } }] });
          const h = picked && picked[0]; if (!h) return;
          pendingHandle = h;
          const file = await h.getFile();
          const dt = new DataTransfer(); dt.items.add(file);
          homeFi.files = dt.files;
          homeFi.dispatchEvent(new Event('change', { bubbles: true }));
        } catch {}
      }, true);
    }
    // 3) Project-card click → pre-authorize the saved handle WITHIN the gesture so
    //    the project opens with its video already linked (no relink prompt).
    if (grid) {
      grid.addEventListener('click', (e) => {
        const card = e.target.closest('.proj'); if (!card) return;
        if (e.target.closest('.del') || e.target.closest('.rn')) return;
        preauthorize(card.dataset.id);
      }, true);
    }
    // 4) Persistent "Replace source" button in the canvas tool bar — if the user
    //    misses the revert toast, they can swap the linked file any time.
    const tools = document.querySelector('.canvas-tools');
    if (tools && !document.getElementById('capto-replace-src')) {
      const sep = document.createElement('span'); sep.className = 'ct-sep';
      const swap = document.createElement('button');
      swap.id = 'capto-replace-src';
      swap.title = 'Replace the source video — link a different local file';
      swap.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>';
      swap.onclick = () => pickAndLink(currentProjectId);
      tools.appendChild(sep); tools.appendChild(swap);
    }
  }

  // The default look for freshly-generated captions: SMALLER text, WIDER lines
  // (the 4-word chunking does that), sitting a bit UP from the bottom — clean and
  // social, not a giant block jammed against the bottom edge.
  function defaultStyle(meta) {
    const H = meta.height || 1920;
    const fontSize = Math.round(H * 0.05);
    return {
      fontFamily: 'Inter', fontSize, weight: 700, italic: false, lineHeight: 1.12, caseMode: 'sentence',
      primaryColor: '#FFFFFF', letterSpacing: -Math.round(fontSize * 0.04), wordSpacing: 0,
      outlineWidth: 0, outlineColor: '#000000',
      shadowEnabled: true, shadowColor: '#000000', shadowOpacity: 60,
      shadowDistance: Math.max(2, Math.round(H * 0.0025)), shadowBlur: Math.max(2, Math.round(H * 0.0035)),
      highlightEnabled: false, highlightColor: '#A0C1FF', highlightScale: 100,
      highlightMode: 'color', highlightBg: '#FFD233', highlightPill: false,
      posX: 0.5, posY: 0.78, entrance: 'none', exit: 'none', animMs: 180,
    };
  }

  // Capto's /api/transcribe returns flat word timings; Subby wants grouped cues.
  // Break into caption lines on pauses / max words / max chars (punchy chunks).
  function wordsToCues(words) {
    // Clean social captions: up to 4 words / ~32 chars per line so lines read
    // SMALLER + WIDER (not giant 1-word blocks), still broken on sentences/pauses.
    const MAXW = 4, MAXGAP = 0.45, MAXCHARS = 32;
    // Timing polish: a caption lingers a beat past its last word (LEAD_OUT), and
    // through SHORT pauses (extends toward the next word, minus GAP_PAD). But on a
    // BIG pause (> HIDE_GAP of silence) it disappears so captions don't hang on
    // screen during dead air.
    const LEAD_OUT = 0.15, GAP_PAD = 0.08, HIDE_GAP = 0.7;
    const flat = [];
    for (const w of words || []) {
      const word = String(w.word || w.text || '').trim();
      if (!word) continue;
      flat.push({ word, start: +w.start, end: +w.end });
    }
    // 1) group into clean, readable chunks. A new caption ALWAYS starts at a
    // sentence end (. ! ? …) or a real pause — we never stack the first word of a
    // new thought onto the tail of the previous one. We also prefer to break at a
    // CLAUSE boundary (comma / dash / colon) once a line has some heft, so breaks
    // land on natural phrase edges instead of mid-thought.
    const endsSentence = (word) => /[.!?…]["'’”\)\]]?$/.test(word);
    const endsClause = (word) => /[,;:—–]["'’”\)\]]?$/.test(word);
    const groups = [];
    let cur = null;
    for (const w of flat) {
      if (!cur) { cur = [w]; continue; }
      const last = cur[cur.length - 1];
      const text = cur.map((x) => x.word).join(' ');
      const hardBreak = endsSentence(last.word) || (w.start - last.end > MAXGAP);
      const full = cur.length >= MAXW || (text.length + w.word.length + 1 > MAXCHARS);
      const clauseBreak = endsClause(last.word) && cur.length >= 2;
      if (hardBreak || full || clauseBreak) { groups.push(cur); cur = [w]; }
      else cur.push(w);
    }
    if (cur) groups.push(cur);
    // Balance a lone trailing word: pull the previous line's last word down so a
    // chunk never ends as a single orphan (unless a sentence/clause forces it).
    for (let i = 1; i < groups.length; i++) {
      const prev = groups[i - 1];
      if (groups[i].length === 1 && prev.length >= 3) {
        const moved = prev[prev.length - 1];
        if (!endsSentence(moved.word) && !endsClause(moved.word) && (groups[i][0].start - moved.end) <= MAXGAP) {
          prev.pop(); groups[i].unshift(moved);
        }
      }
    }
    // 2) build cues, extending the end across small pauses but hiding on big ones
    return groups.map((ws, gi) => {
      const start = ws[0].start;
      const lastEnd = ws[ws.length - 1].end;
      const nextStart = gi + 1 < groups.length ? groups[gi + 1][0].start : Infinity;
      const gap = nextStart - lastEnd;
      let end;
      if (gap > HIDE_GAP) end = lastEnd + LEAD_OUT;                      // big pause → vanish
      else end = Math.min(lastEnd + LEAD_OUT, nextStart - GAP_PAD);      // small pause → persist
      if (!(end > lastEnd)) end = lastEnd + Math.min(LEAD_OUT, 0.06);    // guard
      return { start, end, text: ws.map((w) => w.word).join(' '), words: ws };
    });
  }

  async function transcribe(file, body) {
    const fd = new FormData();
    fd.append('file', file, file.name || 'clip');
    fd.append('language', body.language || 'auto');
    // Forward the chosen engine/model so /api/transcribe can honour it (Auto =
    // let the server pick). The server falls back to the house Groq model when
    // the id is unknown or the user lacks the key, so this is always safe.
    const eng = body.model || body.engine || '';
    if (eng && eng !== 'auto') fd.append('model', eng);
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
    // Pass back the engine that ACTUALLY ran (resolved from "Auto" server-side) so
    // the editor can attribute later edits to the right model for the learning loop.
    return json({ cues: wordsToCues(data.words), language: data.language || body.language, engine: data.engine || null });
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
    // pickAndLink uses the File System Access picker when available, so this
    // manual relink ALSO saves a handle — the next reopen links automatically.
    btn.onclick = () => pickAndLink(id);
    o.appendChild(btn);
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
  // In-browser MediaRecorder can only ever MUX two containers: WebM (everywhere)
  // and MP4/H.264 (recent Chromium + Safari). MOV/MKV/ProRes would need a
  // transcode (ffmpeg.wasm / a server) which Capto's client-only model avoids,
  // so we never offer them as selectable. Honest options only.
  const FORMAT_MIMES = {
    mp4: ['video/mp4;codecs=h264,aac', 'video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4'],
    webm: ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'],
  };
  function mimeForFormat(fmt) {
    for (const m of (FORMAT_MIMES[fmt] || [])) if (window.MediaRecorder && MediaRecorder.isTypeSupported(m)) return m;
    return null;
  }
  function formatSupported(fmt) { return !!mimeForFormat(fmt); }
  // The container the user asked for (read from the export modal), falling back
  // to the auto pick. friend tier always auto (it targets size, not container).
  function resolveExportMime(quality) {
    if (quality !== 'friend') {
      const fmt = getVal('capto-format', '');
      if (fmt) { const m = mimeForFormat(fmt); if (m) return m; }
    }
    return pickExportMime();
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
      } catch { window.__captoSaveHandle = null; /* user revoked / error → fall back to download */ }
    }
    downloadBlob(blob, name);
  }
  async function chooseSaveLocation() {
    if (!supportsSavePicker) return;
    const base = ((window.__captoMedia && window.__captoMedia.file && window.__captoMedia.file.name) || 'video').replace(/\.[^.]+$/, '');
    // Match the suggested extension to the format the user picked, so the saved
    // file's name and its actual bytes agree.
    const ext = extFor(resolveExportMime(currentTier()));
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: `${base}-captioned.${ext}`,
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
    for (const key of ['fontSize', 'letterSpacing', 'wordSpacing', 'outlineWidth', 'shadowDistance', 'shadowBlur'])
      if (typeof s[key] === 'number') out[key] = s[key] * k;
    return out;
  }
  function gradientFill(ctx, x, w) {
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, '#5fe3f5'); g.addColorStop(0.52, '#b8a4ff'); g.addColorStop(1, '#ef79e6');
    return g;
  }
  function roundRectPath(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); return; }
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function drawWord(ctx, text, x, y, s, active, fontPx) {
    const ow = s.outlineWidth || 0;
    const mode = s.highlightMode || 'color';
    const hot = active && s.highlightEnabled;
    const w = ctx.measureText(text).width;

    // HOLLOW (Outline style): inactive words are a stroke outline; the active
    // word fills solid.
    if (s.hollow) {
      ctx.save();
      if (hot) { ctx.fillStyle = s.highlightColor || '#fff'; ctx.fillText(text, x, y); }
      else { ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(1.5, fontPx * 0.045); ctx.strokeStyle = s.primaryColor || '#fff'; ctx.strokeText(text, x, y); }
      ctx.restore();
      return;
    }

    // Box highlight — filled (rounded/pill) rect behind the active word.
    if (hot && mode === 'box') {
      const padX = fontPx * 0.16, padY = fontPx * 0.14;
      const bx = x - padX, by = y - fontPx * 0.5 - padY, bw = w + padX * 2, bh = fontPx + padY * 2;
      const r = s.highlightPill ? bh / 2 : fontPx * 0.16;
      ctx.save(); ctx.fillStyle = s.highlightBg || '#FFD233'; roundRectPath(ctx, bx, by, bw, bh, r); ctx.fill(); ctx.restore();
    }
    // Fill: gradient wash, active-highlight colour, or the base colour.
    const fill = s.gradient ? gradientFill(ctx, x, w) : (hot ? s.highlightColor : s.primaryColor);
    ctx.save();
    if (hot && mode === 'glow') {
      ctx.shadowColor = s.highlightColor; ctx.shadowBlur = fontPx * 0.55; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
    } else if (s.shadowEnabled) {
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
    // Underline highlight
    if (hot && mode === 'underline') {
      ctx.save();
      ctx.strokeStyle = s.highlightBg || s.highlightColor;
      ctx.lineWidth = Math.max(2, fontPx * 0.08);
      ctx.beginPath(); ctx.moveTo(x, y + fontPx * 0.42); ctx.lineTo(x + w, y + fontPx * 0.42); ctx.stroke();
      ctx.restore();
    }
  }
  function drawCue(ctx, cue, t, s, W, H) {
    let fontPx = s.fontSize;
    const baseFont = s.fontSize || 1;
    const weight = typeof s.weight === 'number' ? s.weight : (s.bold ? 700 : 400);
    ctx.save();
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    const setFont = (px) => {
      ctx.font = `${s.italic ? 'italic ' : ''}${weight} ${px}px '${s.fontFamily}'`;
      try { ctx.letterSpacing = ((s.letterSpacing || 0) * (px / baseFont)) + 'px'; } catch {}
    };
    setFont(fontPx);
    const words = (cue.words && cue.words.length) ? cue.words : [{ word: cue.text, start: cue.start, end: cue.end }];
    let aw = -1; for (let k = 0; k < words.length; k++) if (t >= words[k].start) aw = k;
    const toks = words.map((w, i) => ({ text: applyCaseLocal(w.word, s.caseMode), idx: i }));
    const measure = () => { for (const tk of toks) tk.w = ctx.measureText(tk.text).width; return (ctx.measureText(' ').width || fontPx * 0.3) + (s.wordSpacing || 0); };
    const spaceW = measure();
    const hasBox = (typeof s.boxWidth === 'number' && s.boxWidth > 0);
    const maxW = hasBox ? s.boxWidth * W : 0.92 * W;
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
      for (const it of ln.items) { drawWord(ctx, it.text, x, y, s, it.idx === aw, fontPx); x += it.w + spaceW; }
      y += lineH;
    }
    ctx.restore();
  }
  // "Made with Capto" mark burned into free-tier exports. Placed TOP-CENTRE (a
  // bit down from the top) where it sits over the content and is hard to crop or
  // cover — the whole point of a free-tier watermark.
  function drawWatermark(ctx, W, H) {
    const px = Math.round(Math.min(W, H) * 0.032);
    ctx.save();
    ctx.font = `700 ${px}px 'Inter', system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    try { ctx.letterSpacing = '0.01em'; } catch {}
    const y = Math.round(H * 0.06);
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = px * 0.5;
    ctx.shadowOffsetY = px * 0.08;
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.fillText('Made with Capto', W / 2, y);
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
  // Pro/Ultra-only output-format picker for the custom + lossless tiers. Only the
  // containers the browser can actually record are selectable; the rest are shown
  // disabled so the choice stays honest.
  function formatSelectHtml(free) {
    if (free) return '';
    const mp4 = formatSupported('mp4'), webm = formatSupported('webm');
    const last = (function () { try { return localStorage.getItem('capto-export-format') || ''; } catch { return ''; } })();
    const def = (last === 'mp4' && mp4) || (last === 'webm' && webm) ? last : (mp4 ? 'mp4' : 'webm');
    const opt = (val, label, ok) => `<option value="${val}"${val === def ? ' selected' : ''}${ok ? '' : ' disabled'}>${label}${ok ? '' : ' — not supported here'}</option>`;
    const sel = 'width:auto;min-width:100px;display:inline-block;padding:7px 26px 7px 10px;font-size:12.5px';
    return `<label style="font-size:12px;color:var(--muted)">Format <select id="capto-format" style="${sel}">` +
      opt('mp4', 'MP4', mp4) + opt('webm', 'WebM', webm) +
      `</select></label>`;
  }
  function formatHintHtml(free) {
    if (free) return '';
    return `<div style="margin-top:9px;font-size:11px;color:var(--faint)">MP4 plays everywhere (TikTok, Reels, iPhone). WebM is smaller but support varies — pick MP4 if unsure.</div>`;
  }
  // Remember the user's format choice between exports.
  function wireFormatMemory() {
    const f = document.getElementById('capto-format');
    if (f) f.onchange = () => {
      try { localStorage.setItem('capto-export-format', f.value); } catch {}
      // If a save location was already chosen, its filename extension is now
      // stale — drop it so the suggested name matches the newly chosen format.
      if (window.__captoSaveHandle) {
        window.__captoSaveHandle = null;
        const p = document.getElementById('exPath'); if (p && supportsSavePicker) { p.textContent = 'Ask on export'; p.title = ''; }
      }
    };
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
      opts.innerHTML =
        `<div style="display:flex;flex-wrap:wrap;gap:14px;align-items:center">` +
        `<div style="font-size:12px;color:var(--faint);flex:1 1 100%">Full resolution, original audio copied.</div>` +
        formatSelectHtml(free) +
        `</div>` + formatHintHtml(free);
      wireFormatMemory();
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
        formatSelectHtml(free) +
        `</div>` + formatHintHtml(free) +
        (free ? `<div style="margin-top:9px;font-size:11px;color:var(--faint)">Free is capped at 1080p / 30fps. <span style="color:var(--accent-2);cursor:pointer" id="capto-up">Upgrade</span> for send-to-friend, lossless, 60fps, format choice and highest bitrate.</div>` : '');
      const up = document.getElementById('capto-up');
      if (up) up.onclick = goTop('/billing');
      const bsel = document.getElementById('capto-bitrate-sel');
      const bcustom = document.getElementById('capto-bitrate-custom');
      if (bsel && bcustom) bsel.onchange = () => { bcustom.style.display = bsel.value === 'custom' ? 'inline' : 'none'; };
      wireFormatMemory();
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
    const reset = () => {
      step = 0; panel.style.display = 'none'; chosenThumb = null; window.__captoChosenThumb = null;
      // Drop any save-location handle from a previous export session so a new
      // export never silently writes into the wrong (old) file.
      window.__captoSaveHandle = null;
      const p = document.getElementById('exPath'); if (p && supportsSavePicker) { p.textContent = 'Ask on export'; p.title = ''; }
      exStart.textContent = 'Export'; toggle(['tiers', 'capto-export-opts'], true); if (supportsSavePicker) toggle(['exDest'], true);
    };
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
    const mime = resolveExportMime(body.quality);
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
        await storeHandleFor(id); // remember the device file handle (cross-session)
        await storeBlob(id, file); // robust same-device reopen (no prompt)
        currentProjectId = id;
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
            currentProjectId = id;
            // Auto-relink from the saved device handle (kicked off in the card
            // click). If it succeeds the clip is already loaded → no prompt; we
            // briefly offer a "wrong file?" revert. Otherwise fall back to relink.
            let autoLinked = false;
            if (!(window.__captoMedia && window.__captoMedia.id === id)) {
              if (pendingAuth[id]) { try { autoLinked = await pendingAuth[id]; } catch {} delete pendingAuth[id]; }
              if (!autoLinked && !(window.__captoMedia && window.__captoMedia.id === id)) {
                autoLinked = await relinkFromHandle(id); // last try (silent if already granted)
              }
            } else { autoLinked = true; }
            pendingRelinkId = (window.__captoMedia && window.__captoMedia.id === id) ? null : id;
            if (pendingRelinkId === null && autoLinked && (window.__captoMedia && window.__captoMedia.handle)) {
              setTimeout(() => showRelinkRevert(id, st.originalName), 600);
            }
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
        return (async () => { await captoApi.del(id); delete thumbCache[id]; await idbDel(id); forgetBlob(id); return json({ ok: true }); })();
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
  // ── top nav (home): Capto logo left, settings gear + profile dropdown right ──
  function toggleTheme() {
    const next = (localStorage.getItem('subby-theme') === 'light') ? 'dark' : 'light';
    localStorage.setItem('subby-theme', next);
    document.body.classList.toggle('theme-light', next === 'light');
    document.body.classList.toggle('theme-dark', next !== 'light');
  }
  async function signOut() {
    try { await realFetch('/api/auth/sign-out', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }); } catch {}
    try { window.top.location.href = '/signin'; } catch { window.location.href = '/signin'; }
  }
  function closeProfileMenu() {
    const m = document.getElementById('capto-menu');
    if (m) m.remove();
    document.removeEventListener('pointerdown', onDocDown, true);
  }
  function onDocDown(e) {
    const m = document.getElementById('capto-menu');
    const p = document.getElementById('capto-pfp');
    if (m && !m.contains(e.target) && p && !p.contains(e.target)) closeProfileMenu();
  }
  function openProfileMenu(pfp) {
    const u = window.__captoUser || {};
    const r = pfp.getBoundingClientRect();
    const nm = u.name || (u.email ? u.email.split('@')[0] : 'Account');
    const menu = document.createElement('div');
    menu.id = 'capto-menu';
    menu.className = 'capto-menu';
    const icSettings = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>';
    const icBilling = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>';
    const icTheme = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 000 16z" fill="currentColor" stroke="none"/></svg>';
    const icOut = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>';
    const isAdmin = (u.email || '').toLowerCase() === 'augustas.armalis@aiacquisition.com';
    const icLearn = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 4.6L18.5 9l-4.6 1.9L12 15.5 10.1 10.9 5.5 9l4.6-1.4z"/></svg>';
    menu.innerHTML =
      `<div class="hd"><div class="nm2">${escHtml(nm)}</div><div class="em">${escHtml(u.email || '')}</div></div>` +
      `<div class="sep"></div>` +
      `<button data-a="settings">${icSettings} Settings</button>` +
      `<button data-a="billing">${icBilling} Billing</button>` +
      (isAdmin ? `<button data-a="learning">${icLearn} Learning (admin)</button>` : '') +
      `<button data-a="theme">${icTheme} Toggle theme</button>` +
      `<div class="sep"></div>` +
      `<button data-a="signout">${icOut} Sign out</button>`;
    document.body.appendChild(menu);
    menu.style.top = (r.bottom + 8) + 'px';
    menu.style.right = Math.max(12, window.innerWidth - r.right) + 'px';
    menu.querySelector('[data-a="settings"]').onclick = goTop('/settings');
    menu.querySelector('[data-a="billing"]').onclick = goTop('/billing');
    if (isAdmin) menu.querySelector('[data-a="learning"]').onclick = goTop('/admin/learning');
    menu.querySelector('[data-a="theme"]').onclick = () => { toggleTheme(); closeProfileMenu(); };
    menu.querySelector('[data-a="signout"]').onclick = () => { closeProfileMenu(); signOut(); };
    setTimeout(() => document.addEventListener('pointerdown', onDocDown, true), 0);
  }
  let homeNavObserver = null;
  function renderHomeNav() {
    const topbar = document.querySelector('.topbar');
    if (!topbar) return;
    const u = window.__captoUser || {};
    let nav = document.getElementById('capto-nav');
    if (!nav) {
      nav = document.createElement('div');
      nav.id = 'capto-nav';
      nav.className = 'capto-nav';
      topbar.appendChild(nav);
      const homeView = document.getElementById('homeView');
      const sync = () => { nav.style.display = homeView && !homeView.hidden ? '' : 'none'; };
      sync();
      if (homeView && !homeNavObserver) {
        homeNavObserver = new MutationObserver(sync);
        homeNavObserver.observe(homeView, { attributes: true, attributeFilter: ['hidden'] });
      }
    }
    if (!u.signedIn) {
      nav.innerHTML = `<button class="btn ghost" id="capto-signin">Sign in</button>`;
      const si = document.getElementById('capto-signin');
      if (si) si.onclick = goTop('/signin');
      return;
    }
    const nm = u.name || (u.email ? u.email.split('@')[0] : 'Account');
    const initial = (nm.trim()[0] || 'A').toUpperCase();
    // Matches the platform AppNav (settings/billing): avatar + chevron, opening
    // a consistent account dropdown. Settings/Billing live inside the menu.
    nav.innerHTML =
      `<button class="capto-pfp" id="capto-pfp" title="Account"><span class="av">${initial}</span><svg class="capto-chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg></button>`;
    const pfp = document.getElementById('capto-pfp');
    if (pfp) pfp.onclick = (e) => { e.stopPropagation(); document.getElementById('capto-menu') ? closeProfileMenu() : openProfileMenu(pfp); };
  }

  // Minutes indicator + the watermark/quota note in the export modal.
  // Idempotent — safe to call before and after /api/studio/me resolves.
  function renderQuotaUI() {
    const u = window.__captoUser || {};
    const lbl = minutesLabel(u);
    const canTopUp = u.plan === 'free' || u.plan === 'pro';

    renderHomeNav();

    // Big colourful minutes card on the home, ABOVE the dropzone.
    const wrap = document.querySelector('.home-wrap');
    const anchor = document.getElementById('homeDropzone');
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
    // Home "Settings" button jumps to Capto's account settings (legacy; the nav
    // gear handles this now, but keep it wired if present).
    const s = document.getElementById('homeSettings');
    if (s) s.addEventListener('click', goTop('/settings'));
    // The engine/language selects live INSIDE the dropzone — stop their clicks
    // from bubbling up and triggering the file picker.
    const tx = document.getElementById('homeTxRow');
    if (tx) ['click', 'pointerdown', 'mousedown'].forEach((ev) => tx.addEventListener(ev, (e) => e.stopPropagation()));
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
    // "Powered by Contles" chip at the foot of the home — clickable → Contles.
    const wrap = document.querySelector('.home-wrap');
    if (wrap && !document.getElementById('capto-contles')) {
      const c = document.createElement('div');
      c.id = 'capto-contles';
      c.style.cssText = 'margin:36px 0 8px;display:flex;justify-content:center';
      c.innerHTML =
        `<a href="https://contles.com?ref=capto" target="_blank" rel="noopener noreferrer" ` +
        `style="display:inline-flex;align-items:center;gap:7px;font-size:11.5px;color:var(--faint);text-decoration:none;` +
        `border:1px solid var(--line);border-radius:99px;padding:6px 13px;transition:.14s">` +
        `<span style="width:6px;height:6px;border-radius:50%;background:linear-gradient(120deg,#82a5ff,#62d8ff)"></span>` +
        `Powered by <b style="color:var(--text);font-weight:600">Contles</b></a>`;
      const a = c.querySelector('a');
      if (a) { a.onmouseenter = () => { a.style.borderColor = 'var(--line-2)'; a.style.color = 'var(--muted)'; }; a.onmouseleave = () => { a.style.borderColor = 'var(--line)'; a.style.color = 'var(--faint)'; }; }
      wrap.appendChild(c);
    }
    setupSafeZones();
    setupExportOptions();
    setupThumbPicker();
    setupHandleCapture();
    renderQuotaUI();
    fetchMe();
  });
})();
