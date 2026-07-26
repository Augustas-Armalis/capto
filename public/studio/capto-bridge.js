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
  // Capto runs ONE engine for everyone: Whisper Large v3 (managed, house key).
  // Regular/free/friend users never see this picker (it's admin-only) and always
  // get Whisper. The on-device engine was removed — it was unreliable across
  // machines and Whisper is simply better. Admins can still inspect the model.
  window.__captoModels = [
    { id: 'groq-whisper-large-v3', label: 'Whisper Large v3', minPlan: 'free' },
  ];
  // Full Whisper language set (~98 langs, ISO-639-1) — searchable in the editor's
  // custom language dropdown. Auto-detect + the most-used languages (incl.
  // Lithuanian) are pinned to the TOP; the rest follow alphabetically.
  window.__captoLangs = [
    ['auto', 'Auto-detect'],
    // ── Capto focus languages, always pinned first ──
    ['lt', 'Lithuanian'], ['en', 'English'],
    // ── other popular languages ──
    ['es', 'Spanish'], ['pt', 'Portuguese'], ['fr', 'French'],
    ['de', 'German'], ['it', 'Italian'], ['nl', 'Dutch'], ['ru', 'Russian'],
    ['pl', 'Polish'], ['uk', 'Ukrainian'], ['tr', 'Turkish'],
    ['ar', 'Arabic'], ['hi', 'Hindi'], ['ja', 'Japanese'], ['ko', 'Korean'],
    ['zh', 'Chinese'],
    // ── the rest, alphabetical ──
    ['af', 'Afrikaans'], ['sq', 'Albanian'], ['am', 'Amharic'],
    ['hy', 'Armenian'], ['az', 'Azerbaijani'], ['ba', 'Bashkir'], ['eu', 'Basque'],
    ['be', 'Belarusian'], ['bn', 'Bengali'], ['bs', 'Bosnian'], ['br', 'Breton'],
    ['bg', 'Bulgarian'], ['my', 'Burmese'], ['ca', 'Catalan'],
    ['hr', 'Croatian'], ['cs', 'Czech'], ['da', 'Danish'],
    ['et', 'Estonian'], ['fo', 'Faroese'], ['fi', 'Finnish'],
    ['gl', 'Galician'], ['ka', 'Georgian'],
    ['el', 'Greek'], ['gu', 'Gujarati'], ['ht', 'Haitian Creole'], ['ha', 'Hausa'],
    ['haw', 'Hawaiian'], ['he', 'Hebrew'], ['hu', 'Hungarian'],
    ['is', 'Icelandic'], ['id', 'Indonesian'],
    ['jw', 'Javanese'], ['kn', 'Kannada'], ['kk', 'Kazakh'], ['km', 'Khmer'],
    ['lo', 'Lao'], ['la', 'Latin'], ['lv', 'Latvian'],
    ['ln', 'Lingala'], ['lb', 'Luxembourgish'], ['mk', 'Macedonian'],
    ['mg', 'Malagasy'], ['ms', 'Malay'], ['ml', 'Malayalam'], ['mt', 'Maltese'],
    ['mi', 'Maori'], ['mr', 'Marathi'], ['mn', 'Mongolian'], ['ne', 'Nepali'],
    ['no', 'Norwegian'], ['nn', 'Norwegian Nynorsk'], ['oc', 'Occitan'], ['ps', 'Pashto'],
    ['fa', 'Persian'], ['pa', 'Punjabi'],
    ['ro', 'Romanian'], ['sa', 'Sanskrit'], ['sr', 'Serbian'],
    ['sn', 'Shona'], ['sd', 'Sindhi'], ['si', 'Sinhala'], ['sk', 'Slovak'],
    ['sl', 'Slovenian'], ['so', 'Somali'], ['su', 'Sundanese'],
    ['sw', 'Swahili'], ['sv', 'Swedish'], ['tl', 'Tagalog'], ['tg', 'Tajik'],
    ['ta', 'Tamil'], ['tt', 'Tatar'], ['te', 'Telugu'], ['th', 'Thai'],
    ['bo', 'Tibetan'], ['tk', 'Turkmen'],
    ['ur', 'Urdu'], ['uz', 'Uzbek'], ['vi', 'Vietnamese'], ['cy', 'Welsh'],
    ['yi', 'Yiddish'], ['yo', 'Yoruba'],
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
        applyEngineVisibility();
      }
    } catch { /* keep defaults */ }
  }
  // There is one production caption engine: Whisper Large v3. Model selection is
  // an implementation detail, never a user decision (including admin accounts).
  function applyEngineVisibility() {
    ['homeEngine', 'editEngine', 'uploadEngine', 'setEngine'].forEach((id) => {
      const sel = document.getElementById(id);
      if (!sel) return;
      const box = sel.closest('label') || sel.closest('.capto-combo') || sel;
      box.style.display = 'none';
    });
  }
  window.__captoApplyEngineVisibility = applyEngineVisibility;
  window.__captoRenderQuotaUI = function () { try { renderQuotaUI(); } catch {} };
  // Exposed for debugging/verification of the caption engine.
  window.__captoWordsToCues = function (w, mw, sil, lang, duration) { return wordsToCues(w, mw, sil, lang, duration); };
  window.__captoDetectSilences = function (s, sr) { return detectSilences(s, sr || 16000); };

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

  // The default look for freshly-generated captions: compact, bold text in a
  // wide editable box, sitting a bit UP from the bottom — clean and
  // social, not a giant block jammed against the bottom edge.
  // Bump when the default look changes in a way that should reset every user's
  // saved "default style" once (loadDefaultStyle in app.js drops older versions).
  const STYLE_VERSION = 4;
  function defaultStyle(meta) {
    const H = meta.height || 1920;
    const fontSize = Math.round(H * 0.043);
    return {
      fontFamily: 'Inter', fontSize, weight: 700, italic: false, lineHeight: 1.06,
      // Keep Whisper's own (correct) capitalisation — don't force sentence-case,
      // which wrongly capitalises the first word of every caption fragment.
      caseMode: 'none',
      primaryColor: '#FFFFFF', letterSpacing: -Math.round(fontSize * 0.045), wordSpacing: 0,
      outlineWidth: 0, outlineColor: '#000000',
      shadowEnabled: true, shadowColor: '#000000', shadowOpacity: 52,
      shadowDistance: Math.max(1, Math.round(H * 0.0016)), shadowBlur: Math.max(3, Math.round(H * 0.0042)),
      // THE default look: plain Inter, clean white text, NO per-word highlight —
      // no word turning yellow, no colour change, no zoom. Just readable
      // captions. The colour/box/glow "highlight" presets opt back in; here it's
      // OFF for everyone. (Mirrors the 'inter' preset in caption-presets.js.)
      highlightEnabled: false, highlightColor: '#FFD233', highlightScale: 100,
      highlightMode: 'color', highlightBg: '#FFD233', highlightPill: false,
      // A WIDE text box by default (0.82 of the frame width): captions sit in a
      // generous, easy-to-grab box so you can move it, resize from the corners,
      // and widen/narrow from the side handles right away — no hunting for a tiny
      // 1–2 word target. Text stays centred inside the box.
      boxWidth: 0.84, singleWord: false,
      posX: 0.5, posY: 0.72, entrance: 'none', exit: 'none', animMs: 180,
      _sv: STYLE_VERSION,
    };
  }

  // Capto's /api/transcribe returns flat word timings; Subby wants grouped cues.
  // Break into caption lines on pauses / max words / max chars (punchy chunks).
  // Trim each word's [start,end] to the actual voiced region using detected
  // silences — kills Whisper's habit of stretching a word's end across a pause,
  // so the caption hides right when the speaker stops. `silences` is sorted by
  // start (output of detectSilences). Mutates `flat` in place.
  function trimWordsToSilence(flat, silences) {
    if (!silences || !silences.length || !flat || !flat.length) return;
    const MIN = 0.04;
    let si = 0;
    for (const w of flat) {
      while (si < silences.length && silences[si].end <= w.start) si++;
      for (let k = si; k < silences.length && silences[k].start < w.end; k++) {
        const s = silences[k];
        // Silence begins partway through the word → the voice stopped there.
        if (s.start > w.start + MIN && s.start < w.end) w.end = Math.max(w.start + MIN, s.start);
        // Silence covers the word's onset → the voice actually starts at s.end.
        if (s.start <= w.start && s.end > w.start + MIN && s.end < w.end) w.start = Math.min(w.end - MIN, s.end);
      }
    }
  }

  function wordsToCues(words, maxWordsOverride, silences, language, duration) {
    // Caption Engine v5 is the single production segmenter. Keep the older code
    // below as a last-resort fallback for a stale cached HTML page that failed to
    // load caption-engine.js; new and exported projects always take this path.
    if (window.CaptoCaptionEngine && typeof window.CaptoCaptionEngine.wordsToCues === 'function') {
      return window.CaptoCaptionEngine.wordsToCues(words, {
        language: language || 'en',
        duration: Number.isFinite(duration) ? duration : Infinity,
        maxWords: maxWordsOverride === 1 ? 1 : 3,
        oneWord: maxWordsOverride === 1,
        silences: silences || [],
      });
    }
    // Built from real per-word timing, then grouped into short 1–2 word displays
    // — but ONLY across words spoken back-to-back. A natural pause (> MAXGAP)
    // always ends the caption, so we never stretch a phrase through silence and
    // never break awkwardly mid-flow. MAXGAP is aligned with the hide threshold
    // below, so any gap that ends a caption is also a gap where it disappears.
    // maxWordsOverride=1 → strict one-word-per-caption (the "One word" regen).
    // MAXGAP is the pause that starts a NEW caption line: words closer than this
    // group onto the same line (continuous flow); a longer gap begins a fresh
    // line. This only affects LINE GROUPING — a gap here does NOT blank the
    // screen (that's HIDE_GAP below), so short gaps never cause a flicker.
    const MAXW = maxWordsOverride || 2, MAXGAP = 0.5, MAXCHARS = 26;
    // A caption appears a hair BEFORE its first word (LEAD_IN) — Whisper marks
    // word onsets a touch late, so this lands the caption right on the voice.
    // LEAD_OUT is only used when a REAL pause follows (see HIDE_GAP below): the
    // caption lingers a beat past the last word, then the screen clears for the
    // silence. Back-to-back captions instead hand off with no gap at all.
    const LEAD_IN = 0.06, LEAD_OUT = 0.08;
    // ── sanitize raw word timings (KEEP the real starts — don't shift words) ──
    // Only drop empties/NaN and guarantee a minimum visible duration. We do NOT
    // push overlapping words forward (that drifted captions behind the audio);
    // Whisper's real per-word starts are what make the timing land.
    const MIN_WORD = 0.04;
    const flat = [];
    for (const w of words || []) {
      const word = String(w.word || w.text || '').trim();
      if (!word) continue;
      let start = +w.start, end = +w.end;
      if (!isFinite(start)) start = flat.length ? flat[flat.length - 1].end : 0;
      start = Math.max(0, start);
      if (!isFinite(end) || end <= start) end = start + MIN_WORD;
      flat.push({ word, start, end });
    }
    flat.sort((a, b) => a.start - b.start);
    // Snap word timings to the real voice using audio-detected silences, THEN
    // group — so a pause Whisper papered over becomes a true gap that ends the
    // caption and shows empty space.
    trimWordsToSilence(flat, silences);
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
      if (groups[i].length === 1 && prev.length >= 2) {
        const moved = prev[prev.length - 1];
        if (!endsSentence(moved.word) && !endsClause(moved.word) && (groups[i][0].start - moved.end) <= MAXGAP) {
          prev.pop(); groups[i].unshift(moved);
        }
      }
    }
    // 2) build cues so captions track the voice MILLISECOND-TO-MILLISECOND with
    // no dead air between them. Each caption starts a hair before its first word
    // and — this is the key fix — stays on screen right up until the NEXT caption
    // appears, so continuous speech is captioned continuously (no blank flicker
    // between lines / words). The screen only goes empty for a REAL pause: when
    // the silence before the next caption is longer than HIDE_GAP. This is what
    // makes word-by-word feel perfect and kills the "stupid gaps".
    const HIDE_GAP = 0.5; // silence longer than this (s) blanks the screen
    let prevEnd = 0;
    return groups.map((ws, gi) => {
      const realStart = ws[0].start, realEnd = ws[ws.length - 1].end;
      const next = groups[gi + 1];
      const nextStart = next ? next[0].start : Infinity;
      const start = Math.max(prevEnd, realStart - LEAD_IN, 0);
      let end;
      if (isFinite(nextStart) && nextStart - realEnd <= HIDE_GAP) {
        // Continuous speech (or only a brief gap) → hand straight off to the next
        // caption with no empty frame in between.
        end = Math.max(nextStart - LEAD_IN, realEnd, start + 0.10);
      } else {
        // Real pause (or the very last caption) → end just after the last word so
        // the screen is empty during the silence.
        end = Math.max(realEnd + LEAD_OUT, start + 0.10);
      }
      prevEnd = end;
      return { start, end, text: ws.map((w) => w.word).join(' '), words: ws };
    });
  }

  // ───────────────── long-video handling: client-side audio extraction ─────
  // Whisper (Groq/OpenAI) rejects files over ~25MB and the worker times out at
  // 60s — so a raw 20-min+ video fails. We decode the audio in the browser,
  // downmix to mono @16kHz, and split it into short WAV chunks. Each chunk is
  // transcribed and the word timings are stitched back with a time offset. If
  // extraction isn't possible (codec/oversized/no WebAudio), we fall back to a
  // single raw upload (the server routes large paid-tier files to Deepgram).
  // Whisper Large v3 is trained around short context windows. Thirty-second
  // chunks keep alignment local and substantially reduce timestamp drift; a
  // short overlap still protects words that straddle a boundary. Very long
  // videos expand the window only enough to stay below the API's request limit.
  const AUDIO_SR = 16000, MIN_CHUNK_SEC = 30, CHUNK_OVERLAP_SEC = 0.8, MAX_CHUNKS = 28;

  function encodeWav(samples, sampleRate) {
    const n = samples.length;
    const buffer = new ArrayBuffer(44 + n * 2);
    const view = new DataView(buffer);
    const ws = (o, s) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };
    ws(0, 'RIFF'); view.setUint32(4, 36 + n * 2, true); ws(8, 'WAVE');
    ws(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
    ws(36, 'data'); view.setUint32(40, n * 2, true);
    let o = 44;
    for (let i = 0; i < n; i++) { const s = Math.max(-1, Math.min(1, samples[i])); view.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true); o += 2; }
    return buffer;
  }

  function resampleMono(samples, sourceRate) {
    if (!samples || !samples.length || !sourceRate) return null;
    if (Math.round(sourceRate) === AUDIO_SR) return Float32Array.from(samples);
    const out = new Float32Array(Math.max(1, Math.ceil(samples.length * AUDIO_SR / sourceRate)));
    const ratio = sourceRate / AUDIO_SR;
    for (let i = 0; i < out.length; i++) {
      const at = Math.min(samples.length - 1, i * ratio);
      const a = Math.floor(at), b = Math.min(samples.length - 1, a + 1), mix = at - a;
      out[i] = samples[a] + (samples[b] - samples[a]) * mix;
    }
    return out;
  }

  // WebAudio cannot decode a number of perfectly valid QuickTime audio tracks
  // (notably the LPCM tracks produced by iPhones, cameras and editing apps).
  // Read those tracks directly with mp4box instead of uploading the entire MOV
  // to Whisper, where it would exceed the provider's file-size limit.
  function isIsoMedia(file) {
    const name = String(file && file.name || '').toLowerCase();
    const type = String(file && file.type || '').toLowerCase();
    return /\.(mov|mp4|m4v)$/.test(name) || /(quicktime|mp4)/.test(type);
  }

  function trackDurationSec(track) {
    return Number(track && track.duration) / Math.max(1, Number(track && track.timescale) || 1);
  }

  function longestTrack(tracks, predicate) {
    return (tracks || [])
      .filter(predicate)
      .sort((a, b) => trackDurationSec(b) - trackDurationSec(a))[0] || null;
  }

  function hasExpectedAudioLength(samples, expectedDuration) {
    if (!samples || !samples.length) return false;
    if (!Number.isFinite(expectedDuration) || expectedDuration < 30) return true;
    // Containers commonly differ from the video element by a few hundred ms.
    // Anything below 85% is a real partial decode, not metadata rounding.
    return samples.length / AUDIO_SR >= expectedDuration * 0.85;
  }

  async function decodeIsoPcmMono(file) {
    if (!isIsoMedia(file)) return null;
    const MP4Box = await loadMp4Box();
    const mp4 = MP4Box.createFile();
    const pcmCodecs = /^(lpcm|sowt|twos|fl32|fl64|in24|in32|raw\s*)$/i;

    return await new Promise((resolve, reject) => {
      let track = null, cfg = null, mono = null, written = 0, received = 0, expected = Infinity;
      let settled = false;
      const finish = (value, error) => {
        if (settled) return;
        settled = true; clearTimeout(timeout);
        try { mp4.stop(); } catch {}
        if (error) reject(error); else resolve(value);
      };
      const timeout = setTimeout(() => finish(null, new Error('audio demux timeout')), 45000);

      const parseConfig = (audioTrack) => {
        const trak = mp4.getTrackById(audioTrack.id);
        const entry = trak && trak.mdia && trak.mdia.minf && trak.mdia.minf.stbl && trak.mdia.minf.stbl.stsd && trak.mdia.minf.stbl.stsd.entries && trak.mdia.minf.stbl.stsd.entries[0];
        const raw = entry && entry.data instanceof Uint8Array ? entry.data : new Uint8Array(entry && entry.data || 0);
        const dv = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
        const version = raw.length >= 2 ? dv.getUint16(0, false) : 0;
        let sampleRate = Number(audioTrack.audio && audioTrack.audio.sample_rate) || Number(audioTrack.timescale) || 0;
        let channels = Number(audioTrack.audio && audioTrack.audio.channel_count) || 1;
        let bits = Number(audioTrack.audio && audioTrack.audio.sample_size) || 16;
        let flags = 0, bytesPerFrame = 0;
        if (version === 2 && raw.length >= 56) {
          sampleRate = dv.getFloat64(24, false) || sampleRate;
          channels = dv.getUint32(32, false) || channels;
          bits = dv.getUint32(40, false) || bits;
          flags = dv.getUint32(44, false);
          bytesPerFrame = dv.getUint32(48, false);
        } else if (raw.length >= 20) {
          channels = dv.getUint16(8, false) || channels;
          bits = dv.getUint16(10, false) || bits;
          sampleRate = dv.getUint32(16, false) / 65536 || sampleRate;
          if (/^sowt$/i.test(audioTrack.codec)) flags = 4; // signed, little-endian
          else if (/^(twos|in24|in32)$/i.test(audioTrack.codec)) flags = 4 | 2;
          else if (/^(fl32|fl64)$/i.test(audioTrack.codec)) flags = 1 | 2;
        }
        channels = Math.max(1, Math.min(32, Math.round(channels)));
        bits = [8, 16, 24, 32, 64].includes(bits) ? bits : 16;
        bytesPerFrame = bytesPerFrame || channels * Math.ceil(bits / 8);
        if (!Number.isFinite(sampleRate) || sampleRate < 4000 || sampleRate > 384000 || bytesPerFrame < channels) throw new Error('unsupported PCM description');
        return { sampleRate, channels, bits, flags, bytesPerFrame };
      };

      const readSample = (dv, offset) => {
        const little = !(cfg.flags & 2), isFloat = !!(cfg.flags & 1), isSigned = !!(cfg.flags & 4);
        if (isFloat && cfg.bits === 32) return dv.getFloat32(offset, little);
        if (isFloat && cfg.bits === 64) return dv.getFloat64(offset, little);
        if (cfg.bits === 8) return isSigned ? dv.getInt8(offset) / 128 : (dv.getUint8(offset) - 128) / 128;
        if (cfg.bits === 16) return dv.getInt16(offset, little) / 32768;
        if (cfg.bits === 24) {
          let n = little
            ? dv.getUint8(offset) | (dv.getUint8(offset + 1) << 8) | (dv.getUint8(offset + 2) << 16)
            : (dv.getUint8(offset) << 16) | (dv.getUint8(offset + 1) << 8) | dv.getUint8(offset + 2);
          if (n & 0x800000) n |= 0xff000000;
          return n / 8388608;
        }
        return dv.getInt32(offset, little) / 2147483648;
      };

      mp4.onError = (e) => finish(null, new Error('audio demux: ' + e));
      mp4.onReady = (info) => {
        track = longestTrack(
          [...(info.audioTracks || []), ...(info.tracks || [])],
          (t) => pcmCodecs.test(String(t.codec || '').trim()),
        );
        if (!track || !pcmCodecs.test(String(track.codec || '').trim())) { finish(null, new Error('no supported PCM audio track')); return; }
        try { cfg = parseConfig(track); }
        catch (e) { finish(null, e); return; }
        expected = Math.max(1, Number(track.nb_samples) || 1);
        const estimatedFrames = Math.max(expected, Math.ceil((Number(track.duration) || 0) / Math.max(1, Number(track.timescale) || cfg.sampleRate) * cfg.sampleRate));
        mono = new Float32Array(estimatedFrames + 8);
        mp4.setExtractionOptions(track.id, null, { nbSamples: 10000 });
        mp4.start();
      };
      mp4.onSamples = (id, user, samples) => {
        if (!track || id !== track.id || settled) return;
        for (const sample of samples) {
          received++;
          const bytes = sample.data instanceof Uint8Array ? sample.data : new Uint8Array(sample.data || 0);
          const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
          const frames = Math.floor(bytes.byteLength / cfg.bytesPerFrame);
          if (written + frames > mono.length) {
            const grown = new Float32Array(Math.max(written + frames, mono.length * 2));
            grown.set(mono); mono = grown;
          }
          const bytesPerChannel = Math.ceil(cfg.bits / 8);
          for (let f = 0; f < frames; f++) {
            let sum = 0;
            for (let c = 0; c < cfg.channels; c++) sum += readSample(dv, f * cfg.bytesPerFrame + c * bytesPerChannel);
            const value = sum / cfg.channels;
            mono[written++] = Number.isFinite(value) ? Math.max(-1, Math.min(1, value)) : 0;
          }
        }
        if (received >= expected) finish(resampleMono(mono.subarray(0, written), cfg.sampleRate));
      };
      (async () => {
        const step = 8 * 1024 * 1024;
        for (let offset = 0; offset < file.size && !settled; offset += step) {
          const end = Math.min(file.size, offset + step);
          const ab = await file.slice(offset, end).arrayBuffer(); ab.fileStart = offset;
          mp4.appendBuffer(ab);
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
        if (!settled) mp4.flush();
      })().catch((e) => finish(null, e));
    });
  }

  // AAC inside MP4/MOV is normally handled by WebAudio, but some browser/file
  // combinations reject the whole container. Demux the compressed AAC track and
  // decode it with WebCodecs so a large video is never uploaded as one raw file.
  async function decodeIsoAacMono(file) {
    if (typeof AudioDecoder === 'undefined' || typeof EncodedAudioChunk === 'undefined') return null;
    if (!isIsoMedia(file)) return null;
    const MP4Box = await loadMp4Box();
    const mp4 = MP4Box.createFile();
    const rates = [96000, 88200, 64000, 48000, 44100, 32000, 24000, 22050, 16000, 12000, 11025, 8000, 7350];

    return await new Promise((resolve, reject) => {
      let track = null, decoder = null, expected = Infinity, received = 0, finalizing = false, settled = false;
      const pieces = []; let total = 0;
      const finish = (value, error) => {
        if (settled) return;
        settled = true; clearTimeout(timeout);
        try { mp4.stop(); } catch {}
        try { if (decoder && decoder.state !== 'closed') decoder.close(); } catch {}
        if (error) reject(error); else resolve(value);
      };
      const timeout = setTimeout(() => finish(null, new Error('AAC audio preparation timed out')), 45000);
      const complete = async () => {
        if (finalizing || settled) return;
        finalizing = true;
        try {
          await withTimeout(decoder.flush(), 20000, 'AAC decoding stalled.');
          const out = new Float32Array(total); let at = 0;
          for (const piece of pieces) { out.set(piece, at); at += piece.length; }
          finish(out.length ? out : null);
        } catch (e) { finish(null, e); }
      };
      mp4.onError = (e) => finish(null, new Error('AAC demux: ' + e));
      mp4.onReady = (info) => {
        track = longestTrack(
          [...(info.audioTracks || []), ...(info.tracks || [])],
          (t) => /^mp4a(?:\.|$)/i.test(String(t.codec || '')),
        );
        if (!track) { finish(null, new Error('no AAC audio track')); return; }
        const sampleRate = Number(track.audio && track.audio.sample_rate) || Number(track.timescale) || 48000;
        const channels = Math.max(1, Math.min(8, Number(track.audio && track.audio.channel_count) || 2));
        const freqIndex = rates.indexOf(sampleRate);
        if (freqIndex < 0) { finish(null, new Error('unsupported AAC sample rate')); return; }
        const description = new Uint8Array([(2 << 3) | (freqIndex >> 1), ((freqIndex & 1) << 7) | (channels << 3)]);
        const config = { codec: String(track.codec || 'mp4a.40.2'), sampleRate, numberOfChannels: channels, description };
        expected = Math.max(1, Number(track.nb_samples) || 1);
        (async () => {
          const support = typeof AudioDecoder.isConfigSupported === 'function' ? await AudioDecoder.isConfigSupported(config) : { supported: true };
          if (!support || !support.supported || settled) throw new Error('AAC decoder unsupported');
          decoder = new AudioDecoder({
            output: (data) => {
              try {
                const mono = new Float32Array(data.numberOfFrames);
                for (let c = 0; c < data.numberOfChannels; c++) {
                  const plane = new Float32Array(data.numberOfFrames);
                  data.copyTo(plane, { planeIndex: c, format: 'f32-planar' });
                  for (let i = 0; i < mono.length; i++) mono[i] += plane[i] / data.numberOfChannels;
                }
                const part = resampleMono(mono, data.sampleRate);
                if (part && part.length) { pieces.push(part); total += part.length; }
              } catch (e) { finish(null, e); }
              finally { data.close(); }
            },
            error: (e) => finish(null, e),
          });
          decoder.configure(config);
          mp4.setExtractionOptions(track.id, null, { nbSamples: 500 });
          mp4.start();
        })().catch((e) => finish(null, e));
      };
      mp4.onSamples = (id, user, samples) => {
        if (!decoder || !track || id !== track.id || settled) return;
        try {
          for (const sample of samples) {
            received++;
            decoder.decode(new EncodedAudioChunk({
              type: 'key',
              timestamp: Math.round((sample.cts / sample.timescale) * 1e6),
              duration: Math.max(1, Math.round((sample.duration / sample.timescale) * 1e6)),
              data: sample.data,
            }));
          }
          // A 4K two-minute source can be hundreds of MB even though its mono
          // audio is only a few MB. Release demuxed sample buffers as soon as
          // WebCodecs has copied them so long videos do not exhaust browser RAM.
          try { mp4.releaseUsedSamples(track.id, received); } catch {}
          if (received >= expected) void complete();
        } catch (e) { finish(null, e); }
      };
      (async () => {
        const step = 8 * 1024 * 1024;
        for (let offset = 0; offset < file.size && !settled; offset += step) {
          const end = Math.min(file.size, offset + step);
          const ab = await file.slice(offset, end).arrayBuffer(); ab.fileStart = offset;
          mp4.appendBuffer(ab);
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
        if (!settled) mp4.flush();
      })().catch((e) => finish(null, e));
    });
  }

  // Decode any media file → mono Float32 PCM @16kHz (what both Whisper and the
  // WAV chunker want). Returns a fresh copy so it can be transferred zero-copy.
  async function decodeMono16k(file, expectedDuration) {
    const AC = window.AudioContext || window.webkitAudioContext;
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!file || !file.size) return null;
    let best = null;
    const directFirst = isIsoMedia(file) && (
      file.size >= 48 * 1024 * 1024 ||
      (Number.isFinite(expectedDuration) && expectedDuration >= 75)
    );

    // decodeAudioData() silently returned only the first ~20 seconds of the
    // reported 120-second 4K MP4 in production. Large ISO-BMFF files now bypass
    // that whole-container decoder and demux their small audio track directly.
    if (directFirst) {
      setTranscribeStatus('Preparing complete video audio…');
      try {
        const aac = await decodeIsoAacMono(file);
        if (aac && aac.length) {
          best = aac;
          if (hasExpectedAudioLength(aac, expectedDuration)) return aac;
        }
      } catch {}
      try {
        const pcm = await decodeIsoPcmMono(file);
        if (pcm && (!best || pcm.length > best.length)) best = pcm;
        if (hasExpectedAudioLength(pcm, expectedDuration)) return pcm;
      } catch {}
    }

    if (AC && OAC && (!directFirst || !hasExpectedAudioLength(best, expectedDuration))) {
      let decoded = null;
      const tmp = new AC();
      try { decoded = await tmp.decodeAudioData(await file.arrayBuffer()); }
      catch { decoded = null; }
      finally { try { tmp.close(); } catch {} }
      if (decoded && decoded.length) {
        // One offline render resamples to 16k AND downmixes to mono.
        const frames = Math.ceil(decoded.duration * AUDIO_SR);
        const off = new OAC(1, frames, AUDIO_SR);
        const src = off.createBufferSource();
        src.buffer = decoded; src.connect(off.destination); src.start();
        const rendered = await off.startRendering();
        const webAudio = Float32Array.from(rendered.getChannelData(0));
        best = webAudio;
        if (hasExpectedAudioLength(webAudio, expectedDuration)) return webAudio;
      }
    }

    // Small MP4/MOV files normally take the WebAudio path above. If its decoded
    // duration is suspiciously short, retry with container-level PCM/AAC demux
    // instead of accepting a successful-but-truncated AudioBuffer.
    if (isIsoMedia(file) && !directFirst) {
      setTranscribeStatus('Recovering complete video audio…');
      try {
        const aac = await decodeIsoAacMono(file);
        if (aac && (!best || aac.length > best.length)) best = aac;
        if (hasExpectedAudioLength(aac, expectedDuration)) return aac;
      } catch {}
      try {
        const pcm = await decodeIsoPcmMono(file);
        if (pcm && (!best || pcm.length > best.length)) best = pcm;
        if (hasExpectedAudioLength(pcm, expectedDuration)) return pcm;
      } catch {}
    }
    return best;
  }
  // Split already-decoded mono PCM into locally-aligned WAV chunks (we decode
  // once and reuse the samples for BOTH chunking and silence detection).
  function chunksFromMono(mono) {
    if (!mono || !mono.length) return null;
    const overlapFrames = Math.round(CHUNK_OVERLAP_SEC * AUDIO_SR);
    const idealStepFrames = Math.round((MIN_CHUNK_SEC - CHUNK_OVERLAP_SEC) * AUDIO_SR);
    const boundedStepFrames = Math.ceil(Math.max(1, mono.length - overlapFrames) / MAX_CHUNKS);
    const stepFrames = Math.max(1, idealStepFrames, boundedStepFrames);
    const chunkFrames = stepFrames + overlapFrames;
    const chunks = [];
    for (let p = 0; p < mono.length; p += stepFrames) {
      const slice = mono.subarray(p, Math.min(mono.length, p + chunkFrames));
      const wav = encodeWav(slice, AUDIO_SR);
      chunks.push({
        file: new File([wav], `audio_${chunks.length}.wav`, { type: 'audio/wav' }),
        startSec: p / AUDIO_SR,
        durationSec: Math.max(1, Math.round(slice.length / AUDIO_SR)),
      });
      if (p + chunkFrames >= mono.length) break;
    }
    return chunks.length ? chunks : null;
  }

  // ───────────────── silence detection (the real pause fix) ────────────────
  // Whisper often stretches a word's END across the following silence, so the
  // caption hangs on screen through a pause. We can't trust its timestamps for
  // that — so we look at the ACTUAL audio energy. We frame the PCM at 20ms,
  // compute RMS per frame, derive an adaptive threshold from the clip's own
  // loud/quiet levels, and return every silent stretch ≥ MIN_SIL seconds. These
  // intervals are then used to trim each word back to where the voice really
  // stops, which makes captions hide exactly on the pause.
  const SIL_FRAME_SEC = 0.02;   // 20ms analysis frames
  const SIL_MIN = 0.16;         // shortest gap we treat as a real pause (s)
  function detectSilences(samples, sr) {
    if (!samples || samples.length < sr * 0.2) return [];
    const frame = Math.max(1, Math.round(sr * SIL_FRAME_SEC));
    const nFrames = Math.floor(samples.length / frame);
    if (nFrames < 4) return [];
    const rms = new Float32Array(nFrames);
    let peak = 0;
    for (let f = 0; f < nFrames; f++) {
      let sum = 0; const base = f * frame;
      for (let i = 0; i < frame; i++) { const v = samples[base + i]; sum += v * v; }
      const r = Math.sqrt(sum / frame);
      rms[f] = r; if (r > peak) peak = r;
    }
    if (peak <= 0) return [];
    // Adaptive threshold from the clip's own distribution: the 12th-percentile
    // frame is "quiet", the 85th is "loud". Silence sits just above the quiet
    // floor but well below speech, so it survives background hiss without eating
    // soft speech.
    const sorted = Float32Array.from(rms).sort();
    const pct = (p) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(sorted.length * p)))];
    const quiet = pct(0.12), loud = Math.max(pct(0.85), peak * 0.4);
    const thresh = Math.max(quiet * 1.6, loud * 0.06, 1e-4);
    const out = [];
    const frameSec = frame / sr;
    let runStart = -1;
    for (let f = 0; f <= nFrames; f++) {
      const silent = f < nFrames && rms[f] < thresh;
      if (silent) { if (runStart < 0) runStart = f; }
      else if (runStart >= 0) {
        const a = runStart * frameSec, b = f * frameSec;
        if (b - a >= SIL_MIN) out.push({ start: a, end: b });
        runStart = -1;
      }
    }
    return out;
  }

  async function postOneChunk(file, body, durationSec) {
    // Default EVERYONE to the best Whisper model (Large v3) — that's Capto's one
    // engine for all. Only an explicit, non-auto choice (the admin engine picker)
    // overrides it. The server still falls back to the user's own-key Whisper if
    // it can't run this exact id, so this is always safe.
    let eng = body.model || body.engine || '';
    if (!eng || eng === 'auto') eng = 'groq-whisper-large-v3';
    let last = null;
    // Transient worker/network failures should not throw away a 20-minute job.
    // Retry the same idempotent audio chunk twice; never retry auth, quota, bad
    // media, or no-speech responses because those need user action.
    for (let attempt = 0; attempt < 3; attempt++) {
      const fd = new FormData();
      fd.append('file', file, file.name || 'audio.wav');
      fd.append('language', body.language || 'auto');
      fd.append('model', eng);
      if (durationSec) fd.append('durationSec', String(Math.round(durationSec)));
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 70000);
      let res;
      try { res = await realFetch('/api/transcribe', { method: 'POST', body: fd, credentials: 'same-origin', cache: 'no-store', signal: controller.signal }); }
      catch (error) {
        const offline = navigator.onLine === false;
        const timedOut = error && (error.name === 'AbortError' || error.name === 'TimeoutError');
        const reason = String(error && error.message || '').slice(0, 120);
        last = {
          __error: true,
          error: offline ? 'You appear to be offline. Reconnect and retry captions.' : timedOut ? 'The caption engine timed out. Retrying did not recover.' : `Could not connect to the caption engine${reason ? ` (${reason})` : ''}.`,
          detail: reason,
          code: timedOut ? 'network_timeout' : 'network',
          status: 502,
        };
        if (attempt < 2) { await new Promise((resolve) => setTimeout(resolve, 450 * (attempt + 1))); continue; }
        return last;
      } finally {
        clearTimeout(timeout);
      }
      const data = await res.json().catch(() => ({}));
      if (res.ok) return data;
      last = { __error: true, error: data.error || 'Transcription failed.', detail: data.detail, code: data.code, status: res.status };
      const transient = res.status === 408 || res.status === 429 || res.status >= 500;
      if (!transient || attempt === 2) return last;
      const retryAfter = Number(res.headers.get('retry-after'));
      const waitMs = Math.min(15000, Math.max(700 * (attempt + 1), Number.isFinite(retryAfter) ? retryAfter * 1000 : 0));
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
    return last || { __error: true, error: 'Transcription failed.', status: 502 };
  }

  function setTranscribeStatus(txt) { const st = document.getElementById('status'); if (st) st.textContent = txt; }

  function combineQuality(samples) {
    const keys = ['avgLogprob', 'noSpeechProbability', 'compressionRatio', 'avgConfidence'];
    const out = {};
    for (const key of keys) {
      const values = samples.map((s) => s && s[key]).filter(Number.isFinite);
      if (values.length) out[key] = values.reduce((sum, v) => sum + v, 0) / values.length;
    }
    return Object.keys(out).length ? out : null;
  }

  async function transcribe(file, body) {
    const oneW = body.oneWord ? 1 : 0;
    // Decode the audio ONCE, up front — the same mono PCM feeds both the chunker
    // (long-video splitting) and the silence detector (pause-accurate timing).
    let mono = null;
    const expectedDuration = Number(window.__captoMedia && window.__captoMedia.meta && window.__captoMedia.meta.duration) || 0;
    try { setTranscribeStatus('Preparing audio…'); mono = await decodeMono16k(file, expectedDuration); } catch { mono = null; }
    const silences = mono ? detectSilences(mono, AUDIO_SR) : [];
    const chunks = mono ? chunksFromMono(mono) : null;

    if (chunks && chunks.length) {
      try {
        const allWords = [];
        let language = body.language, engine = null;
        const qualitySamples = [];
        const retryQueue = [];
        const report = (done) => { try { if (typeof window.__captoOnTranscribeProgress === 'function') window.__captoOnTranscribeProgress({ done, total: chunks.length, cues: allWords.length ? wordsToCues(allWords, oneW, silences, language, mono.length / AUDIO_SR) : [], language, engine }); } catch {} };
        const acceptChunk = (data, i) => {
          language = data.language || language;
          if (!engine) engine = data.engine || null;
          if (data.quality) qualitySamples.push(data.quality);
          const off = chunks[i].startSec;
          const acceptAfter = i === 0 ? -Infinity : off + CHUNK_OVERLAP_SEC * 0.55;
          for (const w of (data.words || [])) {
            const shifted = { word: w.word, start: (w.start || 0) + off, end: (w.end || 0) + off };
            // Overlapping audio prevents words from being cut at chunk edges.
            // Keep the prior chunk's copy in the overlap and only admit the new
            // chunk once it has crossed the stable midpoint.
            if (shifted.end <= acceptAfter) continue;
            const recent = allWords.slice(-8).some((old) =>
              String(old.word || '').toLocaleLowerCase() === String(shifted.word || '').toLocaleLowerCase() &&
              Math.abs(old.start - shifted.start) < 0.7
            );
            if (!recent) allWords.push(shifted);
          }
        };
        const isNoSpeech = (data) => data && (data.status === 422 || /no speech/i.test(String(data.error || '')));
        const isTransient = (data) => data && (data.status === 408 || data.status === 429 || data.status >= 500);
        report(0);
        for (let i = 0; i < chunks.length; i++) {
          if (chunks.length > 1) setTranscribeStatus(`Transcribing… part ${i + 1} of ${chunks.length}`);
          const data = await postOneChunk(chunks[i].file, body, chunks[i].durationSec);
          if (data.__error) {
            // Silence-only chunks are normal in long videos. A temporary provider
            // failure gets one later retry after the remaining chunks have run.
            if (isNoSpeech(data)) { report(i + 1); continue; }
            if (isTransient(data)) { retryQueue.push({ i, data }); report(i + 1); continue; }
            return json({ error: data.error, code: data.code, detail: data.detail }, data.status || 502);
          }
          acceptChunk(data, i);
          // Stream progress + the captions-so-far to the editor → live timeline fill.
          report(i + 1);
        }
        const failed = [];
        for (let r = 0; r < retryQueue.length; r++) {
          const { i } = retryQueue[r];
          setTranscribeStatus(`Recovering… part ${r + 1} of ${retryQueue.length}`);
          const data = await postOneChunk(chunks[i].file, body, chunks[i].durationSec);
          if (data.__error) {
            if (!isNoSpeech(data)) failed.push(data);
          } else {
            acceptChunk(data, i);
          }
          report(chunks.length);
        }
        if (!allWords.length && failed.length) {
          const failure = failed[0];
          return json({ error: failure.error, code: failure.code, detail: failure.detail }, failure.status || 502);
        }
        if (!allWords.length) return json({ error: 'No speech detected in this clip.' }, 422);
        allWords.sort((a, b) => a.start - b.start);
        const cleanWords = [];
        for (const word of allWords) {
          const duplicate = cleanWords.slice(-8).some((old) =>
            String(old.word || '').toLocaleLowerCase() === String(word.word || '').toLocaleLowerCase() &&
            Math.abs(old.start - word.start) < 0.7
          );
          if (!duplicate) cleanWords.push(word);
        }
        return json({ cues: wordsToCues(cleanWords, oneW, silences, language, mono.length / AUDIO_SR), language, engine, quality: combineQuality(qualitySamples), partial: failed.length > 0, failedParts: failed.length, captionEngineVersion: window.CaptoCaptionEngine ? window.CaptoCaptionEngine.VERSION : 2 });
      } catch (error) {
        return json({ error: 'Captioning stopped unexpectedly. Please retry.', code: 'caption_pipeline', detail: String(error && error.message || '') }, 502);
      }
    }

    // Fallback: upload the original file as one request (server may route large
    // paid-tier files to Deepgram). No decoded audio here → no silence map, so
    // captions fall back to Whisper's own gap timing (still hides on big pauses).
    // Never attempt this for a large video: Cloudflare/browser upload limits can
    // terminate the connection before an HTTP response, which used to surface as
    // the useless "Network error reaching the caption engine" message.
    if (file && file.size > 18 * 1024 * 1024) {
      return json({
        error: 'Capto could not read this video audio in your browser. Convert the audio to AAC or PCM and retry; the original video was not uploaded.',
        code: 'audio_decode_failed',
      }, 422);
    }
    const dur = window.__captoMedia && window.__captoMedia.meta && window.__captoMedia.meta.duration;
    const data = await postOneChunk(file, body, dur || 0);
    if (data.__error) return json({ error: data.error, code: data.code, detail: data.detail }, data.status || 502);
    // Pass back the engine that ACTUALLY ran so the editor can attribute later
    // edits to the right model for the learning loop.
    return json({ cues: wordsToCues(data.words, oneW, silences, data.language || body.language, dur || Infinity), language: data.language || body.language, engine: data.engine || null, quality: data.quality || null, captionEngineVersion: window.CaptoCaptionEngine ? window.CaptoCaptionEngine.VERSION : 2 });
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
      // Much more visible over busy video: denser hatch + a brighter solid border.
      `background:repeating-linear-gradient(45deg,rgba(255,86,110,.28),rgba(255,86,110,.28) 9px,rgba(255,86,110,.07) 9px,rgba(255,86,110,.07) 19px);` +
      `border:2px solid rgba(255,86,110,.9);box-shadow:inset 0 0 0 1px rgba(0,0,0,.35)">` +
      `<span style="position:absolute;${labelTop ? 'top' : 'bottom'}:5px;left:6px;font-size:11px;font-weight:800;` +
      `letter-spacing:.04em;text-transform:uppercase;color:#fff;background:rgba(214,40,69,.92);padding:2px 8px;border-radius:6px;box-shadow:0 1px 4px rgba(0,0,0,.5)">${label}</span></div>`
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
  function withTimeout(promise, ms, message) {
    let timer;
    return Promise.race([
      promise,
      new Promise((resolve, reject) => { timer = setTimeout(() => reject(new Error(message)), ms); }),
    ]).finally(() => clearTimeout(timer));
  }
  function triggerBrowserDownload(pending) {
    if (!pending || !pending.url) return false;
    const a = document.createElement('a');
    a.href = pending.url;
    a.download = pending.name || 'capto-export.mp4';
    a.rel = 'noopener';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
    return true;
  }

  function queueBrowserDownload(blob, name) {
    if (window.__captoPendingDownload && window.__captoPendingDownload.url) {
      try { URL.revokeObjectURL(window.__captoPendingDownload.url); } catch {}
    }
    const pending = { blob, name, url: URL.createObjectURL(blob) };
    window.__captoPendingDownload = pending;
    const download = document.getElementById('exDownload');
    if (download) {
      download.href = pending.url;
      download.download = name;
    }
    // Try immediately. If a browser suppresses async downloads, the visible
    // Download video button calls this same function inside a real user gesture.
    triggerBrowserDownload(pending);
  }
  // Retire the previous cache/service-worker download experiment. It is no
  // longer part of exporting and clearing it prevents stale controlled tabs
  // from retaining large finished videos or old download behavior.
  try {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          const url = String((registration.active || registration.waiting || registration.installing || {}).scriptURL || '');
          if (url.includes('/studio/export-download-sw.js')) registration.unregister().catch(() => {});
        }
      }).catch(() => {});
    }
    if ('caches' in window) caches.delete('capto-export-download-v1').catch(() => {});
  } catch {}
  // The editor is mounted in a same-origin iframe on /editor. Prefer the local
  // picker, but use the top-level window when the embedded context does not
  // expose it even though the browser supports File System Access.
  let showExportSavePicker = null;
  try {
    if (typeof window.showSaveFilePicker === 'function') showExportSavePicker = window.showSaveFilePicker.bind(window);
    else if (window.top && typeof window.top.showSaveFilePicker === 'function') showExportSavePicker = window.top.showSaveFilePicker.bind(window.top);
  } catch {}
  const supportsSavePicker = !!showExportSavePicker;
  // Desktop: the user picks the save location up front (File System Access);
  // we write the finished export straight there. Mobile / unsupported browsers
  // get an explicit download button after encoding so pop-up blocking cannot
  // swallow the result.
  async function saveBlob(blob, name, job) {
    const h = window.__captoSaveHandle;
    if (h) {
      try {
        const w = await h.createWritable();
        await w.write(blob);
        await w.close();
        window.__captoSaveHandle = null;
        return h.name || name;            // saved exactly where the user chose
      } catch {
        window.__captoSaveHandle = null;
        // Do not discard a completed encode if the selected file becomes
        // unwritable. Offer the same explicit-download recovery path instead.
        queueBrowserDownload(blob, name);
        job.downloadReady = true;
        job.downloadName = name;
        return null;
      }
    }
    // Start a direct Blob download and retain the same Blob URL for a manual
    // retry from the visible Download video button.
    queueBrowserDownload(blob, name);
    job.downloadReady = true;
    job.downloadName = name;
    return null;
  }
  async function chooseSaveLocation() {
    if (!supportsSavePicker) return false;
    const base = ((window.__captoMedia && window.__captoMedia.file && window.__captoMedia.file.name) || 'video').replace(/\.[^.]+$/, '');
    // Match the suggested extension to the format the user picked, so the saved
    // file's name and its actual bytes agree.
    const ext = extFor(resolveExportMime(currentTier()));
    try {
      const handle = await showExportSavePicker({
        id: 'capto-export',
        startIn: 'downloads',
        suggestedName: `${base}-captioned.${ext}`,
        types: [{ description: 'Video', accept: { 'video/mp4': ['.mp4'], 'video/webm': ['.webm'] } }],
      });
      window.__captoSaveHandle = handle;
      const p = document.getElementById('exPath');
      if (p) { p.textContent = handle.name; p.title = handle.name; }
      return true;
    } catch { return false; }
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
    let toks = words.map((w, i) => ({ text: applyCaseLocal(w.word, s.caseMode), idx: i }));
    if (s.singleWord) toks = aw >= 0 && toks[aw] ? [toks[aw]] : [];
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
      for (const it of ln.items) {
        // Word-by-word reveal: a word not yet spoken (idx > aw) is left blank but
        // still reserves its space, so the line builds up in place as in preview.
        if (!(s.wordReveal && it.idx > aw)) drawWord(ctx, it.text, x, y, s, it.idx === aw, fontPx);
        x += it.w + spaceW;
      }
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
        const p = document.getElementById('exPath'); if (p && supportsSavePicker) { p.textContent = 'Choose a file'; p.title = ''; }
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
        `<label style="font-size:12px;color:var(--muted)">Resolution <select id="capto-res" ${lock} style="${sel}"><option value="2160" ${free ? 'disabled' : ''}>4K (2160p)${free ? ' · Pro' : ''}</option><option value="1440" ${free ? 'disabled' : ''}>1440p${free ? ' · Pro' : ''}</option><option value="1080" selected>1080p</option><option value="720">720p</option><option value="480">480p</option></select></label>` +
        `<label style="font-size:12px;color:var(--muted)">FPS <select id="capto-fps" ${lock} style="${sel}"><option value="24">24</option><option value="30" selected>30</option><option value="60">60</option><option value="120" ${free ? 'disabled' : ''}>120${free ? ' · Pro' : ''}</option></select></label>` +
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
      const p = document.getElementById('exPath'); if (p && supportsSavePicker) { p.textContent = 'Choose a file'; p.title = ''; }
      exStart.textContent = 'Export'; toggle(['tiers', 'capto-export-opts'], true); if (supportsSavePicker) toggle(['exDest'], true);
    };
    exStart.onclick = async (e) => {
      if (step === 0) {
        // Ask for the destination from this direct click before any encoding.
        // File pickers lose permission if opened after asynchronous work.
        if (supportsSavePicker && !window.__captoSaveHandle) {
          const selected = await chooseSaveLocation();
          if (!selected) return;
        }
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

  // ───────────── WebCodecs MP4 encoder (frame-accurate, NOT real-time) ────────
  // The old export PLAYED the clip and screen-grabbed the canvas in real time via
  // canvas.captureStream(fps) + requestAnimationFrame. That broke badly: rAF (and
  // the off-screen <video>) get throttled/paused the moment the tab loses focus,
  // so the video froze while the audio track kept recording → frozen/choppy video,
  // audio drift, and tiny VFR files. WebCodecs fixes it at the root: we SEEK to
  // each frame time, draw, and encode it with an exact presentation timestamp —
  // deterministic, constant-frame-rate H.264 + AAC in a faststart MP4 that plays
  // smoothly everywhere. No real time, no rAF, no throttling. MediaRecorder stays
  // as the fallback for browsers without VideoEncoder/AudioEncoder.

  // Pick a supported H.264 (AVC) codec string for the output size: High profile
  // first (best quality/byte), then Main, then Baseline; level scales with res so
  // 720p/1080p/4K stay in-spec. Returns null if none encode (→ use MediaRecorder).
  async function pickAvcCodec(W, H) {
    if (typeof VideoEncoder === 'undefined' || typeof VideoEncoder.isConfigSupported !== 'function') return null;
    const px = W * H;
    const lvl = px > 1920 * 1088 ? '33' /*5.1*/ : px > 1280 * 720 ? '28' /*4.0*/ : '1f' /*3.1*/;
    for (const codec of ['avc1.6400' + lvl, 'avc1.4D40' + lvl, 'avc1.4200' + lvl]) {
      try { const s = await VideoEncoder.isConfigSupported({ codec, width: W, height: H, bitrate: 4000000 }); if (s && s.supported) return codec; } catch {}
    }
    return null;
  }
  // Decode the file's FULL audio (all channels, native sample rate) for muxing.
  async function decodeFullAudio(file) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC || !file) return null;
    const ac = new AC();
    try { const buf = await ac.decodeAudioData(await file.arrayBuffer()); return (buf && buf.length) ? buf : null; }
    catch { return null; }
    finally { try { ac.close(); } catch {} }
  }
  // Encode an AudioBuffer to AAC and feed it to the muxer (planar f32, 100ms blocks).
  async function encodeAudioTrack(audioBuffer, muxer, onProg) {
    if (typeof AudioEncoder === 'undefined' || typeof AudioData === 'undefined') throw new Error('no AudioEncoder');
    const sampleRate = audioBuffer.sampleRate;
    const channels = Math.min(2, audioBuffer.numberOfChannels);
    const cfg = { codec: 'mp4a.40.2', sampleRate, numberOfChannels: channels, bitrate: 160000 };
    try { const s = await AudioEncoder.isConfigSupported(cfg); if (!(s && s.supported)) throw 0; } catch { throw new Error('AAC unsupported'); }
    let firstError = null;
    const aenc = new AudioEncoder({
      output: (chunk, meta) => { try { muxer.addAudioChunk(chunk, meta); } catch (e) { firstError = firstError || e; } },
      error: (e) => { firstError = firstError || e; },
    });
    aenc.configure(cfg);
    const chs = []; for (let c = 0; c < channels; c++) chs.push(audioBuffer.getChannelData(c));
    const total = audioBuffer.length, BLOCK = Math.round(sampleRate * 0.1);
    for (let off = 0; off < total; off += BLOCK) {
      if (firstError) break;
      const n = Math.min(BLOCK, total - off);
      const planar = new Float32Array(n * channels);
      for (let c = 0; c < channels; c++) planar.set(chs[c].subarray(off, off + n), c * n);
      const ad = new AudioData({ format: 'f32-planar', sampleRate, numberOfFrames: n, numberOfChannels: channels, timestamp: Math.round((off / sampleRate) * 1e6), data: planar });
      aenc.encode(ad); ad.close();
      if (onProg) onProg(Math.min(1, off / total));
      if (aenc.encodeQueueSize > 24) await new Promise((r) => setTimeout(r, 0));
    }
    try { await withTimeout(aenc.flush(), 20000, 'Audio encoding stalled.'); }
    finally { try { aenc.close(); } catch {} }
    if (firstError) throw firstError;
  }
  // Lazily load the mp4box UMD demuxer for long-video audio and MP4 export.
  let _mp4boxPromise = null;
  function loadMp4Box() {
    if (window.MP4Box) return Promise.resolve(window.MP4Box);
    if (_mp4boxPromise) return _mp4boxPromise;
    _mp4boxPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = '/studio/vendor/mp4box.js';
      s.onload = () => (window.MP4Box ? resolve(window.MP4Box) : reject(new Error('mp4box global missing')));
      s.onerror = () => reject(new Error('mp4box failed to load'));
      document.head.appendChild(s);
    });
    return _mp4boxPromise;
  }
  // Demux an ISO-BMFF (MP4/MOV) file → { track, description, samples[] }. Rejects
  // for non-MP4 / no-video-track so the caller can fall back to MediaRecorder.
  async function demuxMp4(file, onProgress) {
    const MP4Box = await loadMp4Box();
    const mp4 = MP4Box.createFile();
    const DataStream = window.DataStream;
    const descFor = (id) => {
      const trak = mp4.getTrackById(id);
      for (const e of (trak.mdia.minf.stbl.stsd.entries || [])) {
        const box = e.avcC || e.hvcC || e.vpcC || e.av1C;
        if (box) { const ds = new DataStream(undefined, 0, DataStream.BIG_ENDIAN); box.write(ds); return new Uint8Array(ds.buffer, 8); }
      }
      return null;
    };
    return await new Promise((resolve, reject) => {
      const samples = []; let track = null, description = null, expected = Infinity;
      const to = setTimeout(() => reject(new Error('Video preparation timed out.')), 45000);
      mp4.onError = (e) => { clearTimeout(to); reject(new Error('demux: ' + e)); };
      mp4.onReady = (info) => {
        track = (info.videoTracks && info.videoTracks[0]) || null;
        if (!track) { clearTimeout(to); reject(new Error('no video track')); return; }
        expected = track.nb_samples;
        try { description = descFor(track.id); } catch (e) { clearTimeout(to); reject(e); return; }
        if (!description) { clearTimeout(to); reject(new Error('no codec description')); return; }
        mp4.setExtractionOptions(track.id, null, { nbSamples: 1000000 });
        mp4.start();
      };
      mp4.onSamples = (id, user, sm) => {
        for (const s of sm) samples.push({ cts: s.cts, dts: s.dts, ts: s.timescale, key: s.is_sync, dur: s.duration, data: s.data });
        if (samples.length >= expected) { clearTimeout(to); resolve({ track, description, samples }); }
      };
      (async () => {
        const step = 8 * 1024 * 1024;
        for (let offset = 0; offset < file.size; offset += step) {
          const end = Math.min(file.size, offset + step);
          const ab = await file.slice(offset, end).arrayBuffer();
          ab.fileStart = offset;
          mp4.appendBuffer(ab);
          if (onProgress) onProgress(end / Math.max(1, file.size));
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
        mp4.flush();
      })().catch((e) => { clearTimeout(to); reject(e); });
    });
  }
  // PRIMARY export: demux the real encoded frames, decode them with VideoDecoder,
  // re-draw each (with captions) onto the output canvas, and re-encode at the
  // frame's TRUE timestamp. No <video>, no seeking, no requestVideoFrameCallback,
  // no real-time playback — so it can't freeze, glitch, drift, or shorten, and it
  // handles variable-frame-rate sources natively (every frame keeps its real PTS).
  async function exportWebCodecs(job, o, diag) {
    const { Muxer, ArrayBufferTarget } = await import('/studio/vendor/mp4-muxer.mjs');
    const { canvas, ctx, W, H, fps, cues, drawStyle, watermark, settings, file, codec } = o;
    if (typeof VideoDecoder === 'undefined') throw new Error('no VideoDecoder');

    job.stage = 'Preparing video frames…';
    const demux = await demuxMp4(file, (p) => { job.progress = 0.03 + p * 0.14; }); // throws → MediaRecorder fallback
    const samples = demux.samples;
    if (!samples.length) throw new Error('no video samples');
    diag.sourceFrames = samples.length;

    let audioBuffer = null;
    try { audioBuffer = await decodeFullAudio(file); } catch {}
    const hasAudio = !!audioBuffer;

    const target = new ArrayBufferTarget();
    const muxer = new Muxer(Object.assign(
      { target, fastStart: 'in-memory', firstTimestampBehavior: 'offset', video: { codec: 'avc', width: W, height: H, frameRate: fps } },
      hasAudio ? { audio: { codec: 'aac', numberOfChannels: Math.min(2, audioBuffer.numberOfChannels), sampleRate: audioBuffer.sampleRate } } : {},
    ));

    let encErr = null;
    const venc = new VideoEncoder({
      output: (chunk, meta) => { try { muxer.addVideoChunk(chunk, meta); } catch (e) { encErr = encErr || e; } },
      error: (e) => { encErr = encErr || e; },
    });
    venc.configure({ codec, width: W, height: H, bitrate: settings.videoBitrate, framerate: fps, latencyMode: 'quality' });

    // Re-encode each decoded frame (drawn + captioned) at its real PTS, kept
    // strictly increasing and normalised to start at 0 so it stays in A/V sync.
    const GOP_US = 2000000;
    let outBase = -1, lastOut = -1, lastKey = -GOP_US, frames = 0, decErr = null;
    const total = samples.length;
    const onDecoded = (frame) => {
      if (encErr || decErr) { frame.close(); return; }
      try {
        const us = frame.timestamp;
        if (outBase < 0) outBase = us;
        let outTs = us - outBase; if (outTs <= lastOut) outTs = lastOut + 1; lastOut = outTs;
        ctx.drawImage(frame, 0, 0, W, H);
        drawCaptions(ctx, outTs / 1e6, cues, drawStyle, W, H);
        if (watermark) drawWatermark(ctx, W, H);
        const key = (outTs - lastKey) >= GOP_US; if (key) lastKey = outTs;
        const out = new VideoFrame(canvas, { timestamp: outTs, duration: frame.duration || Math.round(1e6 / fps) });
        venc.encode(out, { keyFrame: key }); out.close();
        frames++; diag.framesEncoded = frames;
        job.progress = Math.min(0.8, (frames / total) * 0.8);
      } catch (e) { decErr = decErr || e; }
      finally { frame.close(); }
    };
    const dec = new VideoDecoder({ output: onDecoded, error: (e) => { decErr = decErr || e; } });
    dec.configure({ codec: demux.track.codec, description: demux.description, codedWidth: demux.track.video.width, codedHeight: demux.track.video.height });

    job.stage = 'Encoding video…';
    for (const s of samples) {
      if (encErr || decErr) break;
      dec.decode(new EncodedVideoChunk({ type: s.key ? 'key' : 'delta', timestamp: Math.round((s.cts / s.ts) * 1e6), duration: Math.round((s.dur / s.ts) * 1e6), data: s.data }));
      // Bound the decode + encode pipelines so memory stays flat on long clips.
      while (dec.decodeQueueSize > 8 || venc.encodeQueueSize > 8) { if (encErr || decErr) break; await new Promise((r) => setTimeout(r, 0)); }
    }
    try { await withTimeout(dec.flush(), 20000, 'Video decoding stalled.'); }
    finally { try { dec.close(); } catch {} }
    if (decErr) throw decErr;
    try { await withTimeout(venc.flush(), 20000, 'Video encoding stalled.'); }
    finally { try { venc.close(); } catch {} }
    if (encErr) throw encErr;
    if (!frames) throw new Error('no frames encoded');

    if (hasAudio) { job.stage = 'Adding audio…'; job.progress = 0.84; await encodeAudioTrack(audioBuffer, muxer, (p) => { job.progress = 0.82 + p * 0.15; }); }
    muxer.finalize();
    diag.hasAudio = hasAudio;
    job.progress = 0.99;
    return new Blob([target.buffer], { type: 'video/mp4' });
  }

  async function supportsAac(audioBuffer) {
    if (!audioBuffer || typeof AudioEncoder === 'undefined' || typeof AudioEncoder.isConfigSupported !== 'function') return false;
    try {
      const cfg = { codec: 'mp4a.40.2', sampleRate: audioBuffer.sampleRate, numberOfChannels: Math.min(2, audioBuffer.numberOfChannels), bitrate: 160000 };
      const result = await AudioEncoder.isConfigSupported(cfg);
      return !!(result && result.supported);
    } catch { return false; }
  }

  // MediaRecorder on Chromium may claim MP4/AAC support yet pass an incoming
  // WebM Opus track straight into the MP4. Rebuild that recording as a proper
  // H.264 + AAC fast-start MP4: copy its encoded H.264 samples losslessly and
  // encode the original audio buffer to AAC with WebCodecs.
  async function remuxRecordedVideoWithAac(videoBlob, audioBuffer, W, H, fps, diag) {
    const { Muxer, ArrayBufferTarget } = await import('/studio/vendor/mp4-muxer.mjs');
    const demux = await demuxMp4(videoBlob);
    if (!demux.samples.length) throw new Error('Recorded MP4 has no video samples.');
    const target = new ArrayBufferTarget();
    const muxer = new Muxer({
      target, fastStart: 'in-memory', firstTimestampBehavior: 'offset',
      video: { codec: 'avc', width: W, height: H, frameRate: fps },
      audio: { codec: 'aac', numberOfChannels: Math.min(2, audioBuffer.numberOfChannels), sampleRate: audioBuffer.sampleRate },
    });
    const firstCts = demux.samples[0].cts / demux.samples[0].ts;
    for (let i = 0; i < demux.samples.length; i++) {
      const s = demux.samples[i];
      const chunk = new EncodedVideoChunk({
        type: s.key ? 'key' : 'delta',
        timestamp: Math.max(0, Math.round(((s.cts / s.ts) - firstCts) * 1e6)),
        duration: Math.max(1, Math.round((s.dur / s.ts) * 1e6)),
        data: s.data,
      });
      const meta = i === 0 ? { decoderConfig: { codec: demux.track.codec, codedWidth: W, codedHeight: H, description: demux.description } } : undefined;
      muxer.addVideoChunk(chunk, meta);
    }
    await encodeAudioTrack(audioBuffer, muxer);
    muxer.finalize();
    diag.audioRemux = 'aac';
    return new Blob([target.buffer], { type: 'video/mp4' });
  }

  // Real-time fallback for sources WebCodecs cannot demux (for example WebM), or
  // browsers without H.264/AAC WebCodecs support. A MediaStreamTrackProcessor
  // consumes the source video frames directly when available, so rendering is
  // independent of requestAnimationFrame and keeps working in a background tab.
  // Older browsers use requestVideoFrameCallback with a timer safety net.
  async function exportMediaRecorder(job, o, diag) {
    const { v, canvas, ctx, W, H, fps, dur, cues, drawStyle, watermark, settings, quality, file } = o;
    let sourceStream = null, sourceAudioTrack = null, audioTrack = null, sourceVideoTrack = null, audioContext = null;
    try {
      sourceStream = v.captureStream ? v.captureStream() : (v.mozCaptureStream ? v.mozCaptureStream() : null);
      if (sourceStream) {
        sourceAudioTrack = sourceStream.getAudioTracks()[0] || null;
        sourceVideoTrack = sourceStream.getVideoTracks()[0] || null;
      }
    } catch { /* no source stream */ }
    let mime = resolveExportMime(quality);
    let aacAudioBuffer = null, remuxAac = false;
    if (sourceAudioTrack && mime.indexOf('mp4') >= 0) {
      try { aacAudioBuffer = await decodeFullAudio(file); } catch {}
      remuxAac = await supportsAac(aacAudioBuffer);
      if (remuxAac) {
        // The recording below is video-only; proper AAC is added losslessly in
        // remuxRecordedVideoWithAac after MediaRecorder stops.
        v.muted = true;
        diag.audioCapture = 'aac-remux';
      } else {
        // Never put Opus in an .mp4. If this browser cannot encode AAC, emit an
        // honest WebM/Opus file instead of a deceptively named broken MP4.
        const webmMime = mimeForFormat('webm');
        if (webmMime) { mime = webmMime; diag.containerFallback = 'webm-no-aac'; }
      }
    }
    // Route audio through Web Audio instead of attaching the source's encoded
    // track directly. Direct WebM/Opus tracks were being pass-through muxed into
    // an .mp4, which looks valid but glitches or plays silently in QuickTime and
    // social apps. A PCM MediaStreamDestination makes MediaRecorder encode AAC
    // for MP4 (or Opus for WebM) as requested by the selected container.
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC && sourceAudioTrack && !remuxAac) {
        audioContext = new AC();
        const sourceNode = audioContext.createMediaElementSource(v);
        const audioDest = audioContext.createMediaStreamDestination();
        sourceNode.connect(audioDest);
        audioTrack = audioDest.stream.getAudioTracks()[0] || null;
        diag.audioCapture = audioTrack ? 'web-audio' : 'none';
      }
    } catch { audioContext = null; }
    if (!audioTrack && sourceAudioTrack && !remuxAac) {
      audioTrack = sourceAudioTrack;
      if (audioTrack) diag.audioCapture = 'source-track';
    }
    let cstream = canvas.captureStream(0);
    let canvasTrack = cstream.getVideoTracks()[0] || null;
    const processorMode = !!(
      sourceVideoTrack && canvasTrack && typeof canvasTrack.requestFrame === 'function' &&
      typeof MediaStreamTrackProcessor !== 'undefined'
    );
    if (!processorMode) {
      try { if (canvasTrack) canvasTrack.stop(); } catch {}
      cstream = canvas.captureStream(fps);
      canvasTrack = cstream.getVideoTracks()[0] || null;
    }
    const tracks = cstream.getVideoTracks();
    if (audioTrack) tracks.push(audioTrack);
    const stream = new MediaStream(tracks);
    diag.mime = mime;
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: settings.videoBitrate });
    const chunks = [];
    rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };

    let vfcb = 0, fallbackTimer = 0, watchdog = 0, reader = null;
    let painted = 0, lastPaintAt = Date.now(), lastPaintTime = -1, failure = null;
    function paint(t) {
      try {
        ctx.drawImage(v, 0, 0, W, H);
        drawCaptions(ctx, t, cues, drawStyle, W, H);
        if (watermark) drawWatermark(ctx, W, H);
      } catch {}
      painted++;
      diag.framesEncoded = painted;
      lastPaintAt = Date.now(); lastPaintTime = t;
      job.progress = dur ? Math.min(0.999, t / dur) : 0;
    }
    function clearCapture() {
      if (vfcb && typeof v.cancelVideoFrameCallback === 'function') { try { v.cancelVideoFrameCallback(vfcb); } catch {} }
      if (fallbackTimer) clearInterval(fallbackTimer);
      if (watchdog) clearInterval(watchdog);
      if (reader) { try { reader.cancel(); } catch {} reader = null; }
      try { cstream.getTracks().forEach((t) => t.stop()); } catch {}
      try { if (sourceVideoTrack) sourceVideoTrack.stop(); } catch {}
      if (audioContext) { try { audioContext.close(); } catch {} audioContext = null; }
    }
    function startFramePump(fail) {
      if (processorMode) {
        diag.captureMode = 'track-processor';
        const processor = new MediaStreamTrackProcessor({ track: sourceVideoTrack });
        reader = processor.readable.getReader();
        (async () => {
          try {
            while (!failure && !v.ended) {
              const part = await reader.read();
              if (part.done) break;
              const frame = part.value;
              try { paint(v.currentTime); canvasTrack.requestFrame(); }
              finally { frame.close(); }
            }
          } catch (e) { if (!v.ended && !failure) fail(e); }
        })();
        return;
      }
      diag.captureMode = typeof v.requestVideoFrameCallback === 'function' ? 'video-frame-callback' : 'timer';
      if (typeof v.requestVideoFrameCallback === 'function') {
        const onVideoFrame = (now, meta) => {
          if (failure || v.ended) return;
          paint(meta && Number.isFinite(meta.mediaTime) ? meta.mediaTime : v.currentTime);
          vfcb = v.requestVideoFrameCallback(onVideoFrame);
        };
        vfcb = v.requestVideoFrameCallback(onVideoFrame);
      }
      // Safety net for browsers where video-frame callbacks stall in a hidden
      // tab. It only paints when playback has moved beyond the last drawn frame.
      fallbackTimer = setInterval(() => {
        if (!failure && !v.ended && v.currentTime > lastPaintTime + Math.max(0.02, 0.5 / fps)) paint(v.currentTime);
      }, Math.max(50, Math.round(1000 / fps)));
    }
    let blob = await new Promise((resolve, reject) => {
      const fail = (e) => {
        if (failure) return;
        failure = e instanceof Error ? e : new Error('Export playback stalled.');
        try { v.pause(); } catch {}
        try { if (rec.state !== 'inactive') rec.stop(); else reject(failure); } catch { reject(failure); }
      };
      rec.onstop = () => {
        clearCapture();
        if (failure) { reject(failure); return; }
        const out = new Blob(chunks, { type: mime });
        if (!painted || !out.size) { reject(new Error('Export produced no video frames.')); return; }
        resolve(out);
      };
      rec.onerror = (e) => fail((e && e.error) || new Error('Recorder error.'));
      v.onended = () => {
        paint(Math.min(dur || v.currentTime, v.currentTime));
        try { if (canvasTrack && typeof canvasTrack.requestFrame === 'function') canvasTrack.requestFrame(); } catch {}
        setTimeout(() => { try { if (rec.state !== 'inactive') rec.stop(); } catch {} }, 80);
      };
      watchdog = setInterval(() => {
        if (!v.ended && !failure && Date.now() - lastPaintAt > 8000) fail(new Error('Export playback stalled. Keep Capto open and try again.'));
      }, 1000);
      // Seed a frame before recording, start the recorder BEFORE playback, then
      // attach the frame pump. The old order lost the beginning of every clip.
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); paint(0);
      try { if (canvasTrack && typeof canvasTrack.requestFrame === 'function') canvasTrack.requestFrame(); } catch {}
      try { rec.start(500); } catch (e) { fail(e); return; }
      startFramePump(fail);
      (async () => {
        if (audioContext && audioContext.state === 'suspended') await audioContext.resume();
        await v.play();
      })().catch(fail);
    });
    if (remuxAac) blob = await remuxRecordedVideoWithAac(blob, aacAudioBuffer, W, H, fps, diag);
    diag.hasAudio = !!(audioTrack || remuxAac);
    return { blob, mime };
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

    job.stage = 'Preparing video…';
    job.progress = 0.01;
    const v = document.createElement('video');
    v.src = media.url; v.playsInline = true; v.preload = 'auto';
    v.style.cssText = 'position:fixed;left:-9999px;top:0;width:2px;height:2px;opacity:0;pointer-events:none;';
    document.body.appendChild(v);
    await new Promise((res, rej) => {
      const timer = setTimeout(() => { try { v.remove(); } catch {} rej(new Error('The source video did not load for export. Re-open it and try again.')); }, 12000);
      v.onloadedmetadata = () => { clearTimeout(timer); job.progress = 0.03; res(); };
      v.onerror = () => { clearTimeout(timer); try { v.remove(); } catch {} rej(new Error('Could not load the video for export.')); };
      v.load();
    });
    try {
      await document.fonts.load(`${style.italic ? 'italic ' : ''}${style.weight || 700} 64px '${style.fontFamily}'`);
      await document.fonts.ready;
    } catch {}

    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d', { alpha: false });
    const drawStyle = scaleStyle(style, k);
    const dur = meta.duration || v.duration || 0;
    const watermark = !!(window.__captoUser && window.__captoUser.watermark);

    // The WebCodecs path captures real PRESENTED frames at their true timestamps,
    // so the source frame rate is preserved automatically (a 60fps clip stays
    // 60fps) — `fps` here is just the container hint + the fallback's capture rate.
    const fps = settings.fps;

    const diag = {
      sourceW: nW, sourceH: nH, sourceDurSec: +(dur || 0).toFixed(2),
      outW: W, outH: H, fps, targetBitrateMbps: +(settings.videoBitrate / 1e6).toFixed(2),
      quality: body.quality, container: getVal('capto-format', '') || 'auto',
      encoder: null, mime: null, codec: null, framesEncoded: 0, hasAudio: null,
      startedAt: Date.now(),
    };

    const o = { v, canvas, ctx, W, H, fps, dur, cues, drawStyle, watermark, settings, file: media.file, quality: body.quality };

    // Prefer the WebCodecs MP4 path (demux → decode → re-encode the real frames).
    // Skip it only when the user explicitly asked for WebM, or H.264 encode/decode
    // isn't available — then fall back to the legacy MediaRecorder capture. (A
    // non-MP4/MOV source throws inside demux and also falls back.)
    const wantWebm = body.quality !== 'friend' && getVal('capto-format', '') === 'webm';
    const isoSource = /^(video\/mp4|video\/quicktime|video\/x-m4v)$/i.test(media.file.type || '') || /\.(mp4|mov|m4v)$/i.test(media.file.name || '');
    const avc = (wantWebm || !isoSource) ? null : await pickAvcCodec(W, H);
    let blob = null, mime = 'video/mp4';
    try {
      if (!avc || !isoSource || typeof VideoDecoder === 'undefined') throw new Error('webcodecs-skip');
      o.codec = avc;
      diag.encoder = 'webcodecs-mp4'; diag.mime = 'video/mp4'; diag.codec = avc;
      blob = await exportWebCodecs(job, o, diag);
      mime = 'video/mp4';
    } catch (e) {
      const msg = e && e.message;
      if (msg && msg !== 'webcodecs-skip') { console.warn('[Capto export] WebCodecs path failed → MediaRecorder fallback:', e); diag.webCodecsError = msg; }
      // Reset the element for a clean real-time pass.
      try { v.pause(); v.currentTime = 0; } catch {}
      job.stage = 'Recording video…';
      job.progress = Math.max(job.progress || 0, 0.03);
      diag.encoder = 'mediarecorder';
      const r = await exportMediaRecorder(job, o, diag);
      blob = r.blob; mime = r.mime;
    } finally {
      try { v.pause(); v.removeAttribute('src'); v.load(); v.remove(); } catch {}
    }

    diag.bytes = blob ? blob.size : 0;
    diag.sizeMB = +((diag.bytes || 0) / 1048576).toFixed(2);
    diag.elapsedMs = Date.now() - diag.startedAt;
    diag.expectedMB = +(((settings.videoBitrate + (diag.hasAudio ? 160000 : 0)) * (dur || 0)) / 8 / 1048576).toFixed(2);
    window.__captoLastExport = diag;
    try { console.log('[Capto export]', JSON.stringify(diag)); } catch {}

    const base = (media.file.name || 'video').replace(/\.[^.]+$/, '');
    job.stage = 'Starting download…';
    job.dest = await saveBlob(blob, `${base}-captioned.${extFor(mime)}`, job);
    return blob;
  }
  function startExportJob(id, body) {
    const jobId = 'j_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const job = { status: 'running', progress: 0, error: null, stage: 'Preparing video…' };
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
        const state = { meta, style, originalName: file.name, language: /^lt\b/i.test(navigator.language || '') ? 'lt' : 'en', cues: [] };
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
        return json({ id, meta, originalName: file.name, style, language: state.language });
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

    // Export job polling. The result is either written to the file handle the
    // user chose up front, or exposed behind an explicit Download button.
    const jm = path.match(/^\/api\/jobs\/([^/]+)$/);
    if (jm) {
      const job = jobs[jm[1]];
      if (!job) return Promise.resolve(json({ status: 'error', error: 'Job expired.' }));
      return Promise.resolve(json({ status: job.status, progress: job.progress, stage: job.stage || null, error: job.error, savedPath: job.dest || null, downloadReady: !!job.downloadReady, downloadName: job.downloadName || null }));
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
    const ADMINS = ['trycapto@gmail.com', 'augustas.armalis@aiacquisition.com'];
    const isAdmin = ADMINS.indexOf((u.email || '').toLowerCase()) >= 0;
    const icLearn = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 4.6L18.5 9l-4.6 1.9L12 15.5 10.1 10.9 5.5 9l4.6-1.4z"/></svg>';
    menu.innerHTML =
      `<div class="hd"><div class="nm2">${escHtml(nm)}</div><div class="em">${escHtml(u.email || '')}</div></div>` +
      `<div class="sep"></div>` +
      `<button data-a="settings">${icSettings} Settings</button>` +
      `<button data-a="billing">${icBilling} Billing</button>` +
      (isAdmin ? `<button data-a="admin">${icLearn} Admin panel</button>` : '') +
      `<button data-a="theme">${icTheme} Toggle theme</button>` +
      `<div class="sep"></div>` +
      `<button data-a="signout">${icOut} Sign out</button>`;
    document.body.appendChild(menu);
    menu.style.top = (r.bottom + 8) + 'px';
    menu.style.right = Math.max(12, window.innerWidth - r.right) + 'px';
    menu.querySelector('[data-a="settings"]').onclick = goTop('/settings');
    menu.querySelector('[data-a="billing"]').onclick = goTop('/billing');
    if (isAdmin) menu.querySelector('[data-a="admin"]').onclick = goTop('/admin');
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
      // body.capto-home → CSS centres the top bar like the platform AppNav, but
      // ONLY on the home view; inside the editor the top bar stays full-width.
      const sync = () => { const onHome = !!(homeView && !homeView.hidden); nav.style.display = onHome ? '' : 'none'; document.body.classList.toggle('capto-home', onHome); };
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
      if (u.signedIn && u.plan === 'free') {
        // Free runs on the user's own (free) Groq key — show a key prompt, not minutes.
        card.style.display = '';
        card.innerHTML =
          `<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">` +
            `<div>` +
              `<div style="display:flex;align-items:center;gap:9px;margin-bottom:5px">` +
                `<span style="font-size:13.5px;font-weight:650;color:var(--text)">Your own engine</span>` +
                `<span style="font-size:10.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;padding:2px 8px;border-radius:99px;color:#0b0c14;background:linear-gradient(120deg,#a0c1ff,#8983ff)">Free</span>` +
              `</div>` +
              `<div style="font-size:12px;color:var(--muted);max-width:46ch">Capto Free runs on your own Groq key — it's free and uncapped. Create one in seconds, paste it in Settings, and caption away. Or upgrade to run on Capto's engines.</div>` +
            `</div>` +
            `<div style="display:flex;gap:8px">` +
              `<button id="capto-byok" class="btn sm">Add key</button>` +
              `<button id="capto-topup" class="btn primary sm">Upgrade</button>` +
            `</div>` +
          `</div>`;
        const bk = document.getElementById('capto-byok'); if (bk) bk.onclick = goTop('/settings?tab=keys');
        const tu = document.getElementById('capto-topup'); if (tu) tu.onclick = goTop('/billing');
      } else if (u.signedIn && u.plan === 'friend') {
        // A comped friend — no minute meter, just a warm (and slightly cheeky) note.
        const who = (u.name || '').split(' ')[0];
        card.style.display = '';
        card.style.background = 'linear-gradient(120deg, rgba(255,209,51,.12), rgba(255,138,170,.07) 60%, rgba(137,131,255,.06))';
        card.innerHTML =
          `<div style="display:flex;align-items:center;gap:9px;margin-bottom:6px">` +
            `<span style="font-size:13.5px;font-weight:650;color:var(--text)">${who ? 'Hey ' + who + ' 👋' : 'Hey friend 👋'}</span>` +
            `<span style="font-size:10.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;padding:2px 8px;border-radius:99px;color:#0b0c14;background:linear-gradient(120deg,#ffd233,#ff8aaa)">Friend 💛</span>` +
          `</div>` +
          `<div style="font-size:12.5px;color:var(--muted);max-width:54ch;line-height:1.55">` +
            `You're on the house — unlimited captions, no watermark, all the good stuff. ` +
            `Just… <b style="color:var(--text)">pretty please don't melt my API credits</b> 😅 go easy on the 2-hour 4K marathons. ` +
            `And if anything breaks, <b style="color:var(--text)">tell me</b> so I can fix it. Thanks for trying it out, legend.` +
          `</div>`;
      } else if (u.signedIn && m) {
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
      if (u.plan === 'friend') parts.push('Friend perk: unlimited exports, no watermark — go easy on my credits 💛');
      else if (lbl) parts.push(lbl);
      line.textContent = parts.join(' · ');
      line.style.display = parts.length ? '' : 'none';
    }
  }

  // ───────────────── searchable custom dropdowns ─────────────────
  // Overlay a styled, searchable menu on top of the native <select> (which stays
  // in the DOM as the value source so app.js's value reads/writes keep working).
  // Essential for the ~98-language list; also unifies the engine pickers.
  const COMBO_SEARCH_MIN = 8; // show the search box once a list has this many options
  function enhanceSelect(sel) {
    if (!sel || sel.__captoCombo || sel.tagName !== 'SELECT') return;
    const wrap = document.createElement('div');
    wrap.className = 'capto-combo';
    sel.parentNode.insertBefore(wrap, sel);
    wrap.appendChild(sel);
    sel.classList.add('capto-combo-native');
    sel.setAttribute('tabindex', '-1');
    sel.setAttribute('aria-hidden', 'true');

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'capto-combo-btn';
    btn.setAttribute('aria-haspopup', 'listbox');
    btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = '<span class="capto-combo-label"></span><svg class="capto-combo-chev" width="11" height="7" viewBox="0 0 11 7"><path d="M1 1l4.5 4.5L10 1" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    const pop = document.createElement('div');
    pop.className = 'capto-combo-pop';
    pop.hidden = true;
    pop.innerHTML = '<div class="capto-combo-search" hidden><input type="text" autocomplete="off" spellcheck="false" placeholder="Search…"></div><ul class="capto-combo-list" role="listbox"></ul>';
    wrap.appendChild(btn);
    wrap.appendChild(pop);
    // The popup is position:fixed (escapes the panel's overflow clipping); park it
    // on <body> so no ancestor transform/overflow can affect it.
    document.body.appendChild(pop);

    const labelEl = btn.querySelector('.capto-combo-label');
    const searchWrap = pop.querySelector('.capto-combo-search');
    const searchInput = pop.querySelector('input');
    const list = pop.querySelector('.capto-combo-list');
    let activeIdx = -1;

    const curLabel = () => { const o = sel.options[sel.selectedIndex]; return o ? o.textContent : ''; };
    function refresh() { labelEl.textContent = curLabel(); btn.disabled = sel.disabled; }

    function buildList(filter) {
      const f = (filter || '').trim().toLowerCase();
      list.innerHTML = '';
      activeIdx = -1;
      let firstEnabled = -1;
      [...sel.options].forEach((o) => {
        const text = o.textContent || '';
        if (f && text.toLowerCase().indexOf(f) < 0 && (o.value || '').toLowerCase().indexOf(f) < 0) return;
        const li = document.createElement('li');
        li.className = 'capto-combo-opt';
        li.setAttribute('role', 'option');
        li.textContent = text;
        li.dataset.value = o.value;
        if (o.disabled) { li.classList.add('is-disabled'); li.dataset.disabled = '1'; }
        if (o.value === sel.value) { li.classList.add('is-selected'); li.setAttribute('aria-selected', 'true'); }
        if (!o.disabled && firstEnabled < 0) firstEnabled = list.children.length;
        li.addEventListener('mousedown', (e) => { e.preventDefault(); if (!o.disabled) choose(o.value); });
        list.appendChild(li);
      });
      if (!list.children.length) {
        const empty = document.createElement('div');
        empty.className = 'capto-combo-empty';
        empty.textContent = 'No matches';
        list.appendChild(empty);
        return;
      }
      const selIdx = [...list.children].findIndex((li) => li.dataset && li.dataset.value === sel.value && !li.dataset.disabled);
      setActive(selIdx >= 0 ? selIdx : firstEnabled);
    }
    function setActive(i) {
      const items = [...list.children];
      if (activeIdx >= 0 && items[activeIdx]) items[activeIdx].classList.remove('is-active');
      activeIdx = i;
      if (i >= 0 && items[i]) { items[i].classList.add('is-active'); items[i].scrollIntoView({ block: 'nearest' }); }
    }
    function moveActive(d) {
      const items = [...list.children].filter((c) => c.classList.contains('capto-combo-opt'));
      if (!items.length) return;
      let idx = items.indexOf(list.children[activeIdx]);
      for (let k = 0; k < items.length; k++) {
        idx = (idx + d + items.length) % items.length;
        if (!items[idx].dataset.disabled) break;
      }
      setActive([...list.children].indexOf(items[idx]));
    }
    function choose(val) {
      if (sel.value !== val) {
        sel.value = val;
        sel.dispatchEvent(new Event('input', { bubbles: true }));
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      }
      refresh();
      close();
    }
    function place() {
      const r = btn.getBoundingClientRect();
      const vh = window.innerHeight, vw = window.innerWidth;
      const below = vh - r.bottom - 10, above = r.top - 10;
      const useAbove = below < 220 && above > below;
      const avail = Math.max(150, Math.min(320, useAbove ? above : below));
      const width = Math.max(r.width, 150);
      pop.style.width = width + 'px';
      pop.style.left = Math.max(8, Math.min(r.left, vw - width - 8)) + 'px';
      if (useAbove) { pop.style.top = ''; pop.style.bottom = (vh - r.top + 6) + 'px'; pop.style.maxHeight = avail + 'px'; }
      else { pop.style.bottom = ''; pop.style.top = (r.bottom + 6) + 'px'; pop.style.maxHeight = avail + 'px'; }
    }
    function open() {
      if (!pop.hidden || sel.disabled) return;
      const many = sel.options.length >= COMBO_SEARCH_MIN;
      searchWrap.hidden = !many;
      if (searchInput) searchInput.value = '';
      buildList('');
      pop.hidden = false;
      place();
      btn.setAttribute('aria-expanded', 'true');
      wrap.classList.add('is-open');
      if (many && searchInput) setTimeout(() => searchInput.focus(), 0);
      document.addEventListener('mousedown', onDocDown, true);
      window.addEventListener('scroll', onScroll, true);
      window.addEventListener('resize', onScroll, true);
    }
    function close() {
      if (pop.hidden) return;
      pop.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
      wrap.classList.remove('is-open');
      document.removeEventListener('mousedown', onDocDown, true);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll, true);
    }
    function onDocDown(e) { if (!wrap.contains(e.target) && !pop.contains(e.target)) close(); }
    function onScroll() { if (!pop.hidden) place(); }

    btn.addEventListener('click', () => { pop.hidden ? open() : close(); });
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (pop.hidden) open(); else moveActive(1); }
      else if (e.key === 'Escape') close();
    });
    if (searchInput) {
      searchInput.addEventListener('input', () => buildList(searchInput.value));
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); moveActive(1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); moveActive(-1); }
        else if (e.key === 'Enter') { e.preventDefault(); const li = list.children[activeIdx]; if (li && li.dataset && !li.dataset.disabled && li.dataset.value != null) choose(li.dataset.value); }
        else if (e.key === 'Escape') { e.preventDefault(); close(); btn.focus(); }
      });
    }
    // Keep the button label in sync when app.js rebuilds <option>s or flips disabled.
    try { new MutationObserver(() => { refresh(); if (!pop.hidden) buildList(searchInput ? searchInput.value : ''); }).observe(sel, { childList: true, attributes: true, attributeFilter: ['disabled'] }); } catch {}
    sel.addEventListener('change', refresh);
    sel.__captoCombo = { refresh, close };
    refresh();
  }
  function setupCustomDropdowns() {
    // Language is the only user-facing transcription choice. Keep engine
    // selects as hidden implementation details so enhancing the native select
    // can never accidentally surface a model picker.
    ['homeLang', 'editLang', 'uploadLang', 'setLang']
      .forEach((id) => { try { enhanceSelect(document.getElementById(id)); } catch (e) { console.warn('[Capto] combo', id, e); } });
    applyEngineVisibility();
  }
  // Re-run after the plan resolves (fetchMe → __captoRefreshEngines repopulates the
  // engine lists); enhanceSelect is idempotent, so this only catches any new nodes.
  window.__captoSetupDropdowns = setupCustomDropdowns;

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
    // Save-location row: supported desktop browsers choose the file before
    // encoding. Other browsers keep this row visible and offer a reliable,
    // explicit download click once the export is ready.
    const dest = document.getElementById('exDest');
    const chooseBtn = document.getElementById('exChooseDir');
    const pathEl = document.getElementById('exPath');
    if (dest) {
      if (supportsSavePicker) {
        dest.style.display = '';
        if (pathEl) { pathEl.textContent = 'Choose a file'; pathEl.title = ''; }
        if (chooseBtn) { chooseBtn.textContent = 'Choose file…'; chooseBtn.onclick = chooseSaveLocation; }
      } else {
        dest.style.display = '';
        if (pathEl) { pathEl.textContent = 'Choose after export'; pathEl.title = 'Your browser will ask where to save when the video is ready.'; }
        if (chooseBtn) { chooseBtn.textContent = 'Browser download'; chooseBtn.disabled = true; }
      }
    }
    const downloadBtn = document.getElementById('exDownload');
    if (downloadBtn) downloadBtn.onclick = (event) => {
      event.preventDefault();
      const pending = window.__captoPendingDownload;
      if (!pending || !pending.url) return false;
      triggerBrowserDownload(pending);
      setTimeout(() => {
        downloadBtn.innerHTML = `<svg class="ic"><use href="#i-download"/></svg> Download again`;
      }, 0);
      return false;
    };
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
    setupCustomDropdowns();
    renderQuotaUI();
    fetchMe();
  });
})();
