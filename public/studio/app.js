'use strict';

/* ============================ constants ============================ */
const FONTS = [
  { family: 'Inter', label: 'Inter' }, { family: 'Anton', label: 'Anton' },
  { family: 'Archivo Black', label: 'Archivo Black' }, { family: 'Bebas Neue', label: 'Bebas Neue' },
  { family: 'Poppins', label: 'Poppins' }, { family: 'Lato', label: 'Lato' },
  { family: 'Luckiest Guy', label: 'Luckiest Guy' }, { family: 'Pacifico', label: 'Pacifico' },
];
const HAS_BOLD = new Set(['Inter', 'Poppins', 'Lato']);
// Engines + languages come from the bridge's canonical catalogue (window.__captoModels
// / __captoLangs), which mirrors lib/ai/models.ts and the dashboard. Fallbacks keep
// the editor working if the bridge ever fails to load.
// Read lazily each call so the bridge's ~98-language set always wins, even if
// app.js gets evaluated a tick before window.__captoLangs is populated.
function getLanguages() {
  const src = window.__captoLangs && window.__captoLangs.length
    ? window.__captoLangs
    : [['auto', 'Auto-detect'], ['en', 'English']];
  return src.map(([code, label]) => ({ code, label }));
}
const langLabel = (code) => (getLanguages().find((l) => l.code === code) || {}).label || 'audio';
const CASES = [{ code: 'lower', label: 'ab' }, { code: 'sentence', label: 'Ab' }, { code: 'title', label: 'Ab Cd' }, { code: 'upper', label: 'AB' }];
const SWATCHES = ['#FFFFFF', '#111319', '#FFE36E', '#7C6CFF', '#46D39A', '#FF6B81', '#54C7FC', '#FF8FD0'];

/* ============================ helpers ============================ */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const fmtClock = (s) => { s = Math.max(0, s || 0); const m = Math.floor(s / 60), sec = Math.floor(s % 60); return `${m}:${String(sec).padStart(2, '0')}`; };
const parseClock = (str) => { str = String(str).trim(); if (str.includes(':')) { const [m, s] = str.split(':'); return (parseInt(m) || 0) * 60 + (parseFloat(s) || 0); } return parseFloat(str) || 0; };
const escapeHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function applyCase(t, mode) {
  if (mode === 'lower') return t.toLocaleLowerCase();
  if (mode === 'upper') return t.toLocaleUpperCase();
  if (mode === 'title') return t.replace(/\S+/g, (w) => w.charAt(0).toLocaleUpperCase() + w.slice(1).toLocaleLowerCase());
  return t;
}
const hexA = (hex, o) => { const h = hex.replace('#', ''); return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${o})`; };
// Resolve the numeric font weight (300–900). Migrates legacy `bold` boolean.
function styleWeight(s) {
  if (typeof s.weight === 'number') return clamp(s.weight, 100, 900);
  return s.bold ? 700 : 400;
}
// Ensure a style object has a numeric `weight` (back-compat for old projects/presets).
function normalizeStyle(s) {
  if (!s) return s;
  if (typeof s.weight !== 'number') s.weight = s.bold ? 700 : 400;
  if (typeof s.lineHeight !== 'number') s.lineHeight = 1.1;
  // Back-compat: projects saved before the highlight-mode feature.
  if (typeof s.highlightMode !== 'string') s.highlightMode = 'color';
  if (typeof s.highlightBg !== 'string') s.highlightBg = '#FFD233';
  if (typeof s.highlightPill !== 'boolean') s.highlightPill = false;
  if (typeof s.wordSpacing !== 'number') s.wordSpacing = 0;
  if (typeof s.hollow !== 'boolean') s.hollow = false;
  if (typeof s.gradient !== 'boolean') s.gradient = false;
  if (typeof s.wordReveal !== 'boolean') s.wordReveal = false;
  return s;
}
const optList = (items, sel) => items.map((i) => i.code === '__sep' ? `<option disabled>${i.label}</option>` : `<option value="${i.code}"${i.code === sel ? ' selected' : ''}>${i.label}</option>`).join('');

/* ============================ state ============================ */
const state = {
  id: null, meta: null, originalName: '', cues: [], style: null,
  language: 'en', engine: 'auto', model: 'auto',
  rows: 1, capRow: 0, scriptRow: 0,
  activeCue: -1, selCue: -1, pinnedCueId: null, duration: 0, zoom: 1,
  view: { zoom: 1, panX: 0, panY: 0 },
  editingCaption: false, loopCue: -1, playUntil: -1, exportQuality: 'lossless',
  previewOnClick: localStorage.getItem('subby-preview-on-click') === '1',
  rowHeights: {},   // per-row overrides, set by dragging the in-row resize bar
  selectedSet: new Set(),  // multi-select set of cue indices
  selAnchor: -1,           // last single-clicked index, for shift-range selection
};
var health = { engines: { local: true, groq: false, openai: false }, defaultEngine: 'local', defaultModel: 'small' };

const el = {};
['uploadView','dropzone','fileInput','pickBtn','topActions','exportBtn','editor','canvasArea','canvasContent',
 'frame','video','capGhost','capLayer','capSel','zOut','zIn','zFit','zLabel','previewQ','playBtn','timeLabel','loopChk','tlZoom',
 'timeline','tlInner','tlResize','addRowBtn','status','resizer','panel','cues','addCueBtn','capRowSel','capRow',
 'retranscribeBtn','editEngine','editLang','editModel','setEngine','setModel','setLang','setModelField','engineHint',
 'uploadEngine','uploadLang','uploadModel','uploadModelField','uploadHint','homeEngine','homeLang','homeModel','homeModelField','scriptPara','scriptSegs','scriptClear',
 'scriptRewrite','scriptCopy','scriptRowSel','scriptRow','tlAddCueBtn','linkChk','exportModal','tiers','exBar','exBarWrap','exTitle','exSub','exMainActions',
 'exDoneActions','exStart','exCancel','exClose','exError','toast','exDest',
 'homeView','homeGrid','homeCount','homeEmpty','homeFilter','homeSettings','brandHome',
 'setTheme','setGroqKey','setOpenaiKey','setCustomKey','setCustomUrl','setCustomModel','saveKeys','setPreviewClick','undoBtn','redoBtn','backHome','projectName'].forEach((id) => el[id] = document.getElementById(id));

// SAFETY NET: if any cached id is missing from the HTML, back it with a detached
// dummy element. That way `el.missing.onclick = …` is a harmless no-op instead of a
// TypeError that halts the whole script and silently kills every handler below it.
for (const k of Object.keys(el)) {
  if (!el[k]) {
    console.warn('[Capto] missing element #' + k + ' — using a safe stub');
    el[k] = document.createElement('div');
  }
}

/* ============================ init ============================ */

init();
async function init() {
  try { health = await (await fetch('/api/health')).json(); } catch {}
  // Managed service: default to "Auto" (server picks the best engine the user can run).
  state.engine = 'auto'; state.model = 'auto';
  populateSelectors();
  loadCustomPresets();   // fetch the user's saved style presets (async; grid refreshes)
  applyPanelWidth();
  // Start on the home view (project library). The user picks an existing
  // project or hits "New video" to upload.
  showHome();
}
function userPlanRank() {
  const u = window.__captoUser || {}; const r = window.__captoPlanRank || { free: 0, pro: 1, ultra: 2 };
  return r[u.plan] != null ? r[u.plan] : 0;
}
// Engine dropdown = "Auto" + the canonical STT models, plan-gated exactly like the
// dashboard/settings: models above the user's plan show but are disabled with a
// (Pro)/(Ultra) tag. BYOK note: the server still honours a user key for any model.
function engineOptions(sel) {
  const models = window.__captoModels || [];
  const planR = window.__captoPlanRank || { free: 0, pro: 1, ultra: 2 };
  const rank = userPlanRank();
  let html = `<option value="auto"${sel === 'auto' ? ' selected' : ''}>Auto — best engine</option>`;
  for (const m of models) {
    const ok = (planR[m.minPlan] || 0) <= rank;
    const tag = m.minPlan === 'ultra' ? ' (Ultra)' : ' (Pro)';
    html += `<option value="${m.id}"${m.id === sel ? ' selected' : ''}${ok ? '' : ' disabled'}>${ok ? m.label : m.label + tag}</option>`;
  }
  return html;
}
function populateSelectors() {
  [el.uploadEngine, el.setEngine, el.editEngine, el.homeEngine].forEach((s) => s.innerHTML = engineOptions(state.engine));
  const langHtml = getLanguages().map((l) => `<option value="${l.code}"${l.code === state.language ? ' selected' : ''}>${l.label}</option>`).join('');
  [el.uploadLang, el.setLang, el.editLang, el.homeLang].forEach((s) => s.innerHTML = langHtml);
  syncSelectors();
  el.uploadHint.textContent = 'Auto picks the best engine for your clip. Add your own keys in Settings to unlock more.';
}
// Expose so the bridge can refresh the engine list once the signed-in plan loads
// (fetchMe resolves after init), keeping Pro/Ultra models enabled when applicable.
window.__captoRefreshEngines = populateSelectors;
function syncSelectors() {
  [el.uploadEngine, el.setEngine, el.editEngine, el.homeEngine].forEach((s) => s.value = state.engine);
  [el.uploadLang, el.setLang, el.editLang, el.homeLang].forEach((s) => s.value = state.language);
  // Managed service — there's no local-model size picker. Always hide those fields.
  el.uploadModelField.hidden = true; el.setModelField.hidden = true; el.editModel.hidden = true;
  if (el.homeModelField) el.homeModelField.hidden = true;
}
function bindSel(elem, key) { elem.addEventListener('change', () => { state[key] = elem.value; syncSelectors(); if (key === 'engine') populateSelectors(); }); }
[['uploadEngine','engine'],['setEngine','engine'],['editEngine','engine'],['homeEngine','engine'],
 ['uploadLang','language'],['setLang','language'],['editLang','language'],['homeLang','language']].forEach(([id, k]) => bindSel(el[id], k));

/* ============================ home view ============================ */
// Home shows your project library. Editor is shown when a project is loaded.
var homeProjects = [];
async function refreshHome() {
  try {
    const list = await (await fetch('/api/projects')).json();
    homeProjects = Array.isArray(list) ? list : [];
  } catch { homeProjects = []; }
  renderHome();
}
function fmtDuration(s) { s = Math.max(0, s | 0); const m = (s / 60) | 0; const r = s - m * 60; return `${m}:${String(r).padStart(2, '0')}`; }
function fmtRelative(iso) {
  if (!iso) return '';
  const d = new Date(iso); if (isNaN(d)) return '';
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${(diff / 60) | 0}m ago`;
  if (diff < 86400) return `${(diff / 3600) | 0}h ago`;
  if (diff < 2592000) return `${(diff / 86400) | 0}d ago`;
  return d.toLocaleDateString();
}
function renderHome() {
  const q = (el.homeFilter.value || '').trim().toLowerCase();
  const items = q ? homeProjects.filter((p) => (p.name || '').toLowerCase().includes(q)) : homeProjects;
  el.homeCount.textContent = items.length ? `· ${items.length}` : '';
  el.homeEmpty.hidden = items.length > 0;
  el.homeGrid.innerHTML = items.map((p, k) => `
    <div class="proj" data-id="${p.id}" style="animation-delay:${k * 18}ms">
      <div class="thumb" style="background-image:url(/api/projects/${p.id}/thumb)">
        <div class="thumb-fallback">🎬</div>
        <span class="badge dur">${fmtDuration(p.duration)}</span>
        ${p.cueCount ? `<span class="badge">${p.cueCount} captions</span>` : ''}
        <div class="actions">
          <button class="rn" title="Rename"><svg class="ic sm"><use href="#i-edit"/></svg></button>
          <button class="del" title="Delete"><svg class="ic sm"><use href="#i-trash"/></svg></button>
        </div>
      </div>
      <div class="info">
        <div class="name" title="${escapeAttr(p.name || '')}">${escapeHtml(p.name || 'video')}</div>
        <div class="meta">${fmtRelative(p.updatedAt) || ''} ${p.language ? '· ' + p.language : ''} · ${p.width}×${p.height}</div>
      </div>
    </div>`).join('');
}
function escapeAttr(s) { return String(s).replace(/"/g, '&quot;'); }

el.homeGrid.addEventListener('click', async (e) => {
  const card = e.target.closest('.proj'); if (!card) return;
  const id = card.dataset.id;
  // closest() because the click target is the SVG icon inside the button, not the button itself.
  const delBtn = e.target.closest('.del');
  const rnBtn = e.target.closest('.rn');
  if (delBtn) {
    e.stopPropagation(); e.preventDefault();
    if (!(await confirmDialog('Delete this project? The video file will be removed too.', { okLabel: 'Delete', danger: true }))) return;
    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('delete failed');
      homeProjects = homeProjects.filter((p) => p.id !== id); // optimistic remove from local list
      renderHome();
      toast('Project deleted');
    } catch { toast('Could not delete project', true); }
    return;
  }
  if (rnBtn) {
    e.stopPropagation(); e.preventDefault();
    const cur = homeProjects.find((p) => p.id === id);
    const name = await promptDialog('Rename project', cur?.name || '');
    if (!name) return;
    await fetch(`/api/projects/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
    if (cur) cur.name = name; renderHome();
    return;
  }
  openExistingProject(id);
});
el.homeFilter && el.homeFilter.addEventListener('input', renderHome);
el.brandHome.onclick = () => goHome();

// Big home upload card — drop a file or click to pick. Same uploadFile() pipeline.
const homeDz = document.getElementById('homeDropzone');
const homeFi = document.getElementById('homeFileInput');
if (homeDz && homeFi) {
  homeDz.addEventListener('click', () => homeFi.click());
  homeDz.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); homeFi.click(); } });
  ['dragenter', 'dragover'].forEach((ev) => homeDz.addEventListener(ev, (e) => { e.preventDefault(); homeDz.classList.add('drag'); }));
  ['dragleave', 'drop'].forEach((ev) => homeDz.addEventListener(ev, (e) => { e.preventDefault(); homeDz.classList.remove('drag'); }));
  homeDz.addEventListener('drop', (e) => {
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith('video')) { hideHome(); uploadFile(f); }
    else toast('Please drop a video file.', true);
  });
  homeFi.addEventListener('change', () => {
    if (homeFi.files[0]) { hideHome(); uploadFile(homeFi.files[0]); }
  });
}

async function openExistingProject(id) {
  try {
    const p = await (await fetch('/api/projects/' + id)).json();
    if (p.error) throw new Error(p.error);
    openProject({ id, meta: p.meta, originalName: p.originalName, style: p.style, cues: p.cues });
    hideHome();
  } catch (err) { toast(err.message || 'Could not open project', true); }
}
function showHome() {
  el.homeView.hidden = false; el.uploadView.hidden = true;
  el.editor && (el.editor.style.display = 'none');
  el.topActions.hidden = true;
  el.backHome.hidden = true;
  el.projectName.hidden = true;
  refreshHome();
}
function hideHome() {
  el.homeView.hidden = true;
  el.editor && (el.editor.style.display = '');
  el.backHome.hidden = false;
  if (state.originalName) { el.projectName.hidden = false; el.projectName.textContent = state.originalName; }
}
function showUpload() { el.uploadView.hidden = false; }
function goHome() {
  // unload current project's video so we're not still consuming bandwidth
  try { el.video.pause(); el.video.removeAttribute('src'); el.video.load(); } catch {}
  state.id = null;
  showHome();
}

/* ============================ upload ============================ */
el.pickBtn.onclick = () => el.fileInput.click();
el.fileInput.onchange = () => { if (el.fileInput.files[0]) uploadFile(el.fileInput.files[0]); };
['dragenter', 'dragover'].forEach((ev) => el.dropzone.addEventListener(ev, (e) => { e.preventDefault(); el.dropzone.classList.add('drag'); }));
['dragleave', 'drop'].forEach((ev) => el.dropzone.addEventListener(ev, (e) => { e.preventDefault(); el.dropzone.classList.remove('drag'); }));
el.dropzone.addEventListener('drop', (e) => { const f = e.dataTransfer.files[0]; if (f && f.type.startsWith('video')) uploadFile(f); else toast('Please drop a video file.', true); });
async function uploadFile(file) {
  $('.dz-inner', el.dropzone).innerHTML = `<img class="dz-logo" src="/studio/logo.svg"><h1>Uploading…</h1><p>${escapeHtml(file.name)}</p>`;
  const form = new FormData(); form.append('video', file);
  try {
    const res = await fetch('/api/projects', { method: 'POST', body: form });
    const data = await res.json(); if (!res.ok) throw new Error(data.error || 'Upload failed');
    openProject(data); transcribeProject();
  } catch (err) { toast(err.message, true); resetUpload(); }
}
function resetUpload() {
  $('.dz-inner', el.dropzone).innerHTML = `<img class="dz-logo" src="/studio/logo.svg"><h1>Caption your video</h1>
    <p>Drop a clip or choose a file — Capto auto‑captions it with AI. Everything stays on your machine.</p>
    <button class="btn primary lg" id="pickBtn">Choose a video</button>`;
  $('#pickBtn').onclick = () => el.fileInput.click();
}

/* ============================ project ============================ */
function openProject(data) {
  state.id = data.id; state.meta = data.meta;
  // Brand-new project (just uploaded, no cues yet) → overlay the user's saved
  // default style on top of the server's defaults. Existing project → use what's saved.
  const stored = loadDefaultStyle();
  const isNewProject = !data.cues || !data.cues.length;
  state.style = isNewProject && stored ? { ...data.style, ...stored } : data.style;
  normalizeStyle(state.style);
  state.cues = (data.cues || []).map((c) => ({ row: 0, ...c })); state.originalName = data.originalName;
  // Self-heal: if the saved project has cues that overlap on the same row
  // (older transcriptions / engine glitches), redistribute them across rows now.
  if (state.cues.some((a, i) => state.cues.some((b, j) => j !== i && (a.row || 0) === (b.row || 0) && a.start < b.end && b.start < a.end))) {
    state.rows = Math.max(state.rows || 1, distributeRows(state.cues));
  }
  state.duration = data.meta.duration; state.selCue = -1; state.view = { zoom: 1, panX: 0, panY: 0 };
  ensureRows();
  // Sequentialise any residual same-row micro-overlaps now that duration + rows
  // are known (the loosened row-spill tolerance can leave a small overlap that
  // would otherwise hide a cue until the next structural edit).
  fixOverlaps();
  el.uploadView.hidden = true; el.topActions.hidden = false;
  // Loading a project means we leave the home view behind. hideHome() also
  // unhides the back chevron + the editable project name in the topbar.
  if (el.homeView) hideHome();
  el.video.src = previewSrc();
  el.video.onloadedmetadata = () => { state.duration = el.video.duration || state.duration; fitFrame(); applyView(); renderAll(); };
  el.editLang.value = state.language; el.editEngine.value = state.engine; el.editModel.value = state.model;
  renderStylePanel(); renderAll();
}
function renderAll() { fitFrame(); renderCues(); renderTimeline(); renderOverlay(); renderRowSelectors(); }

/* ---- playback quality (preview proxy) ---- */
// Returns the URL to feed the <video>. 'auto' downscales only big sources.
function previewSrc() {
  const q = el.previewQ ? el.previewQ.value : 'auto';
  // Capto web: the video never leaves the device — play the local object URL
  // directly instead of streaming it back from a server. Only when the loaded
  // file belongs to THIS project (else a reopened project triggers relink).
  if (window.__captoMedia && window.__captoMedia.url && window.__captoMedia.id === state.id) return window.__captoMedia.url;
  if (!state.id) return '';
  if (q === 'orig') return `/api/projects/${state.id}/video`;
  let h = parseInt(q, 10);
  if (q === 'auto') {
    const sh = state.meta?.height || 1080;
    h = sh > 1440 ? 720 : (sh > 1080 ? 1080 : 0);   // only proxy when clearly large
  }
  return h ? `/api/projects/${state.id}/preview/${h}` : `/api/projects/${state.id}/video`;
}
if (el.previewQ) {
  el.previewQ.value = localStorage.getItem('subby-preview-q') || 'auto';
  el.previewQ.onchange = () => {
    localStorage.setItem('subby-preview-q', el.previewQ.value);
    if (!state.id) return;
    const t = el.video.currentTime, wasPlaying = !el.video.paused;
    el.video.src = previewSrc();
    setStatus('<span class="spinner"></span> Switching playback quality…');
    el.video.addEventListener('loadeddata', () => { try { el.video.currentTime = t; } catch {} if (wasPlaying) el.video.play().catch(() => {}); setStatus(''); }, { once: true });
  };
}

async function transcribeProject(opts) {
  const oneWord = !!(opts && opts.oneWord);
  const lang = langLabel(state.language);
  setStatus(`<span class="spinner"></span> Generating ${lang} captions…`);
  el.cues.innerHTML = '<div class="cue-empty"><span class="spinner"></span><br>Generating captions…</div>';
  el.retranscribeBtn.disabled = true;
  showTranscribeProgress(0, 1);
  // Live progress: the bridge streams partial captions per chunk so they fill
  // into the timeline as they're generated, with a progress bar.
  window.__captoOnTranscribeProgress = ({ done, total, cues }) => {
    showTranscribeProgress(done, total);
    if (cues && cues.length) {
      state.cues = cues.map((c) => ({ row: 0, ...c }));
      state.rows = 1; state.capRow = 0;
      try { ensureRows(); renderTimeline(); renderCues(); renderOverlay(); } catch {}
    }
  };
  try {
    const res = await fetch(`/api/projects/${state.id}/transcribe`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ language: state.language, engine: state.engine, model: state.engine, oneWord }) });
    const data = await res.json(); if (!res.ok) throw new Error(data.error || 'Transcription failed');
    // Tag each cue with the AI's ORIGINAL text + timing so later user edits can be
    // diffed against it for the learning telemetry (see sendFeedback).
    state.cues = data.cues.map((c) => ({ row: 0, ...c, _ai: c.text, _aiStart: c.start, _aiEnd: c.end }));
    state.engineUsed = data.engine || null;   // the model that actually ran (for accuracy attribution)
    for (const k of Object.keys(fbSent)) delete fbSent[k];           // fresh baseline
    sendFeedback({ kind: 'regenerate', payload: { count: data.cues.length, language: data.language || state.language } });
    // Keep first-generation captions on a SINGLE row — the chunker produces
    // non-overlapping cues and the user explicitly wants the Subby-style
    // single-line look. If micro-overlaps from raw STT timings slip through,
    // fixOverlaps() sequentialises them on the same row.
    state.cues.forEach((c) => { c.row = 0; });
    state.rows = 1;
    state.capRow = 0; state.scriptRow = 0;
    fixOverlaps();
    setStatus(`Done — ${data.cues.length} captions${data.language ? ` (${data.language})` : ''}.`);
    renderAll(); renderScript();
    saveSoon();   // PERSIST freshly-generated captions immediately (don't wait for an edit)
  } catch (err) { setStatus(err.message, true); el.cues.innerHTML = `<div class="cue-empty">⚠️ ${escapeHtml(err.message)}</div>`; }
  finally { el.retranscribeBtn.disabled = false; window.__captoOnTranscribeProgress = null; hideTranscribeProgress(); }
}
// ── live transcription progress bar (fills as captions are generated) ──
function transcribeProgressEl() {
  let bar = document.getElementById('capto-tr-progress');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'capto-tr-progress';
    bar.style.cssText = 'position:fixed;left:50%;top:16px;transform:translateX(-50%);z-index:200;background:var(--surface-2,#17171b);border:1px solid var(--line-2,rgba(255,255,255,.12));border-radius:12px;padding:11px 16px;box-shadow:0 16px 44px -10px rgba(0,0,0,.6);display:none;min-width:260px;text-align:center';
    bar.innerHTML = '<div id="capto-tr-label" style="font-size:13px;color:var(--text,#f1f1f4);margin-bottom:9px;font-weight:600">Generating captions…</div><div style="height:6px;border-radius:99px;background:rgba(255,255,255,.08);overflow:hidden"><div id="capto-tr-fill" style="height:100%;width:8%;border-radius:99px;background:linear-gradient(90deg,#82a5ff,#62d8ff);transition:width .35s"></div></div>';
    document.body.appendChild(bar);
  }
  return bar;
}
function showTranscribeProgress(done, total) {
  const bar = transcribeProgressEl(); bar.style.display = 'block';
  const fill = document.getElementById('capto-tr-fill'), label = document.getElementById('capto-tr-label');
  if (total > 1) {
    const pct = Math.max(4, Math.round((done / total) * 100));
    if (fill) fill.style.width = pct + '%';
    if (label) label.textContent = done >= total ? 'Finishing up…' : `Generating captions… ${done} / ${total} (${pct}%)`;
  } else {
    if (fill) fill.style.width = done > 0 ? '92%' : '20%';
    if (label) label.textContent = 'Generating captions…';
  }
}
function hideTranscribeProgress() { const bar = document.getElementById('capto-tr-progress'); if (bar) bar.style.display = 'none'; }
el.retranscribeBtn.onclick = async () => { if (state.cues.length && !(await confirmDialog('Re-transcribe from audio? This replaces the current captions.', { okLabel: 'Re-transcribe' }))) return; transcribeProject(); };
// (the old topbar "New" button was removed — back chevron handles going home)

/* ============================ cue model ============================ */
function ensureRows() { const mx = state.cues.reduce((m, c) => Math.max(m, c.row || 0), 0); state.rows = Math.max(1, mx + 1, state.rows); }
function cuesInRow(r) { return state.cues.map((c, i) => ({ c, i })).filter((x) => (x.c.row || 0) === r).sort((a, b) => a.c.start - b.c.start); }
function redistributeWords(cue) {
  const toks = cue.text.split(/\s+/).filter(Boolean); const span = Math.max(0.001, cue.end - cue.start), per = span / Math.max(1, toks.length);
  cue.words = toks.map((w, k) => ({ word: w, start: cue.start + k * per, end: cue.start + (k + 1) * per }));
}
// Re-fit EXISTING (real) word timings into a cue whose bounds just changed —
// proportional remap, NOT equal division. Preserves which word is spoken when
// (so the karaoke highlight stays accurate) while keeping them inside the cue.
function clampWordsToCue(cue) {
  const ws = cue.words; if (!ws || !ws.length) return;
  const wStart = ws[0].start, wEnd = ws[ws.length - 1].end;
  const wSpan = Math.max(1e-3, wEnd - wStart);
  const scale = Math.max(1e-3, cue.end - cue.start) / wSpan;
  cue.words = ws.map((w) => ({
    word: w.word,
    start: cue.start + (w.start - wStart) * scale,
    end: cue.start + (w.end - wStart) * scale,
  }));
}
// clamp a cue's [start,end] so it doesn't overlap same-row neighbors
function neighborBounds(idx) {
  const row = state.cues[idx].row || 0; let lo = 0, hi = state.duration;
  state.cues.forEach((c, j) => { if (j === idx || (c.row || 0) !== row) return; if (c.end <= state.cues[idx].start + 1e-6) lo = Math.max(lo, c.end); if (c.start >= state.cues[idx].end - 1e-6) hi = Math.min(hi, c.start); });
  return { lo, hi };
}

// Sweep every row chronologically. Captions may sit edge-to-edge (back-to-back,
// no forced gap) but can't overlap. OVERLAP_EPS=0 → adjacent captions can touch.
const MIN_DUR = 0.06, OVERLAP_EPS = 0;
// Assign each cue the lowest row index where it doesn't overlap a previously-placed
// cue. The first cue lands on row 0; if the next cue starts before the previous
// one ends (transcription glitch — two engines occasionally do this), it gets row 1,
// and so on. Returns the highest row used, so callers can size state.rows.
// Tolerance for spilling a cue to a NEW row. Raw STT word timings routinely make
// cue[i] start a few ms before cue[i-1] ended; with a tight (1ms) tolerance every
// such micro-overlap forced a new lane, so a one-line transcript ballooned the
// timeline to many rows. We only spill to a fresh row on a REAL overlap (>0.25s);
// fixOverlaps() then sequentialises the tiny ones back-to-back on the same row.
const ROW_SPILL_TOL = 0.25;
function distributeRows(cues) {
  const rowEnds = [];  // rowEnds[r] = the last "end" timestamp on that row
  const sorted = cues.map((c, i) => ({ c, i })).sort((a, b) => a.c.start - b.c.start);
  for (const { c } of sorted) {
    let placed = -1;
    for (let r = 0; r < rowEnds.length; r++) {
      if (c.start >= rowEnds[r] - ROW_SPILL_TOL) { placed = r; break; }
    }
    if (placed < 0) { placed = rowEnds.length; rowEnds.push(0); }
    c.row = placed;
    rowEnds[placed] = c.end;
  }
  return rowEnds.length || 1;
}
function fixOverlaps() {
  for (let r = 0; r < state.rows; r++) {
    const rowCues = state.cues.map((c, i) => ({ c, i })).filter((x) => (x.c.row || 0) === r).sort((a, b) => a.c.start - b.c.start);
    let cursor = 0;
    for (let k = 0; k < rowCues.length; k++) {
      const c = rowCues[k].c;
      const os = c.start, oe = c.end;
      if (c.start < cursor) c.start = cursor;
      if (c.end < c.start + MIN_DUR) c.end = c.start + MIN_DUR;
      if (c.end > state.duration) c.end = state.duration;
      if (c.start >= c.end) c.start = Math.max(0, c.end - MIN_DUR);
      cursor = c.end + OVERLAP_EPS;
      // Only re-distribute the word timings if we ACTUALLY moved the cue. For a
      // normal (non-overlapping) cue we KEEP the engine's real per-word
      // timestamps, so the karaoke highlight lands exactly on the spoken word
      // instead of being equal-divided (which felt generic).
      if ((c.start !== os || c.end !== oe) && c.words && c.words.length) clampWordsToCue(c);
    }
  }
}

/* ============================ captions sidebar ============================ */
function selectAllSoon(node) { setTimeout(() => { try { node.select(); } catch {} }, 0); }
function toggleSel(i) { if (state.selectedSet.has(i)) state.selectedSet.delete(i); else state.selectedSet.add(i); }
function selectRange(a, b) {
  // Chronological range across all rows so shift-clicking from a row-0 cue to a
  // row-1 cue selects everything in between (was previously row-locked).
  const ordered = state.cues.map((c, i) => ({ c, i })).sort((a, b) => a.c.start - b.c.start);
  const idxA = ordered.findIndex((x) => x.i === a), idxB = ordered.findIndex((x) => x.i === b);
  if (idxA < 0 || idxB < 0) { state.selectedSet.add(a); state.selectedSet.add(b); return; }
  const lo = Math.min(idxA, idxB), hi = Math.max(idxA, idxB);
  state.selectedSet.clear();
  for (let k = lo; k <= hi; k++) state.selectedSet.add(ordered[k].i);
}
function paintSelected() {
  $$('.cue', el.cues).forEach((c) => c.classList.toggle('sel', state.selectedSet.has(+c.dataset.i)));
  $$('.tl-block', el.tlInner).forEach((b) => b.classList.toggle('sel', state.selectedSet.has(+b.dataset.i)));
  // Show selection count chip in the captions tab footer if >1
  const banner = $('#selBanner'); if (banner) banner.hidden = state.selectedSet.size < 2; if (banner) $('#selCount', banner).textContent = state.selectedSet.size;
}
function selectAllCues() {
  state.selectedSet.clear();
  state.cues.forEach((_, i) => state.selectedSet.add(i));
  state.selAnchor = state.cues.length ? 0 : -1;
  paintSelected();
}
function clearCueSel() { state.selectedSet.clear(); state.selAnchor = -1; state.selCue = -1; state.pinnedCueId = null; paintSelected(); }
function renderRowSelectors() {
  const show = state.rows > 1;
  el.capRowSel.hidden = !show; el.scriptRowSel.hidden = !show;
  const opts = Array.from({ length: state.rows }, (_, r) => `<option value="${r}">Row ${r + 1}</option>`).join('');
  el.capRow.innerHTML = opts; el.capRow.value = state.capRow;
  el.scriptRow.innerHTML = opts; el.scriptRow.value = state.scriptRow;
}
el.capRow.onchange = () => { state.capRow = +el.capRow.value; renderCues(); };
function renderCues() {
  const rows = cuesInRow(state.capRow);
  if (!rows.length) { el.cues.innerHTML = '<div class="cue-empty">No captions in this row.</div>'; return; }
  el.cues.innerHTML = '';
  rows.forEach(({ c, i }, ord) => {
    const div = document.createElement('div');
    div.className = 'cue'; div.dataset.i = i;
    div.innerHTML = `
      <div class="cue-head">
        <span class="cue-time" data-act="time">${fmtClock(c.start)} → ${fmtClock(c.end)}</span>
        <button class="cue-del" data-act="del" title="Delete"><svg class="ic sm"><use href="#i-trash"/></svg></button>
      </div>
      <textarea rows="1" data-k="text" autocapitalize="off" autocorrect="off" spellcheck="false">${escapeHtml(c.text)}</textarea>`;
    el.cues.appendChild(div);
  });
  $$('.cue textarea', el.cues).forEach((t) => { t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; });
  paintSelected();
}
function autoSizeOne(t) { t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; }

// Card click: select + preview just this caption. Clicking INSIDE the textarea
// only focuses it for editing (no autoplay, no select-all). Shift/Cmd-click = multi-select.
el.cues.addEventListener('pointerdown', (e) => {
  if (e.target.closest('[data-act]') || e.target.tagName === 'INPUT') return;
  const card = e.target.closest('.cue'); if (!card) return;
  const i = +card.dataset.i, cue = state.cues[i];
  const ta = $('textarea', card);
  const inTextarea = e.target === ta;
  // Multi-select keys take precedence — and we MUST preventDefault so the
  // browser doesn't drag-select text from the cue cards while we're picking them.
  if (e.shiftKey && state.selAnchor >= 0) {
    e.preventDefault();
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    window.getSelection?.()?.removeAllRanges();
    selectRange(state.selAnchor, i); paintSelected(); return;
  }
  if (e.metaKey || e.ctrlKey) {
    e.preventDefault();
    window.getSelection?.()?.removeAllRanges();
    toggleSel(i); state.selAnchor = i; paintSelected(); return;
  }
  // Clicking the input box itself = entering edit mode, no autoplay.
  if (inTextarea) {
    state.selectedSet.clear(); state.selectedSet.add(i); state.selAnchor = i; state.selCue = i;
    paintSelected(); highlightActive();
    return;
  }
  // Plain click on the card body (not the input) — single-select + seek to the
  // caption's start. Auto-play preview is OPT-IN via the setting (default off).
  state.selectedSet.clear(); state.selectedSet.add(i); state.selAnchor = i; state.selCue = i;
  // Pin it + focus its row so the canvas handles land on THIS caption.
  state.pinnedCueId = cue.id; state.capRow = cue.row || 0;
  paintSelected();
  el.video.currentTime = cue.start + 0.01;
  if (state.previewOnClick) {
    if (el.loopChk.checked) { state.loopCue = i; state.playUntil = -1; }
    else { state.loopCue = -1; state.playUntil = cue.end; }
    state.wantPlaying = true;
    el.video.play().catch(() => {});
  } else {
    state.loopCue = el.loopChk.checked ? i : -1;
    state.playUntil = -1;
  }
  highlightActive();
});
el.cues.addEventListener('input', (e) => {
  const card = e.target.closest('.cue'); if (!card) return; const i = +card.dataset.i;
  if (e.target.dataset.k === 'text') { state.cues[i].text = e.target.value; redistributeWords(state.cues[i]); autoSizeOne(e.target); renderOverlay(); renderTimeline(); saveSoon(); }
});
// Tab to next/prev card textarea (preselected)
el.cues.addEventListener('keydown', (e) => {
  const ta = e.target.closest('textarea'); if (!ta) return;
  // Enter = commit + deselect (no newline allowed in the sidebar caption box).
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ta.blur(); window.getSelection?.()?.removeAllRanges?.(); return; }
  // Tab / Shift-Tab = jump to the next/prev caption box (preselected for quick editing).
  if (e.key === 'Tab') {
    e.preventDefault();
    const list = $$('.cue textarea', el.cues); const idx = list.indexOf(ta);
    const next = list[idx + (e.shiftKey ? -1 : 1)]; if (next) { next.focus(); selectAllSoon(next); next.scrollIntoView({ block: 'nearest' }); }
  }
});
el.cues.addEventListener('click', (e) => {
  const act = e.target.closest('[data-act]')?.dataset.act; if (!act) return;
  const i = +e.target.closest('.cue').dataset.i;
  if (act === 'del') { const d = state.cues[i]; if (d && d._ai) sendFeedback({ kind: 'delete', cueId: String(d.id), aiText: d._ai, finalText: '' }); state.cues.splice(i, 1); if (state.selCue === i) state.selCue = -1; ensureRows(); renderAll(); renderScript(); saveSoon(); }
  if (act === 'time') openTimeEditor(e.target.closest('.cue'), i);
});
// Time display in M:SS.cs (centiseconds) when editing, so users can set precise
// caption boundaries — e.g. "0:03.20". Commit on Enter or click outside; Esc reverts.
const fmtClockEdit = (s) => { s = Math.max(0, s || 0); const m = Math.floor(s / 60), rest = s - m * 60; return `${m}:${rest.toFixed(2).padStart(5, '0')}`; };
function openTimeEditor(card, i) {
  const span = $('.cue-time', card), c = state.cues[i];
  span.classList.add('editing');
  span.innerHTML = `<input value="${fmtClockEdit(c.start)}" data-t="s" autocapitalize="off" autocorrect="off" spellcheck="false"> → <input value="${fmtClockEdit(c.end)}" data-t="e" autocapitalize="off" autocorrect="off" spellcheck="false">`;
  const [si, ei] = $$('input', span); si.focus(); selectAllSoon(si);
  let done = false;
  const commit = () => {
    if (done) return; done = true;
    const ns = parseClock(si.value), ne = parseClock(ei.value);
    c.start = clamp(ns, 0, state.duration);
    c.end = clamp(Math.max(ne, c.start + 0.1), 0, state.duration);
    redistributeWords(c);
    fixOverlaps();
    span.classList.remove('editing');
    renderCues(); renderTimeline(); renderOverlay(); saveSoon();
  };
  const cancel = () => { if (done) return; done = true; span.classList.remove('editing'); renderCues(); };
  [si, ei].forEach((inp) => {
    inp.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter')  { ev.preventDefault(); inp.blur(); }
      if (ev.key === 'Escape') { ev.preventDefault(); cancel(); }
      ev.stopPropagation();   // don't let Space / N reach the global shortcut handler
    });
  });
  const onBlur = () => setTimeout(() => { if (!span.contains(document.activeElement)) commit(); }, 60);
  [si, ei].forEach((inp) => inp.addEventListener('blur', onBlur));
}
$('#selectAllBtn').onclick = selectAllCues;
$('#clearSelBtn').onclick = clearCueSel;
el.addCueBtn.onclick = () => {
  const t = el.video.currentTime || 0;
  // Find a row that doesn't already have a cue at this time. If every existing
  // row is occupied, create a new row.
  const desiredDur = 1.4;
  const isFree = (r) => state.cues.every((c) => (c.row || 0) !== r || c.end <= t || c.start >= t + 0.05);
  let row = isFree(state.capRow) ? state.capRow : -1;
  if (row < 0) for (let r = 0; r < state.rows; r++) if (isFree(r)) { row = r; break; }
  if (row < 0) row = state.rows; // new row
  const cue = { id: 'c' + Date.now(), row, start: t, end: Math.min(state.duration, t + desiredDur), text: 'New caption', words: [] };
  redistributeWords(cue);
  const b = neighborBoundsFor(cue); cue.end = Math.min(cue.end, b.hi);
  state.cues.push(cue);
  ensureRows(); fixOverlaps();
  const newIdx = state.cues.length - 1;
  state.capRow = row; state.selCue = newIdx; state.selectedSet.clear(); state.selectedSet.add(newIdx);
  switchTab('captions');
  renderRowSelectors(); renderAll(); renderScript(); saveSoon();
  // Jump to the new card and pop it straight into edit mode with text preselected.
  requestAnimationFrame(() => {
    const card = $(`.cue[data-i="${newIdx}"]`, el.cues);
    if (!card) return;
    card.scrollIntoView({ block: 'center', behavior: 'smooth' });
    const ta = $('textarea', card);
    if (ta) { ta.focus(); ta.select(); }
  });
};
function neighborBoundsFor(cue) { let hi = state.duration; state.cues.forEach((c) => { if ((c.row || 0) === cue.row && c.start >= cue.start) hi = Math.min(hi, c.start); }); return { hi }; }

/* ============================ style panel ============================ */
// The advertised caption styles (window.CAPTO_PRESETS, from caption-presets.js) +
// the user's own saved presets (persisted to the Capto DB via /api/user/presets,
// with a localStorage fallback for offline / signed-out). Each renders as a live
// preview box; clicking one applies it onto state.style.
var customPresetList = [];     // [{ id, name, config, isDefault }]
const CUSTOM_LS = 'capto-presets-v2';
function customLocal() { try { return JSON.parse(localStorage.getItem(CUSTOM_LS) || '[]'); } catch { return []; } }
function saveCustomLocal(list) { try { localStorage.setItem(CUSTOM_LS, JSON.stringify(list)); } catch {} }
async function loadCustomPresets() {
  try {
    const r = await fetch('/api/user/presets');
    if (r.ok) { const d = await r.json(); customPresetList = Array.isArray(d.presets) ? d.presets : []; saveCustomLocal(customPresetList); }
    else customPresetList = customLocal();
  } catch { customPresetList = customLocal(); }
  // If a custom preset is the saved default and this is a brand-new style, you
  // could auto-apply — we keep it manual to avoid surprising existing projects.
  renderPresetGrid();
}
async function saveCustomPreset(name, makeDefault) {
  const config = snapshotStyle();
  config._fontRatio = (state.meta && state.meta.height) ? (state.style.fontSize / state.meta.height) : null;
  let saved = null;
  try {
    const r = await fetch('/api/user/presets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, config, isDefault: !!makeDefault }) });
    if (r.ok) saved = await r.json();
  } catch {}
  // local mirror (and the only store when signed out / offline)
  const list = customLocal().filter((p) => p.name !== name);
  list.unshift({ id: (saved && saved.id) || ('local-' + Date.now()), name, config, isDefault: !!makeDefault });
  if (makeDefault) list.forEach((p, i) => p.isDefault = i === 0);
  saveCustomLocal(list);
  await loadCustomPresets();
}
async function deleteCustomPreset(id) {
  try { await fetch('/api/user/presets?id=' + encodeURIComponent(id), { method: 'DELETE' }); } catch {}
  saveCustomLocal(customLocal().filter((p) => p.id !== id));
  await loadCustomPresets();
}

function renderStylePanel() {
  const s = state.style;
  $('#tab-style').innerHTML = `
    <div class="section">
      <p class="sec-title">Styles</p>
      <input type="text" class="search preset-search" id="preset-search" placeholder="Search styles…" autocomplete="off" autocapitalize="off" spellcheck="false">
      <div class="preset-grid" id="preset-grid"></div>
      <div style="display:flex; gap:6px; margin-top:10px">
        <button class="btn ghost sm" id="savePreset">＋ Save current as preset</button>
        <button class="btn ghost sm" id="resetDefault" title="Forget the saved default style — fresh videos will use Capto's built-in defaults again">⟲ Reset default</button>
      </div>
      <p class="hint-line">Pick a style, then fine-tune under Advanced. Your current look is auto-saved as the default for new videos.</p>
    </div>
    <button class="btn ghost sm adv-toggle" id="advToggleTop" aria-expanded="false">Advanced styling ▾</button>
    <div class="collapse adv-controls" id="advControls" style="max-height:0">
    <div class="section" style="margin-top:14px">
      <p class="sec-title">Text</p>
      <div class="field"><label>Font</label><select id="st-font">${FONTS.map((f) => `<option value="${f.family}">${f.label}</option>`).join('')}</select></div>
      <div class="row2">
        <div class="field"><label>Case</label><div class="seg icons" id="st-case">${CASES.map((c) => `<button data-v="${c.code}">${c.label}</button>`).join('')}</div></div>
        <div class="field"><label>Italic</label><div class="seg icons" id="st-weight"><button data-w="i" style="font-style:italic;font-weight:600">I</button></div></div>
      </div>
      <div class="field"><label>Weight <span class="val" id="v-weight"></span></label><input type="range" id="st-weight-r" min="300" max="900" step="100"></div>
      <div class="field"><label>Size <span class="val" id="v-size"></span></label><input type="range" id="st-size" min="16" step="0.25"></div>
      <div class="row2">
        <div class="field"><label>Letter spacing <span class="val" id="v-ls"></span></label><input type="range" id="st-ls" min="-15" max="20" step="0.5"></div>
        <div class="field"><label>Line height <span class="val" id="v-lh"></span></label><input type="range" id="st-lh" min="0.8" max="2" step="0.05"></div>
      </div>
      <div class="field"><label>Word gap <span class="val" id="v-ws"></span></label><input type="range" id="st-ws" min="-12" max="60" step="1"></div>
      <div class="field"><label>Color</label><div class="swatches" id="sw-color">${SWATCHES.map((c) => `<div class="swatch" data-c="${c}" style="background:${c}"></div>`).join('')}<input type="color" id="st-color" style="width:24px;height:24px;padding:2px;border-radius:6px"></div></div>
    </div>
    <div class="section">
      <p class="sec-title">Shadow</p>
      <div class="field"><div class="seg" id="st-shadow">
        <button data-s="none">None</button><button data-s="soft">Soft</button><button data-s="hard">Hard</button><button data-s="glow">Glow</button>
      </div></div>
      <button class="btn ghost sm" id="advToggle">Fine‑tune ▾</button>
      <div class="collapse" id="advShadow" style="max-height:0">
        <div class="row2" style="margin-top:10px">
          <div class="field"><label>Shadow color</label><input type="color" id="st-shcolor"></div>
          <div class="field"><label>Opacity <span class="val" id="v-shop"></span></label><input type="range" id="st-shop" min="0" max="100"></div>
        </div>
        <div class="row2">
          <div class="field"><label>Distance <span class="val" id="v-shd"></span></label><input type="range" id="st-shd" min="0" max="40" step="0.5"></div>
          <div class="field"><label>Blur <span class="val" id="v-shb"></span></label><input type="range" id="st-shb" min="0" max="40" step="0.5"></div>
        </div>
        <div class="row2">
          <div class="field"><label>Outline <span class="val" id="v-ow"></span></label><input type="range" id="st-ow" min="0" max="20" step="0.5"></div>
          <div class="field"><label>Outline color</label><input type="color" id="st-ocolor"></div>
        </div>
      </div>
    </div>
    <div class="section">
      <p class="sec-title">Word highlight</p>
      <div class="field"><div class="seg" id="st-hl"><button data-h="off">Off</button><button data-h="on">On</button></div></div>
      <div class="collapse" id="hlAdv">
        <div class="field" style="margin-top:10px"><label>Style</label><div class="seg" id="st-hlmode"><button data-m="color">Color</button><button data-m="box">Box</button><button data-m="glow">Glow</button><button data-m="underline">Line</button></div></div>
        <div class="row2">
          <div class="field"><label>Active text</label><input type="color" id="st-hlcolor"></div>
          <div class="field"><label>Box / accent</label><input type="color" id="st-hlbg"></div>
        </div>
        <div class="row2">
          <div class="field"><label>Pop <span class="val" id="v-hls"></span></label><input type="range" id="st-hls" min="100" max="150"></div>
          <div class="field"><label>Rounded</label><div class="seg icons" id="st-hlpill"><button data-p="pill">●</button></div></div>
        </div>
      </div>
    </div>
    <div class="section">
      <p class="sec-title">Animation</p>
      <div class="field"><label>Entrance</label><div class="seg" id="st-entrance">
        <button data-v="none">None</button><button data-v="fade">Fade</button><button data-v="pop">Pop</button><button data-v="slide-up">Slide ↑</button><button data-v="slide-down">Slide ↓</button>
      </div></div>
      <div class="field"><label>Exit</label><div class="seg" id="st-exit">
        <button data-v="none">None</button><button data-v="fade">Fade</button>
      </div></div>
      <div class="field"><label>Speed <span class="val" id="v-animms"></span></label><input type="range" id="st-animms" min="60" max="600" step="20"></div>
      <label class="check" style="margin-top:10px"><input type="checkbox" id="st-wordreveal"><span>Reveal words one by one (build the line as it's spoken)</span></label>
    </div>
    <div class="section">
      <p class="sec-title">Position</p>
      <div class="chips"><div class="chip" data-y="0.12">Top</div><div class="chip" data-y="0.5">Middle</div><div class="chip" data-y="0.78">Bottom</div></div>
      <div class="row2" style="margin-top:10px">
        <div class="field"><label>X (left ↔ right) <span class="val" id="v-px"></span></label><input type="range" id="st-px" min="0" max="100" step="1"></div>
        <div class="field"><label>Y (top ↕ bottom) <span class="val" id="v-py"></span></label><input type="range" id="st-py" min="0" max="100" step="1"></div>
      </div>
      <p class="hint-line">Drag the caption on the video to place it freely. Drag its corners to resize. Double‑click to edit text.</p>
    </div>
    </div>`;

  // Preset grid + search
  renderPresetGrid();
  const psearch = $('#preset-search');
  if (psearch) psearch.oninput = () => renderPresetGrid(psearch.value);
  // Advanced collapse — expand to full content height (handles nested collapses).
  const advBtn = $('#advToggleTop'); const advBox = $('#advControls');
  if (advBtn && advBox) advBtn.onclick = () => {
    const open = advBox.style.maxHeight !== '0px' && advBox.style.maxHeight !== '';
    // Large fixed cap when open so NESTED collapses (Fine-tune shadow / highlight)
    // can expand without being clipped by this wrapper.
    advBox.style.maxHeight = open ? '0px' : '3000px';
    advBtn.setAttribute('aria-expanded', open ? 'false' : 'true');
    advBtn.textContent = open ? 'Advanced styling ▾' : 'Advanced styling ▴';
  };

  $('#st-font').value = s.fontFamily; $('#st-font').onchange = () => { s.fontFamily = $('#st-font').value; afterStyle(); };
  $('#st-size').max = Math.round((state.meta.height || 1920) * 0.18);
  rng('#st-size', 'fontSize', '#v-size', (v) => `${(Math.round(v * 100) / 100)}px`);
  rng('#st-ls', 'letterSpacing', '#v-ls', (v) => `${v}px`);
  rng('#st-lh', 'lineHeight', '#v-lh', (v) => `${(Math.round(v * 100) / 100)}`);
  rng('#st-ws', 'wordSpacing', '#v-ws', (v) => `${Math.round(v)}px`);
  rng('#st-shop', 'shadowOpacity', '#v-shop', (v) => `${Math.round(v)}%`);
  rng('#st-shd', 'shadowDistance', '#v-shd', (v) => `${v}px`);
  rng('#st-shb', 'shadowBlur', '#v-shb', (v) => `${v}px`);
  rng('#st-ow', 'outlineWidth', '#v-ow', (v) => `${v}px`);
  rng('#st-hls', 'highlightScale', '#v-hls', (v) => `${Math.round(v)}%`);
  col('#st-color', 'primaryColor'); col('#st-shcolor', 'shadowColor'); col('#st-ocolor', 'outlineColor'); col('#st-hlcolor', 'highlightColor'); col('#st-hlbg', 'highlightBg');
  seg('#st-case', 'caseMode', 'v');
  $$('#sw-color .swatch').forEach((sw) => sw.onclick = () => { s.primaryColor = sw.dataset.c; $('#st-color').value = sw.dataset.c; syncSwatch(); afterStyle(); });
  syncSwatch();
  // italic toggle
  const wseg = $('#st-weight'); const syncW = () => { $('[data-w=i]', wseg).classList.toggle('on', s.italic); };
  $('[data-w=i]', wseg).onclick = () => { s.italic = !s.italic; syncW(); afterStyle(); }; syncW();
  // custom font weight slider (300–900). rng() handles double-click-to-type too.
  rng('#st-weight-r', 'weight', '#v-weight', (v) => `${Math.round(v)}`);
  // shadow presets
  const shSeg = $('#st-shadow'); const syncSh = () => $$('button', shSeg).forEach((b) => b.classList.toggle('on', b.dataset.s === currentShadowPreset()));
  $$('button', shSeg).forEach((b) => b.onclick = () => { applyShadowPreset(b.dataset.s); syncSh(); refreshShadowInputs(); afterStyle(); }); syncSh();
  $('#advToggle').onclick = () => { const c = $('#advShadow'); c.style.maxHeight = c.style.maxHeight === '0px' || !c.style.maxHeight ? '320px' : '0px'; };
  // highlight
  const hlSeg = $('#st-hl'); const syncHl = () => { $$('button', hlSeg).forEach((b) => b.classList.toggle('on', (b.dataset.h === 'on') === !!s.highlightEnabled)); $('#hlAdv').style.maxHeight = s.highlightEnabled ? '260px' : '0px'; };
  $$('button', hlSeg).forEach((b) => b.onclick = () => { s.highlightEnabled = b.dataset.h === 'on'; syncHl(); afterStyle(); }); syncHl();
  // highlight mode (color / box / glow / underline) + rounded toggle
  seg('#st-hlmode', 'highlightMode', 'm');
  const pillSeg = $('#st-hlpill'); if (pillSeg) { const syncPill = () => $('[data-p=pill]', pillSeg).classList.toggle('on', !!s.highlightPill); $('[data-p=pill]', pillSeg).onclick = () => { s.highlightPill = !s.highlightPill; syncPill(); afterStyle(); }; syncPill(); }
  // position chips
  $$('#tab-style .chips .chip[data-y]').forEach((c) => c.onclick = () => { s.posX = 0.5; s.posY = parseFloat(c.dataset.y); refreshPosInputs(); afterStyle(); });
  // X / Y fine position sliders (0–100% ↔ posX/posY 0–1).
  const pxS = $('#st-px'); if (pxS) pxS.oninput = () => { s.posX = clamp(parseFloat(pxS.value) / 100, -0.3, 1.3); $('#v-px').textContent = Math.round(parseFloat(pxS.value)) + '%'; afterStyle(); };
  const pyS = $('#st-py'); if (pyS) pyS.oninput = () => { s.posY = clamp(parseFloat(pyS.value) / 100, -0.3, 1.3); $('#v-py').textContent = Math.round(parseFloat(pyS.value)) + '%'; afterStyle(); };
  refreshPosInputs();
  // Animation controls
  seg('#st-entrance', 'entrance', 'v');
  seg('#st-exit', 'exit', 'v');
  rng('#st-animms', 'animMs', '#v-animms', (v) => `${Math.round(v)}ms`);
  const wrChk = $('#st-wordreveal');
  if (wrChk) { wrChk.checked = !!state.style.wordReveal; wrChk.onchange = () => { state.style.wordReveal = wrChk.checked; afterStyle(); }; }

  refreshShadowInputs();
  $('#savePreset').onclick = async () => {
    const name = await promptDialog('Name this preset', '');
    if (!name || !name.trim()) return;
    await saveCustomPreset(name.trim(), false);
    toast('Preset saved');
  };
  const resetBtn = $('#resetDefault');
  if (resetBtn) resetBtn.onclick = () => { clearDefaultStyle(); toast('Saved default cleared — next new video will use Capto defaults'); };
}
function syncSwatch() { $$('#sw-color .swatch').forEach((sw) => sw.classList.toggle('on', sw.dataset.c.toLowerCase() === (state.style.primaryColor || '').toLowerCase())); $('#st-color').value = state.style.primaryColor; }
function rng(sel, key, valSel, fmt) {
  const slider = $(sel);
  const span = $(valSel);
  slider.value = state.style[key];
  span.textContent = fmt(state.style[key]);
  slider.oninput = () => {
    state.style[key] = parseFloat(slider.value);
    if (!span.dataset.editing) span.textContent = fmt(state.style[key]);
    afterStyle();
  };
  // Click the value → number input → enter/blur commits, esc cancels. Lets you
  // type an exact px value instead of dragging the slider.
  span.classList.add('val-editable');
  span.title = 'Click to edit';
  // Double-click to enter edit mode (single-click was too aggressive — users
  // were tapping near the value while reading and accidentally entering edit).
  span.ondblclick = (e) => {
    if (span.dataset.editing) return;
    e.stopPropagation();
    span.dataset.editing = '1';
    const orig = state.style[key];
    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'val-input';
    input.value = orig;
    input.step = parseFloat(slider.step) || 1;
    input.min = slider.min; input.max = slider.max;
    span.textContent = '';
    span.appendChild(input);
    input.focus(); input.select();
    const commit = () => {
      delete span.dataset.editing;
      const v = parseFloat(input.value);
      if (isFinite(v)) {
        const lo = parseFloat(slider.min), hi = parseFloat(slider.max);
        state.style[key] = clamp(v, lo, hi);
        slider.value = state.style[key];
        afterStyle();
      }
      span.textContent = fmt(state.style[key]);
    };
    const cancel = () => {
      delete span.dataset.editing;
      state.style[key] = orig; slider.value = orig; afterStyle();
      span.textContent = fmt(orig);
    };
    input.addEventListener('blur', commit);
    input.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') { ev.preventDefault(); input.blur(); }
      if (ev.key === 'Escape') { ev.preventDefault(); cancel(); }
    });
  };
}
function col(sel, key) { const i = $(sel); i.value = state.style[key]; i.oninput = () => { state.style[key] = i.value; if (key === 'primaryColor') syncSwatch(); afterStyle(); }; }
function seg(sel, key, attr) { const c = $(sel); const sync = () => $$('button', c).forEach((b) => b.classList.toggle('on', b.dataset[attr] === state.style[key])); sync(); $$('button', c).forEach((b) => b.onclick = () => { state.style[key] = b.dataset[attr]; sync(); afterStyle(); }); }
function currentShadowPreset() { const s = state.style; if (!s.shadowEnabled) return 'none'; const H = state.meta.height; if (s.shadowBlur > H * 0.012 && s.shadowDistance < H * 0.01) return 'glow'; if (s.shadowDistance > H * 0.004 && s.shadowBlur < H * 0.004) return 'hard'; if (s.shadowBlur > 0) return 'soft'; return 'soft'; }
function applyShadowPreset(p) { const s = state.style, H = state.meta.height; if (p === 'none') { s.shadowEnabled = false; return; } s.shadowEnabled = true; s.shadowColor = s.shadowColor || '#000000'; if (p === 'soft') { s.shadowOpacity = 55; s.shadowDistance = Math.round(H * 0.002); s.shadowBlur = Math.round(H * 0.006); } if (p === 'hard') { s.shadowOpacity = 80; s.shadowDistance = Math.round(H * 0.006); s.shadowBlur = 0; } if (p === 'glow') { s.shadowOpacity = 70; s.shadowDistance = 0; s.shadowBlur = Math.round(H * 0.016); } }
function refreshShadowInputs() { const s = state.style; ['shadowOpacity:#st-shop:#v-shop:%','shadowDistance:#st-shd:#v-shd:px','shadowBlur:#st-shb:#v-shb:px','outlineWidth:#st-ow:#v-ow:px'].forEach((d) => { const [k, sel, v, u] = d.split(':'); const i = $(sel); if (i) { i.value = s[k]; $(v).textContent = (u === '%' ? Math.round(s[k]) : s[k]) + u; } }); if ($('#st-shcolor')) $('#st-shcolor').value = s.shadowColor; if ($('#st-ocolor')) $('#st-ocolor').value = s.outlineColor; }
function snapshotStyle() { const { posX, posY, ...rest } = state.style; return rest; }

// Build the unified list of selectable styles: the advertised CAPTO_PRESETS +
// the user's saved custom presets. Each item carries a studio-style object.
function presetItems() {
  const items = [];
  (window.CAPTO_PRESETS || []).forEach((p) => items.push({
    key: 'b:' + p.id, name: p.name, sample: p.sample, popular: !!p.popular, kind: 'builtin',
    styleFor: (meta) => (window.captoPresetToStyle ? window.captoPresetToStyle(p, meta) : {}),
  }));
  (customPresetList || []).forEach((c) => items.push({
    key: 'c:' + c.id, id: c.id, name: c.name, sample: 'your style', kind: 'custom', isDefault: !!c.isDefault,
    styleFor: (meta) => {
      const cfg = Object.assign({}, c.config || {});
      // Rescale a saved absolute font size to the current video height if we
      // captured a ratio, so a preset looks the same across resolutions.
      if (cfg._fontRatio && meta && meta.height) cfg.fontSize = Math.round(meta.height * cfg._fontRatio);
      return cfg;
    },
  }));
  return items;
}
// One WYSIWYG mini-preview box, styled inline from the item's studio-style.
function presetBoxHTML(item) {
  const st = item.styleFor({ height: 1080 }) || {};
  const words = String(item.sample || item.name || 'Aa Bb Cc').split(/\s+/).filter(Boolean).slice(0, 4);
  const fill = st.primaryColor || '#fff';
  const mode = st.highlightMode || 'color';
  const hi = st.highlightColor || fill;
  const bg = st.highlightBg || '#FFD233';
  const pill = !!st.highlightPill;
  const cap = (w) => st.caseMode === 'upper' ? w.toUpperCase() : st.caseMode === 'lower' ? w.toLowerCase() : (st.caseMode === 'title' ? w.replace(/\S+/g, (x) => x.charAt(0).toUpperCase() + x.slice(1)) : w);
  const hiIdx = Math.min(1, words.length - 1);
  const spans = words.map((w, i) => {
    let css = '';
    if (i === hiIdx && st.highlightEnabled !== false) {
      if (mode === 'box') css = `color:${hi};background:${bg};box-shadow:0 0 0 ${pill ? '.24em' : '.12em'} ${bg};border-radius:${pill ? '.6em' : '.16em'}`;
      else if (mode === 'glow') css = `color:${hi};text-shadow:0 0 .3em ${hi},0 0 .6em ${hi}`;
      else if (mode === 'underline') css = `color:${hi};box-shadow:inset 0 -.12em 0 ${bg}`;
      else css = `color:${hi}`;
    } else css = `color:${fill}`;
    return `<span style="${css}">${escapeHtml(cap(w))}</span>`;
  }).join(' ');
  const badge = item.kind === 'custom'
    ? `<span class="pb-del" data-del="${escapeAttr(item.id)}" title="Delete preset">✕</span>`
    : (item.popular ? `<span class="pb-pop">Popular</span>` : '');
  const textShadow = st.shadowEnabled !== false && mode !== 'glow' ? 'text-shadow:0 2px 6px rgba(0,0,0,.7)' : '';
  return `<button class="preset-box" data-key="${escapeAttr(item.key)}" title="${escapeAttr(item.name)}">
    <span class="pb-stage" style="font-weight:${st.weight || 700};${textShadow}">${spans}</span>
    <span class="pb-name">${escapeHtml(item.name)} ${badge}</span>
  </button>`;
}
function renderPresetGrid(filter) {
  const grid = $('#preset-grid'); if (!grid) return;
  const q = (filter || '').trim().toLowerCase();
  const items = presetItems().filter((it) => !q || it.name.toLowerCase().includes(q));
  grid.innerHTML = items.length ? items.map(presetBoxHTML).join('') : `<div class="hint-line" style="grid-column:1/-1">No styles match “${escapeHtml(q)}”.</div>`;
  $$('.preset-box', grid).forEach((box) => box.onclick = (e) => {
    if (e.target.closest('.pb-del')) { e.stopPropagation(); deleteCustomPreset(e.target.closest('.pb-del').dataset.del); return; }
    const item = presetItems().find((it) => it.key === box.dataset.key);
    if (item) applyPresetStyle(item);
  });
}
function applyPresetStyle(item) {
  const st = item.styleFor(state.meta) || {};
  Object.assign(state.style, st);
  normalizeStyle(state.style);
  // Preserve the search query + Advanced-open state across the panel rebuild so
  // applying a preset mid-search doesn't reset the view.
  const searchEl = document.getElementById('preset-search');
  const q = searchEl ? searchEl.value : '';
  const advEl = document.getElementById('advControls');
  const advOpen = !!(advEl && advEl.style.maxHeight && advEl.style.maxHeight !== '0px');
  renderStylePanel();
  if (q) { const ps = $('#preset-search'); if (ps) { ps.value = q; renderPresetGrid(q); } }
  if (advOpen) {
    const a = $('#advControls'), b = $('#advToggleTop');
    if (a) a.style.maxHeight = '3000px';
    if (b) { b.setAttribute('aria-expanded', 'true'); b.textContent = 'Advanced styling ▴'; }
  }
  afterStyle();
  if (item.name) toast(`Applied “${item.name}”`);
}
function afterStyle() {
  renderOverlay(); saveSoon(); persistDefaultStyle();
}

// ---- local style persistence ----
// We treat the user's most recent visual style as the "default" — auto-applied
// to NEW projects. Per-project saves still override this for existing projects.
const DEFAULT_KEY = 'subby-default-style';
function persistDefaultStyle() { try { localStorage.setItem(DEFAULT_KEY, JSON.stringify(state.style)); } catch {} }
function loadDefaultStyle() { try { return JSON.parse(localStorage.getItem(DEFAULT_KEY) || 'null'); } catch { return null; } }
function clearDefaultStyle() { try { localStorage.removeItem(DEFAULT_KEY); } catch {} }

/* ============================ tabs ============================ */
// Event delegation — survives any DOM mutation, more robust than per-element binding.
document.addEventListener('click', (e) => {
  const t = e.target.closest && e.target.closest('.tab');
  if (t && t.dataset && t.dataset.tab) switchTab(t.dataset.tab);
});
function switchTab(name) {
  // 'settings' lives in the Capto dashboard now — the editor has only these three.
  if (name === 'settings') name = 'captions';
  $$('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === name));
  ['captions', 'script', 'style'].forEach((n) => { const p = $('#tab-' + n); if (p) p.hidden = n !== name; });
  if (name === 'script') renderScript();
}

/* ============================ canvas: fit / zoom / pan ============================ */
function fitFrame() {
  if (!state.meta) return;
  const a = state.meta.width / state.meta.height, cw = el.canvasArea.clientWidth, ch = el.canvasArea.clientHeight, pad = 0.9;
  let w = cw * pad, h = w / a; if (h > ch * pad) { h = ch * pad; w = h * a; }
  el.frame.style.width = Math.round(w) + 'px'; el.frame.style.height = Math.round(h) + 'px';
}
function applyView() { const v = state.view; el.canvasContent.style.transform = `translate(${v.panX}px,${v.panY}px) scale(${v.zoom})`; el.zLabel.textContent = Math.round(v.zoom * 100) + '%'; positionSelBox(); }
function setZoom(z, cx, cy) {
  z = clamp(z, 0.4, 6); const rect = el.canvasArea.getBoundingClientRect(); const centerX = rect.left + rect.width / 2, centerY = rect.top + rect.height / 2;
  const ox = (cx ?? centerX) - centerX, oy = (cy ?? centerY) - centerY, ratio = z / state.view.zoom;
  state.view.panX = ox - (ox - state.view.panX) * ratio; state.view.panY = oy - (oy - state.view.panY) * ratio; state.view.zoom = z; applyView();
}
el.zIn.onclick = () => setZoom(state.view.zoom * 1.2); el.zOut.onclick = () => setZoom(state.view.zoom / 1.2);
el.zFit.onclick = () => { state.view = { zoom: 1, panX: 0, panY: 0 }; applyView(); };
el.canvasArea.addEventListener('wheel', (e) => { e.preventDefault(); setZoom(state.view.zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX, e.clientY); }, { passive: false });
el.canvasArea.addEventListener('pointerdown', (e) => {
  if (e.target.closest('.cap-block') || e.target.closest('.cap-handle')) return;
  // Click on empty canvas unpins; the always-on handles will re-pick the active caption.
  state.pinnedCueId = null;
  if (state.selCue !== -1) { state.selCue = -1; positionSelBox(); }
  el.canvasArea.classList.add('grabbing');
  const sx = e.clientX, sy = e.clientY, px = state.view.panX, py = state.view.panY;
  const mv = (ev) => { state.view.panX = px + (ev.clientX - sx); state.view.panY = py + (ev.clientY - sy); applyView(); };
  const up = () => { el.canvasArea.classList.remove('grabbing'); document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up); };
  document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up);
});

/* ============================ overlay (multi-row, ghost+clip) ============================ */
function rowOffsetFrac(row) { const lh = (state.style.fontSize * 2.4) / (state.meta.height || 1920); return row * lh; }
function activeCueInRow(r, t) { const list = cuesInRow(r); for (const { c, i } of list) if (t >= c.start && t <= c.end) return i; return -1; }

// Build a caption block's static parts (everything that doesn't change between frames).
// Returns the DOM element. Each word is a span we toggle classes on for the highlight,
// instead of rebuilding the innerHTML every frame.
function blockKey(cue) { return `${cue.id}|${state.style.caseMode}|${cue.text}|${state.style.entrance}|${state.style.animMs}|${state.style.boxWidth || 'auto'}`; }
function buildBlock(cue, row) {
  const block = document.createElement('div');
  const ent = state.style.entrance || 'none';
  block.className = 'cap-block' + (ent !== 'none' ? ` anim-${ent}` : '');
  block.style.setProperty('--anim-ms', (state.style.animMs || 200) + 'ms');
  block.dataset.row = row; block.dataset.cue = cue.id; block.dataset.k = blockKey(cue);
  // Render line-by-line (manual \n breaks) with a global word index so karaoke
  // highlight + manual multi-line both work. redistributeWords splits on the same
  // whitespace (incl. \n) so word indices line up.
  let wi = 0;
  block.innerHTML = String(cue.text).split('\n').map((line) =>
    line.split(/\s+/).filter(Boolean).map((w) =>
      `<span class="cap-word" data-w="${wi++}">${escapeHtml(applyCase(w, state.style.caseMode))}</span>`
    ).join(' ')
  ).join('<br>');
  if (!block.innerHTML) block.innerHTML = `<span class="cap-word" data-w="0">${escapeHtml(applyCase(cue.text, state.style.caseMode))}</span>`;
  return block;
}
// Compact signature of every visual style input — when this is unchanged
// between frames, styleBlock returns immediately (no DOM writes = no jitter).
function styleSig(cue) {
  const s = state.style;
  return `${cue.id}|${s.fontFamily}|${s.fontSize}|${styleWeight(s)}|${s.italic}|${s.letterSpacing}|${s.wordSpacing||0}|${s.lineHeight}|${s.outlineWidth}|${s.outlineColor}|${s.hollow?1:0}|${s.gradient?1:0}|${s.shadowEnabled}|${s.shadowColor}|${s.shadowOpacity}|${s.shadowDistance}|${s.shadowBlur}|${s.primaryColor}|${s.posX}|${s.posY}|${cue.row||0}|${el.frame.clientWidth}|${el.frame.clientHeight}`;
}

function styleBlock(block, cue) {
  const sig = styleSig(cue);
  if (block.dataset.sig === sig) return; // already styled — no DOM writes this frame
  block.dataset.sig = sig;

  const s = state.style;
  const fw = el.frame.clientWidth, fh = el.frame.clientHeight;
  const scale = fh / (state.meta.height || 1);
  const fontPx = Math.round(s.fontSize * scale * 100) / 100;
  const lsPx = s.letterSpacing * scale;
  const owPx = s.outlineWidth * scale;
  const weight = styleWeight(s);
  const shadows = [];
  if (owPx > 0) { const o = owPx; for (const [dx, dy] of [[o,0],[-o,0],[0,o],[0,-o],[o,o],[-o,-o],[o,-o],[-o,o]]) shadows.push(`${dx}px ${dy}px 0 ${s.outlineColor}`); }
  if (s.shadowEnabled) shadows.push(`${(s.shadowDistance || 0) * scale}px ${(s.shadowDistance || 0) * scale}px ${(s.shadowBlur || 0) * scale}px ${hexA(s.shadowColor, (s.shadowOpacity ?? 60) / 100)}`);
  const cyFrac = s.posY - rowOffsetFrac(cue.row || 0);
  block.style.left = Math.round(s.posX * fw) + 'px';
  block.style.top  = Math.round(cyFrac * fh) + 'px';
  block.style.fontFamily = `'${s.fontFamily}'`;
  block.style.fontSize = fontPx + 'px';
  block.style.fontWeight = weight;
  block.style.fontStyle = s.italic ? 'italic' : 'normal';
  block.style.letterSpacing = lsPx.toFixed(1) + 'px';
  block.style.wordSpacing = ((s.wordSpacing || 0) * scale).toFixed(1) + 'px';
  block.style.lineHeight = (typeof s.lineHeight === 'number' ? s.lineHeight : 1.12);
  // Fill mode: solid colour, hollow stroke (Outline), or gradient wash.
  if (s.hollow) {
    block.style.webkitTextStroke = Math.max(1, fontPx * 0.04).toFixed(1) + 'px ' + (s.primaryColor || '#fff');
    block.style.backgroundImage = ''; block.style.webkitBackgroundClip = 'border-box';
    block.style.color = 'transparent';
  } else if (s.gradient) {
    block.style.webkitTextStroke = '0';
    block.style.backgroundImage = 'linear-gradient(100deg,#5fe3f5,#b8a4ff 52%,#ef79e6)';
    block.style.webkitBackgroundClip = 'text'; block.style.backgroundClip = 'text';
    block.style.color = 'transparent';
  } else {
    block.style.webkitTextStroke = '0';
    block.style.backgroundImage = ''; block.style.webkitBackgroundClip = 'border-box';
    block.style.color = s.primaryColor;
  }
  block.style.textShadow = shadows.length ? shadows.join(',') : 'none';
  // Box width: explicit (free-form, set by side handles) or auto (wrap up to 92%).
  if (typeof s.boxWidth === 'number' && s.boxWidth > 0) {
    block.style.width = Math.round(s.boxWidth * fw) + 'px';
    block.style.maxWidth = 'none';
    block.style.whiteSpace = 'normal';
  } else {
    block.style.width = '';
    block.style.maxWidth = Math.round(fw * 0.92) + 'px';
  }
}
// Per-frame: only mutate spans when the active word actually changes. Supports
// four highlight modes — colour, box (filled pill/rect), glow, underline — all
// painted with layout-NEUTRAL CSS (background + box-shadow spread, never padding)
// so advancing the active word never changes width / wraps the line.
function paintActiveWord(block, cue, t) {
  const s = state.style;
  const words = (cue.words && cue.words.length) ? cue.words : [{ word: cue.text, start: cue.start, end: cue.end }];
  // The active word is the last one that has STARTED by time t…
  let aw = -1; for (let k = 0; k < words.length; k++) if (t >= words[k].start - 0.015) aw = k;
  const started = aw; // last word that has begun — used for the word-by-word reveal
  // …but don't let it linger far past when it was actually spoken. If we're in a
  // real silent gap before the next word (> ~0.12s past this word's end), light
  // nothing — so the highlight tracks the voice precisely instead of overshooting.
  if (aw >= 0) {
    const w = words[aw];
    const nextStart = aw + 1 < words.length ? words[aw + 1].start : Infinity;
    if (t > (w.end || w.start) + 0.12 && t < nextStart - 0.02) aw = -1;
  }
  const mode = s.highlightMode || 'color';
  const bg = s.highlightBg || '#FFE36E';
  const reveal = !!s.wordReveal;
  const sig = `${aw}|${reveal ? started : 'x'}|${s.highlightEnabled}|${mode}|${s.highlightColor}|${bg}|${s.highlightPill}|${s.highlightScale}|${s.hollow?1:0}|${s.gradient?1:0}`;
  if (block.dataset.awsig === sig) return; // no change — no DOM mutation
  block.dataset.awsig = sig;
  const spans = block.children;
  for (let k = 0; k < spans.length; k++) {
    const sp = spans[k];
    const on = s.highlightEnabled && k === aw;
    // reset everything we might set (textShadow falls back to the block's)
    sp.style.color = ''; sp.style.background = ''; sp.style.boxShadow = '';
    sp.style.borderRadius = ''; sp.style.transform = ''; sp.style.textShadow = ''; sp.style.webkitTextStroke = '';
    // Word-by-word reveal: words appear (fade + tiny rise) only once they've been
    // spoken; the sentence builds up smoothly. CSS transitions make it glide.
    if (reveal) {
      if (k <= started) { sp.style.opacity = '1'; }
      else { sp.style.opacity = '0'; sp.style.transform = 'translateY(0.18em)'; }
    } else if (sp.style.opacity) { sp.style.opacity = ''; }
    if (!on) continue;
    if (s.highlightScale && s.highlightScale !== 100) sp.style.transform = `scale(${s.highlightScale / 100})`;
    // Outline: the active word FILLS solid. Gradient: keep the wash, just let it
    // pop via the scale above (text-shadow can't show through clipped text).
    if (s.hollow) { sp.style.color = s.highlightColor; sp.style.webkitTextStroke = '0'; continue; }
    if (s.gradient) { continue; }
    if (mode === 'box') {
      const sp2 = s.highlightPill ? '.24em' : '.14em';
      sp.style.color = s.highlightColor;
      sp.style.background = bg;
      sp.style.boxShadow = `0 0 0 ${sp2} ${bg}`;        // spread = padding without reflow
      sp.style.borderRadius = s.highlightPill ? '.6em' : '.16em';
    } else if (mode === 'glow') {
      sp.style.color = s.highlightColor;
      sp.style.textShadow = `0 0 .35em ${s.highlightColor}, 0 0 .7em ${s.highlightColor}`;
    } else if (mode === 'underline') {
      sp.style.color = s.highlightColor;
      sp.style.boxShadow = `inset 0 -.12em 0 ${bg}`;
    } else {
      sp.style.color = s.highlightColor;
    }
  }
}

var overlayRAF = 0;
function renderOverlay() {
  if (overlayRAF) return;
  overlayRAF = requestAnimationFrame(() => { overlayRAF = 0; doRenderOverlay(); });
}
function fitBlockToFrame(block) {
  if (!block || !el.frame) return;
  // When the user has set an explicit box width, respect it — don't auto-shrink
  // (that's what previously made captions "compress" unexpectedly).
  if (typeof state.style.boxWidth === 'number' && state.style.boxWidth > 0) { block.style.transform = 'translate(-50%, -50%)'; return; }
  // Remove any prior scale so we measure the natural width.
  block.style.transform = 'translate(-50%, -50%)';
  const fw = el.frame.clientWidth;
  const bw = block.offsetWidth;
  if (bw <= fw * 0.95) return; // fits — no scaling (caption sizing is the font size, not a transform)
  // Only ever SHRINK an over-wide caption to fit (e.g. one long word on a
  // portrait clip). Never up-scale — the on-screen size must equal the real font
  // size so the corner-resize handles map 1:1 (matches original Subby).
  const scale = Math.max(0.5, (fw * 0.92) / bw);
  block.style.transform = `translate(-50%, -50%) scale(${scale.toFixed(3)})`;
}
function doRenderOverlay() {
  // Self-heal a stuck "editing" flag (an inline edit that never committed) —
  // otherwise editingCaption stays true and EVERY canvas click is ignored, so
  // you can't select/move/resize captions on the video anymore.
  if (state.editingCaption && !document.querySelector('.cap-block.editing')) state.editingCaption = false;
  if (!state.meta || state.editingCaption) return;
  const t = el.video.currentTime;

  // Existing blocks indexed by row → element
  const existingSolid = new Map(), existingGhost = new Map();
  for (const b of el.capLayer.children) existingSolid.set(+b.dataset.row, b);
  for (const b of el.capGhost.children) existingGhost.set(+b.dataset.row, b);

  const seen = new Set();
  for (let r = 0; r < state.rows; r++) {
    const i = activeCueInRow(r, t);
    if (i < 0) continue;
    const cue = state.cues[i];
    seen.add(r);

    let solid = existingSolid.get(r);
    if (!solid || solid.dataset.k !== blockKey(cue)) {
      if (solid) solid.remove();
      solid = buildBlock(cue, r);
      el.capLayer.appendChild(solid);
    }
    styleBlock(solid, cue);
    paintActiveWord(solid, cue, t);

    let ghost = existingGhost.get(r);
    if (!ghost || ghost.dataset.k !== blockKey(cue)) {
      if (ghost) ghost.remove();
      ghost = buildBlock(cue, r);
      el.capGhost.appendChild(ghost);
    }
    styleBlock(ghost, cue);
    paintActiveWord(ghost, cue, t);

    // Auto-shrink if the natural width still exceeds the frame (e.g. one
    // very long word on a portrait clip). Caps at 0.5× so it stays legible.
    fitBlockToFrame(solid); fitBlockToFrame(ghost);
  }
  // Remove orphan blocks (their row no longer has an active cue)
  for (const [r, b] of existingSolid) if (!seen.has(r)) b.remove();
  for (const [r, b] of existingGhost) if (!seen.has(r)) b.remove();

  // Always surface the move/resize handles around the caption currently on
  // screen — you never have to hunt for them. Grab the body to move, a corner to
  // resize the font, a side to resize the box. (Skipped while inline-editing or
  // mid-drag, where selCue already points at the caption being worked on.)
  if (!state.editingCaption && !state.draggingCaption) {
    // Choose which on-screen caption owns the move/resize handles. Priority:
    //   1) the caption you explicitly pinned (clicked/dragged) — if still on screen
    //   2) the current selection — if still on screen
    //   3) the active caption in the row you're editing (capRow)
    //   4) the lowest active row
    // This keeps the handles glued to the caption you're working with across
    // rows, instead of always snapping back to row 0 when several are visible.
    const activeByRow = [];
    for (let r = 0; r < state.rows; r++) activeByRow[r] = activeCueInRow(r, t);
    const visible = (idx) => idx >= 0 && state.cues[idx] && activeByRow[state.cues[idx].row || 0] === idx;
    let pick = -1;
    if (state.pinnedCueId) {
      const pi = state.cues.findIndex((c) => c.id === state.pinnedCueId);
      if (visible(pi)) pick = pi; else state.pinnedCueId = null;
    }
    if (pick < 0 && visible(state.selCue)) pick = state.selCue;
    if (pick < 0 && activeByRow[state.capRow] >= 0) pick = activeByRow[state.capRow];
    if (pick < 0) for (let r = 0; r < state.rows; r++) if (activeByRow[r] >= 0) { pick = activeByRow[r]; break; }
    state.selCue = pick;
  }
  highlightActive();
  positionSelBox();
}
function highlightActive() {
  const t = el.video.currentTime; let act = -1;
  for (let r = 0; r < state.rows; r++) { const i = activeCueInRow(r, t); if (i >= 0 && (act < 0 || state.cues[i].start > state.cues[act].start)) act = i; }
  if (act === state.activeCue) return; // avoid pointless DOM thrash
  state.activeCue = act;
  $$('.cue', el.cues).forEach((c) => c.classList.toggle('active', +c.dataset.i === act));
  $$('.tl-block', el.tlInner).forEach((b) => b.classList.toggle('active', +b.dataset.i === act));
}
function positionSelBox() {
  const i = state.selCue;
  // Find the visible block for the selected cue (by cue id, not index — robust to reordering)
  const cueId = i >= 0 && state.cues[i] ? state.cues[i].id : null;
  const block = cueId ? el.capLayer.querySelector(`.cap-block[data-cue="${cueId}"]`) : null;
  if (!block) { el.capSel.classList.remove('on'); return; }
  // The block uses transform:translate(-50%,-50%) with left/top in px relative to
  // .frame; the sel box does the same, so mirror left/top exactly + measure the
  // rendered size. (Simple + reliable — the version that always worked.)
  el.capSel.style.left = block.style.left;
  el.capSel.style.top = block.style.top;
  el.capSel.style.width = block.offsetWidth + 'px';
  el.capSel.style.height = block.offsetHeight + 'px';
  el.capSel.classList.add('on');
}

/* caption drag / select / resize / inline-edit (delegated on frame) */
el.frame.addEventListener('pointerdown', (e) => {
  // Unstick a stale editing flag so a click always selects (see doRenderOverlay).
  if (state.editingCaption && !document.querySelector('.cap-block.editing')) state.editingCaption = false;
  const block = e.target.closest('.cap-block'); if (!block || state.editingCaption) return;
  e.preventDefault(); e.stopPropagation();
  const i = state.cues.findIndex((c) => c.id === block.dataset.cue);
  if (i < 0) return;
  // Pin the caption you grabbed so the handles/selection stay on IT — even when
  // another row's caption is also on screen (otherwise the auto-pick snaps the
  // selection back to the lowest row and you can never grab the upper ones).
  state.selCue = i; state.pinnedCueId = state.cues[i].id; state.capRow = state.cues[i].row || 0;
  state.draggingCaption = true; positionSelBox();
  const fr = el.frame.getBoundingClientRect();
  const sx = e.clientX, sy = e.clientY;
  let moved = false;
  // The caption we grabbed may be on a higher row (offset up). Keep that caption
  // under the cursor by adding its row offset back into the global posY.
  const grabbedRow = state.cues[i].row || 0;
  const rowOff = rowOffsetFrac(grabbedRow);
  // Pointer offset within the block so it doesn't jump to the cursor on first move.
  const br0 = block.getBoundingClientRect();
  const grabDX = (e.clientX - (br0.left + br0.width / 2)) / fr.width;
  const grabDY = (e.clientY - (br0.top + br0.height / 2)) / fr.height;
  const mv = (ev) => {
    if (Math.abs(ev.clientX - sx) + Math.abs(ev.clientY - sy) > 4) moved = true;
    let x = (ev.clientX - fr.left) / fr.width - grabDX;
    let y = (ev.clientY - fr.top) / fr.height - grabDY + rowOff;  // map cursor → this caption's row
    x = clamp(x, -0.4, 1.4);
    y = clamp(y, -0.3 + rowOff, 1.3 + rowOff);
    if (Math.abs(x - 0.5) < 0.02) x = 0.5;
    for (const sy2 of [0.12, 0.5, 0.82]) if (Math.abs((y - rowOff) - sy2) < 0.025) y = sy2 + rowOff;
    state.style.posX = x; state.style.posY = y; renderOverlay();
  };
  const up = () => { document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up); state.draggingCaption = false; if (moved) { afterStyle(); refreshPosInputs(); } else { highlightActive(); positionSelBox(); } };
  document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up);
});
// Resize handles. Corners (tl/tr/bl/br) scale FONT size. Side handles (ml/mr)
// set the text box WIDTH free-form (the box wraps within it; moving never changes it).
$$('.cap-handle', el.capSel).forEach((h) => h.addEventListener('pointerdown', (e) => {
  e.preventDefault(); e.stopPropagation();
  const i = state.selCue; if (i < 0) return;
  const cueId = state.cues[i].id;
  const block = el.capLayer.querySelector(`.cap-block[data-cue="${cueId}"]`);
  if (!block) return;
  state.draggingCaption = true;
  const which = h.dataset.h;
  const fr = el.frame.getBoundingClientRect();
  const br = block.getBoundingClientRect();
  const cx = br.left + br.width / 2, cy = br.top + br.height / 2;

  if (which === 'ml' || which === 'mr') {
    // Box-width drag: width = 2 × distance from caption centre to the pointer.
    const mv = (ev) => {
      const half = Math.abs(ev.clientX - cx);
      state.style.boxWidth = clamp((half * 2) / fr.width, 0.18, 1.5);
      doRenderOverlay();
    };
    const up = () => { document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up); state.draggingCaption = false; afterStyle(); };
    document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up);
    return;
  }

  // Corner drag → font scale (diagonal distance ratio)
  const d0 = Math.hypot(e.clientX - cx, e.clientY - cy) || 1;
  const f0 = state.style.fontSize;
  const lsRatio = state.style.letterSpacing / f0;
  const mv = (ev) => {
    const d = Math.hypot(ev.clientX - cx, ev.clientY - cy);
    state.style.fontSize = Math.round(clamp(f0 * d / d0, 12, state.meta.height * 0.28) * 100) / 100;
    state.style.letterSpacing = state.style.fontSize * lsRatio;
    doRenderOverlay();
  };
  const up = () => { document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up); state.draggingCaption = false; refreshSizeInput(); afterStyle(); };
  document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up);
}));
function refreshSizeInput() { const i = $('#st-size'); if (i) { i.value = state.style.fontSize; const v = $('#v-size'); if (v) v.textContent = (Math.round(state.style.fontSize * 100) / 100) + 'px'; } }
function refreshPosInputs() {
  const s = state.style;
  const px = $('#st-px'), vx = $('#v-px'); if (px) { px.value = Math.round((s.posX != null ? s.posX : 0.5) * 100); if (vx) vx.textContent = Math.round((s.posX != null ? s.posX : 0.5) * 100) + '%'; }
  const py = $('#st-py'), vy = $('#v-py'); if (py) { py.value = Math.round((s.posY != null ? s.posY : 0.78) * 100); if (vy) vy.textContent = Math.round((s.posY != null ? s.posY : 0.78) * 100) + '%'; }
}
el.frame.addEventListener('dblclick', (e) => {
  const block = e.target.closest('.cap-block'); if (!block) return;
  const i = state.cues.findIndex((c) => c.id === block.dataset.cue); if (i < 0) return;
  el.video.pause(); state.editingCaption = true;
  block.classList.add('editing'); block.contentEditable = 'true';
  // Show with real line breaks while editing (innerText preserves them on commit).
  block.innerText = state.cues[i].text; block.focus();
  const r = document.createRange(); r.selectNodeContents(block); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
  const commit = () => {
    state.editingCaption = false; block.contentEditable = 'false'; block.classList.remove('editing');
    // innerText keeps the manual line breaks the user typed (Enter on the canvas).
    const txt = block.innerText.replace(/ /g, ' ').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    if (txt) { state.cues[i].text = txt; redistributeWords(state.cues[i]); }
    renderCues(); renderTimeline(); renderOverlay(); renderScript(); saveSoon();
  };
  block.addEventListener('blur', commit, { once: true });
  // On the VIDEO, Enter inserts a new line (multi-line captions). Esc cancels, Cmd/Ctrl+Enter commits.
  block.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') { ev.preventDefault(); block.innerText = state.cues[i].text; block.blur(); }
    if (ev.key === 'Enter' && (ev.metaKey || ev.ctrlKey)) { ev.preventDefault(); block.blur(); }
    // plain Enter falls through → contenteditable inserts a line break
  });
});

/* ============================ timeline ============================ */
function niceStep(sec, target) { const raw = sec / Math.max(1, target); return [0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300].find((s) => s >= raw) || 600; }
function renderTimeline() {
  if (!state.duration) { el.tlInner.innerHTML = ''; return; }
  const cw = el.timeline.clientWidth || 600, innerW = Math.max(cw, cw * state.zoom), D = state.duration, x = (t) => (t / D) * innerW;
  el.tlInner.style.width = innerW + 'px';
  let html = '<div class="tl-ruler" id="tlRuler">';
  const step = niceStep(D, innerW / 64); for (let t = 0; t <= D + 1e-3; t += step) html += `<div class="tl-tick" style="left:${x(t)}px">${fmtClock(t)}</div>`;
  html += '</div><div class="tl-rows">';
  const linked = el.linkChk && el.linkChk.checked;
  for (let r = 0; r < state.rows; r++) {
    const customH = (state.rowHeights && state.rowHeights[r]) || '';
    html += `<div class="tl-row" data-row="${r}" style="${customH ? `height:${customH}px` : ''}"><button class="tl-row-del" data-rowdel="${r}" title="Delete this caption row"><svg class="ic sm"><use href="#i-trash"/></svg></button><div class="tl-row-resize" data-rowresize="${r}" title="Drag to resize this row"></div>`;
    const row = cuesInRow(r);
    row.forEach(({ c, i }) => { const left = x(c.start), w = Math.max(16, x(c.end) - x(c.start)); html += `<div class="tl-block${i === state.activeCue ? ' active' : ''}${i === state.selCue ? ' sel' : ''}" data-i="${i}" style="left:${left}px;width:${w}px"><div class="tl-handle l"></div><div class="txt">${escapeHtml(c.text)}</div><div class="tl-handle r"></div></div>`; });
    // Linked-edit handles: when ON, draw a draggable pill between adjacent
    // back-to-back captions so the user can slide the SHARED boundary
    // (left cue gets shorter, right cue starts earlier — or vice versa).
    if (linked) {
      for (let k = 0; k + 1 < row.length; k++) {
        const a = row[k], b = row[k + 1];
        if (Math.abs(b.c.start - a.c.end) < 0.02) {
          const px = x(a.c.end);
          html += `<div class="tl-link" data-li="${a.i}" data-ri="${b.i}" style="left:${px}px" title="Slide the shared edge"></div>`;
        }
      }
    }
    html += '</div>';
  }
  html += '</div><div class="tl-playhead" id="playhead"></div><div class="tl-grab" id="phGrab"></div>';
  el.tlInner.innerHTML = html; updatePlayhead();
  autoSizeTl();   // keep the timeline height fitted to the current row count
}
function updatePlayhead() { const ph = $('#playhead'), gr = $('#phGrab'); if (!ph || !state.duration) return; const innerW = el.tlInner.offsetWidth, x = (el.video.currentTime / state.duration) * innerW; ph.style.left = x + 'px'; if (gr) gr.style.left = x + 'px'; }
el.tlZoom.oninput = () => { state.zoom = parseFloat(el.tlZoom.value); renderTimeline(); };
el.addRowBtn.onclick = () => { state.rows++; renderTimeline(); renderRowSelectors(); };

// Delete a caption row from the timeline. If row has captions, confirm first;
// row 0 is never removed (always keep one). Surviving rows shift up.
el.tlInner.addEventListener('click', async (e) => {
  const btn = e.target.closest('.tl-row-del'); if (!btn) return;
  e.preventDefault(); e.stopPropagation();
  const r = +btn.dataset.rowdel;
  if (state.rows <= 1) { toast('You need at least one caption row'); return; }
  const inRow = state.cues.filter((c) => (c.row || 0) === r);
  if (inRow.length) {
    const ok = await confirmDialog(`Delete row ${r + 1}? This removes ${inRow.length} caption${inRow.length === 1 ? '' : 's'}.`, { okLabel: 'Delete row', danger: true });
    if (!ok) return;
  }
  // Drop cues on this row; shift higher rows down by one.
  state.cues = state.cues.filter((c) => (c.row || 0) !== r).map((c) => {
    if ((c.row || 0) > r) c.row = (c.row || 0) - 1;
    return c;
  });
  state.rows = Math.max(1, state.rows - 1);
  if (state.capRow >= state.rows) state.capRow = state.rows - 1;
  clearCueSel(); ensureRows(); fixOverlaps();
  renderRowSelectors(); renderAll(); renderScript(); saveSoon();
  toast(`Row ${r + 1} deleted`);
});

// Timeline mouse-wheel behaviour:
//  • Cmd/Ctrl + wheel  → zoom in/out toward the cursor (the proper, fluid zoom)
//  • plain wheel       → scroll horizontally (easy side-to-side navigation)
el.timeline.addEventListener('wheel', (e) => {
  if (!state.duration) return;
  if (e.metaKey || e.ctrlKey) {
    e.preventDefault();
    const rect = el.tlInner.getBoundingClientRect();
    const cursorX = e.clientX - rect.left;                 // px within the (scrolled) inner content
    const D = state.duration;
    const oldInnerW = el.tlInner.offsetWidth || 1;
    const tAtCursor = (cursorX / oldInnerW) * D;            // time under the cursor before zoom
    const factor = e.deltaY < 0 ? 1.18 : 1 / 1.18;
    state.zoom = clamp(state.zoom * factor, 1, 40);
    el.tlZoom.value = Math.min(10, state.zoom);             // keep slider roughly in sync
    renderTimeline();
    // keep the same time-point under the cursor after the re-render
    const newInnerW = el.tlInner.offsetWidth;
    const newCursorX = (tAtCursor / D) * newInnerW;
    el.timeline.scrollLeft = newCursorX - (e.clientX - el.timeline.getBoundingClientRect().left);
  } else if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
    // vertical wheel → horizontal scroll (only when there's something to scroll)
    if (el.tlInner.offsetWidth > el.timeline.clientWidth) { e.preventDefault(); el.timeline.scrollLeft += e.deltaY; }
  }
}, { passive: false });

// scrub by clicking ruler / empty / playhead handle
function startScrub(e) {
  const innerW = el.tlInner.offsetWidth, D = state.duration;
  const r = el.tlInner.getBoundingClientRect();
  state.playUntil = -1;  // scrubbing the timeline = general playback intent, drop any caption-limit
  const wasPlaying = !el.video.paused; el.video.pause();
  const seek = (cx) => {
    const t = clamp((cx - r.left) / innerW, 0, 1) * D;
    el.video.currentTime = t;
    // Immediately move playhead + grab so dragging feels glued, no waiting on timeupdate
    const ph = $('#playhead'), gr = $('#phGrab'), x = (t / D) * innerW;
    if (ph) ph.style.left = x + 'px';
    if (gr) gr.style.left = x + 'px';
  };
  seek(e.clientX);
  const mv = (ev) => seek(ev.clientX);
  const up = () => { document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up); if (wasPlaying) el.video.play().catch(() => {}); };
  document.addEventListener('pointermove', mv);
  document.addEventListener('pointerup', up);
}
// Double-click a timeline block = jump to its sidebar input and select-all so
// the user can immediately overwrite the text — the old "click-to-edit" workflow.
// (Double-click is handled inside the block's pointerup handler via e.detail >= 2.)

// Per-row vertical resize — drag the thin handle along the bottom of a row.
el.tlInner.addEventListener('pointerdown', (e) => {
  const grip = e.target.closest('.tl-row-resize'); if (!grip) return;
  e.preventDefault(); e.stopPropagation();
  const r = +grip.dataset.rowresize;
  const rowEl = grip.parentElement;
  const startY = e.clientY, startH = rowEl.getBoundingClientRect().height;
  const mv = (ev) => {
    const h = clamp(startH + (ev.clientY - startY), 46, 140);
    rowEl.style.height = h + 'px';
    state.rowHeights[r] = Math.round(h);
  };
  const up = () => { document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up); saveSoon(); };
  document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up);
});
// Clicking the canvas / video frame anywhere = drop the current sidebar selection
// and any focused input (commits Enter-equivalent). The caption-overlay double-click
// editor still grabs its own dblclick handler.
el.canvasArea.addEventListener('pointerdown', (e) => {
  if (e.target.closest('.cap-block')) return;       // editing a caption overlay
  // Commit any focused input + deselect
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  if (state.selectedSet.size) clearCueSel();
});
el.tlInner.addEventListener('pointerdown', (e) => {
  if (e.target.closest('.tl-block')) return; // handled below
  if (e.target.closest('.tl-row-del')) return;   // let the row-delete button get its click
  if (e.target.closest('.tl-row-resize')) return; // let row-resize handle take over
  // Empty timeline area: deselect any cue + blur any focused input.
  if (!e.target.closest('.tl-link') && !e.target.closest('.tl-grab')) {
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    if (state.selectedSet.size) clearCueSel();
  }
  // Linked boundary drag — slide the shared edge of two back-to-back captions.
  const link = e.target.closest('.tl-link');
  if (link) {
    e.preventDefault(); e.stopPropagation();
    const li = +link.dataset.li, ri = +link.dataset.ri;
    const L = state.cues[li], R = state.cues[ri];
    const innerW = el.tlInner.offsetWidth, D = state.duration;
    const sx = e.clientX, mid0 = L.end;
    const lo = L.start + 0.1, hi = R.end - 0.1;
    const mv = (ev) => {
      const dt = ((ev.clientX - sx) / innerW) * D;
      const nm = clamp(mid0 + dt, lo, hi);
      L.end = nm; R.start = nm;
      redistributeWords(L); redistributeWords(R);
      renderTimeline(); renderOverlay();
    };
    const up = () => { document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up); saveSoon(); };
    document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up);
    return;
  }
  e.preventDefault(); startScrub(e);
});
el.tlInner.addEventListener('pointerdown', (e) => {
  const block = e.target.closest('.tl-block'); if (!block) return;
  if (e.target.closest('.tl-row-del') || e.target.closest('.tl-row-resize')) return;
  e.preventDefault(); e.stopPropagation();
  const i = +block.dataset.i, cue = state.cues[i], innerW = el.tlInner.offsetWidth, D = state.duration;
  const rowsEl = $('.tl-rows', el.tlInner);
  const rowsTop = rowsEl ? rowsEl.getBoundingClientRect() : { top: 0 };
  const handle = e.target.closest('.tl-handle') ? (e.target.closest('.tl-handle').classList.contains('l') ? 'l' : 'r') : 'move';
  const sx = e.clientX, s0 = cue.start, e0 = cue.end;
  const startRow = cue.row || 0;
  let moved = false;
  // Track the user's INTENDED position (not clamped to current-row neighbors).
  // On release we can use it to spill to another row if the current one is busy.
  let intendedStart = s0;
  // Cache the DOM node so we mutate it in place during drag instead of
  // re-rendering the whole timeline (the old code did the latter, which
  // destroyed the element under the user's cursor and made drag feel broken).
  let liveBlock = block;
  const px = (t) => (t / D) * innerW;
  // Snap threshold for "attach to neighbor edge" — 16px of cursor travel maps
  // to a generous time window so dragging near another caption locks to its edge.
  const SNAP_PX = 16; const SNAP_SEC = (SNAP_PX / Math.max(1, innerW)) * D;
  const snapToNeighbors = (val, isEnd) => {
    let best = val, bd = SNAP_SEC;
    state.cues.forEach((c, j) => {
      if (j === i || (c.row || 0) !== (cue.row || 0)) return;
      [c.start, c.end].forEach((edge) => {
        const d = Math.abs(val - edge);
        if (d < bd) { bd = d; best = edge; }
      });
    });
    return best;
  };
  const mv = (ev) => {
    const dt = ((ev.clientX - sx) / innerW) * D;
    if (Math.abs(ev.clientX - sx) > 3) moved = true;
    const b = neighborBounds(i);
    if (handle === 'l')      cue.start = clamp(snapToNeighbors(s0 + dt, false), b.lo, cue.end - 0.1);
    else if (handle === 'r') cue.end   = clamp(snapToNeighbors(e0 + dt, true), cue.start + 0.1, b.hi);
    else {
      const len = e0 - s0;
      intendedStart = clamp(s0 + dt, 0, state.duration - len);
      // Snap the leading OR trailing edge to a neighbor when within threshold.
      const snappedStart = snapToNeighbors(intendedStart, false);
      const snappedEnd   = snapToNeighbors(intendedStart + len, true) - len;
      const snapped = (Math.abs(snappedStart - intendedStart) < Math.abs(snappedEnd - intendedStart)) ? snappedStart : snappedEnd;
      const ns = clamp(snapped, b.lo, b.hi - len);
      cue.start = ns; cue.end = ns + len;
      // Move to another row if pointer is in a different row's vertical band.
      // Measure the real lane height (CSS --tl-row-h varies 56–76) so the band
      // lines up with what the user sees.
      const rowH = (rowsEl && rowsEl.querySelector('.tl-row') ? rowsEl.querySelector('.tl-row').getBoundingClientRect().height : 56) || 56;
      const rel = ev.clientY - rowsTop.top;
      const nr = clamp(Math.floor(rel / rowH), 0, state.rows - 1);
      if (nr !== (cue.row || 0)) {
        cue.row = nr;
        const nb = neighborBounds(i);
        const nLen = cue.end - cue.start;
        cue.start = clamp(intendedStart, nb.lo, nb.hi - nLen);
        cue.end = cue.start + nLen;
        // Move the live block to the new row in the DOM
        const newRow = $(`.tl-row[data-row="${nr}"]`, el.tlInner);
        if (newRow && liveBlock.parentElement !== newRow) newRow.appendChild(liveBlock);
      }
    }
    // In-place visual update — no full re-render, drag stays smooth.
    const left = px(cue.start), width = Math.max(16, px(cue.end) - px(cue.start));
    liveBlock.style.left = left + 'px';
    liveBlock.style.width = width + 'px';
    redistributeWords(cue);
    syncCueRow(i);
    renderOverlay();
  };
  const up = (ev) => {
    document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up);
    if (!moved) {
      // Multi-select keys take precedence
      if (ev && (ev.shiftKey) && state.selAnchor >= 0) { selectRange(state.selAnchor, i); paintSelected(); }
      else if (ev && (ev.metaKey || ev.ctrlKey)) { toggleSel(i); state.selAnchor = i; paintSelected(); }
      else {
        state.selectedSet.clear(); state.selectedSet.add(i); state.selAnchor = i; state.selCue = i;
        // Clicking a TIMELINE block = SELECT + seek-to-start only. Never autoplay —
        // the user wants to pick the caption to edit, not preview it. Press Space
        // (or the play button) to actually play.
        state.playUntil = -1;
        state.loopCue = el.loopChk.checked ? i : -1;
        el.video.currentTime = cue.start + 0.01;
        switchTab('captions'); state.capRow = cue.row || 0; renderRowSelectors(); renderCues(); scrollToCue(i); paintSelected();
        // Double-click = also pop the sidebar input into edit mode with text
        // pre-selected. (e.detail counts consecutive clicks; the native dblclick
        // event is suppressed by our preventDefault on pointerdown, so we route
        // through e.detail instead — reliable across browsers.)
        if (ev && ev.detail >= 2) {
          requestAnimationFrame(() => {
            const card = $(`.cue[data-i="${i}"]`, el.cues);
            const ta = card && $('textarea', card);
            if (ta) { ta.focus(); ta.select(); }
          });
        }
      }
    } else if (handle === 'move' && Math.abs(intendedStart - cue.start) > 0.02) {
      // The user dragged past a neighbor: the cue got clamped, but their cursor
      // wanted it elsewhere. Spill to a row where the intended position fits;
      // if none has space, create a brand-new row at the bottom.
      const len = cue.end - cue.start;
      const wantStart = intendedStart, wantEnd = intendedStart + len;
      const fits = (r) => state.cues.every((c, j) => j === i || (c.row || 0) !== r
        || c.end <= wantStart + 1e-3 || c.start >= wantEnd - 1e-3);
      let target = -1;
      for (let r = 0; r < state.rows; r++) if (r !== (cue.row || 0) && fits(r)) { target = r; break; }
      if (target < 0) { target = state.rows; state.rows++; }   // new row at the bottom
      cue.row = target; cue.start = wantStart; cue.end = wantEnd;
      toast(`Moved to row ${target + 1}`);
    }
    ensureRows(); fixOverlaps(); renderTimeline(); renderOverlay(); saveSoon();
  };
  document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up);
});
function syncCueRow(i) { if ((state.cues[i].row || 0) === state.capRow) renderCues(); }
function scrollToCue(i) { const row = $(`.cue[data-i="${i}"]`, el.cues); if (row) row.scrollIntoView({ block: 'center', behavior: 'smooth' }); }

/* ============================ script tab ============================ */
var scriptWords = [], scriptSel = null, scriptSegs = [];
el.scriptRow.onchange = () => { state.scriptRow = +el.scriptRow.value; renderScript(); };
function flattenRowWords(r) { const out = []; cuesInRow(r).forEach(({ c, i }) => { (c.words && c.words.length ? c.words : [{ word: c.text, start: c.start, end: c.end }]).forEach((w) => out.push({ ...w })); }); return out; }
function renderScript() {
  if (!state.cues.length) { el.scriptPara.innerHTML = '<span style="color:var(--faint)">No transcript yet.</span>'; el.scriptSegs.innerHTML = ''; return; }
  scriptWords = flattenRowWords(state.scriptRow); scriptSegs = []; scriptSel = null;
  el.scriptPara.innerHTML = scriptWords.map((w, k) => `<span class="sw" data-k="${k}">${escapeHtml(w.word)}</span>`).join(' ');
  el.scriptSegs.innerHTML = '';
}
function highlightScript() {
  // Each segment is highlighted as its OWN connected band — separate from other
  // segments, so multiple selections read as distinct groups (not one big blob).
  const spans = {};
  $$('.sw', el.scriptPara).forEach((sp) => { sp.className = 'sw'; spans[+sp.dataset.k] = sp; });
  const segs = scriptSegs.slice();
  if (scriptSel) segs.push({ from: Math.min(scriptSel.a, scriptSel.b), to: Math.max(scriptSel.a, scriptSel.b) });
  segs.forEach((s) => {
    for (let k = s.from; k <= s.to; k++) {
      const sp = spans[k]; if (!sp) continue;
      sp.classList.add('sel');
      if (s.from === s.to) sp.classList.add('sel-single');
      else if (k === s.from) sp.classList.add('sel-start');
      else if (k === s.to) sp.classList.add('sel-end');
      else sp.classList.add('sel-mid');
    }
  });
}
el.scriptPara.addEventListener('pointerdown', (e) => {
  const sp = e.target.closest('.sw'); if (!sp) return; e.preventDefault();
  const a = +sp.dataset.k; scriptSel = { a, b: a }; highlightScript();
  const mv = (ev) => { const t = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('.sw'); if (t) { scriptSel.b = +t.dataset.k; highlightScript(); } };
  const up = () => { document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up); const from = Math.min(scriptSel.a, scriptSel.b), to = Math.max(scriptSel.a, scriptSel.b); scriptSel = null; addScriptSeg(from, to); highlightScript(); };
  document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up);
});
function addScriptSeg(from, to) {
  const text = scriptWords.slice(from, to + 1).map((w) => w.word).join(' ');
  scriptSegs.push({ from, to, text });
  renderScriptSegs();
}
function renderScriptSegs() {
  el.scriptSegs.innerHTML = scriptSegs.map((s, k) => `<div class="seg-box" data-k="${k}"><span class="num">${k + 1}</span><div style="flex:1"><textarea rows="1">${escapeHtml(s.text)}</textarea><div class="seg-time">${fmtClock(scriptWords[s.from].start)} → ${fmtClock(scriptWords[s.to].end)}</div></div><button class="del" data-del="${k}" title="Remove"><svg class="ic sm"><use href="#i-trash"/></svg></button></div>`).join('');
  $$('.seg-box textarea', el.scriptSegs).forEach((t, k) => { t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; t.oninput = () => { scriptSegs[k].text = t.value; autoSizeOne(t); }; });
  $$('[data-del]', el.scriptSegs).forEach((b) => b.onclick = () => { scriptSegs.splice(+b.dataset.del, 1); renderScriptSegs(); highlightScript(); });
}
el.scriptClear.onclick = () => { scriptSegs = []; scriptSel = null; renderScriptSegs(); highlightScript(); };
const scriptOneWordBtn = document.getElementById('scriptOneWord');
if (scriptOneWordBtn) scriptOneWordBtn.onclick = async () => {
  // Completely RE-RUN the transcription, one caption per spoken word — fresh from
  // the engine so every word gets its real start/end (no equal-divide). Needs the
  // local video, same as Regenerate.
  if (!window.__captoMedia || !window.__captoMedia.file) return toast('Locate the video first.', true);
  if (state.cues.length && !(await confirmDialog('Regenerate one word per word? Re-runs the engine so each word is timed exactly.', { okLabel: 'Regenerate' }))) return;
  switchTab('captions');
  scriptSegs = []; scriptSel = null;
  await transcribeProject({ oneWord: true });
};
el.scriptRewrite.onclick = () => {
  if (!scriptSegs.length) return toast('Select some words first.', true);
  const r = state.scriptRow;
  const stamp = Date.now();
  const newCues = scriptSegs.map((s, k) => {
    const origWords = scriptWords.slice(s.from, s.to + 1);
    const origText = origWords.map((w) => w.word).join(' ');
    const text = s.text.trim() || origText;
    const cue = {
      id: `r${stamp}-${r}-${k}`,
      row: r,
      start: scriptWords[s.from].start,
      end: scriptWords[s.to].end,
      text,
    };
    // If the text is unchanged, keep the REAL per-word timings from the AI
    // transcription (accurate karaoke highlight). Only redistribute when edited.
    if (text === origText) {
      cue.words = origWords.map((w) => ({ word: w.word, start: w.start, end: w.end }));
    } else {
      redistributeWords(cue);
    }
    return cue;
  });
  // Replace just this row's cues, then sort the whole list by (row, start) so
  // activeCueInRow/highlight/timeline all stay in lockstep.
  state.cues = state.cues
    .filter((c) => (c.row || 0) !== r)
    .concat(newCues)
    .sort((a, b) => (a.row || 0) - (b.row || 0) || a.start - b.start);
  // Force-invalidate cached references so paint/loop logic doesn't use stale indices
  state.activeCue = -1;
  state.selectedSet.clear();
  state.selCue = -1;
  state.loopCue = -1;
  scriptSegs = []; scriptSel = null;          // clear script panel selection
  state.capRow = r;                            // jump the captions tab to the row we just rewrote
  ensureRows(); fixOverlaps();
  renderRowSelectors(); renderAll(); renderScript(); saveSoon();
  switchTab('captions'); toast(`Rewrote ${newCues.length} captions in row ${r + 1}`);
};

/* ============================ transport ============================ */
// Single source of truth for the play button: pressing Play ALWAYS plays through
// the whole video (clears any "play only this caption" limit + loop). Pause just pauses.
el.playBtn.onclick = () => {
  if (el.video.paused) {
    state.playUntil = -1;
    if (!el.loopChk.checked) state.loopCue = -1;
    state.wantPlaying = true;
    el.video.play().catch(() => {});
  } else {
    state.wantPlaying = false;
    el.video.pause();
  }
};
const PLAY_SVG  = '<svg class="ic"><use href="#i-play"/></svg>';
const PAUSE_SVG = '<svg class="ic"><use href="#i-pause"/></svg>';
el.playBtn.innerHTML = PLAY_SVG;
el.video.addEventListener('play',  () => el.playBtn.innerHTML = PAUSE_SVG);
el.video.addEventListener('pause', () => el.playBtn.innerHTML = PLAY_SVG);
el.video.addEventListener('timeupdate', () => {
  el.timeLabel.textContent = `${fmtClock(el.video.currentTime)} / ${fmtClock(state.duration)}`;
  // Only loop when the checkbox is actually on right NOW (don't rely on stale loopCue)
  if (el.loopChk.checked && state.loopCue >= 0 && state.cues[state.loopCue] && !el.video.paused
      && el.video.currentTime >= state.cues[state.loopCue].end - 0.02) {
    el.video.currentTime = state.cues[state.loopCue].start + 0.01;
  }
  // "Play only this caption" — stop at the caption's end (set when a cue card was clicked).
  if (state.playUntil >= 0 && !el.video.paused && el.video.currentTime >= state.playUntil - 0.02) {
    state.wantPlaying = false;
    el.video.pause();
    state.playUntil = -1;
  }
  renderOverlay(); updatePlayhead();
});
// Unchecking Loop should immediately release any active loop
el.loopChk.addEventListener('change', () => { if (!el.loopChk.checked) state.loopCue = -1; });
el.linkChk.addEventListener('change', () => renderTimeline());

// ── Timeline vertical resize: grab the strip above the timeline and drag.
// Persisted in localStorage. Past the cap (3 rows visible), the timeline
// internally scrolls — never pushes the canvas up.
const TL_MIN = 82, TL_MAX_FACTOR = 0.65;   // up to 65% of window height
function applyTlHeight(px, fromUser) {
  const max = Math.max(TL_MIN + 50, Math.round(window.innerHeight * TL_MAX_FACTOR));
  const h = clamp(px, TL_MIN, max);
  document.documentElement.style.setProperty('--tl-h', h + 'px');
  // Row height scales modestly with timeline height — bigger timeline → fatter
  // rows (max ~76px), so you get more readable blocks when expanded.
  const rowH = clamp(56 + Math.round((h - 188) * 0.10), 56, 76);
  document.documentElement.style.setProperty('--tl-row-h', rowH + 'px');
  // Only PERSIST + lock the height when the user dragged it themselves. Auto-fit
  // calls (after generating/loading) must not clobber their manual preference.
  if (fromUser) { localStorage.setItem('subby-tl-h', String(h)); localStorage.setItem('subby-tl-userset', '1'); }
}
// Natural timeline height for the current row count — ruler + one lane per row.
function naturalTlH() { return clamp(26 + (state.rows || 1) * 56, TL_MIN, Math.round(window.innerHeight * TL_MAX_FACTOR)); }
// Fit the timeline to its rows unless the user has manually resized it.
function autoSizeTl() {
  if (localStorage.getItem('subby-tl-userset') === '1') applyTlHeight(+localStorage.getItem('subby-tl-h') || naturalTlH());
  else applyTlHeight(naturalTlH());
}
autoSizeTl();   // initial: compact, sized to the (single) starting row
applyTlHeight(+localStorage.getItem('subby-tl-h') || 188);   // ~3 rows by default
el.tlResize.addEventListener('pointerdown', (e) => {
  e.preventDefault(); el.tlResize.classList.add('active');
  const startY = e.clientY, startH = el.timeline.getBoundingClientRect().height;
  const mv = (ev) => applyTlHeight(startH + (startY - ev.clientY), true);   // drag UP grows; fromUser → persist
  const up = () => { el.tlResize.classList.remove('active'); document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up); };
  document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up);
});
window.addEventListener('resize', autoSizeTl);

// ── Resilient playback through system audio interruptions (FaceTime/Zoom focus,
// AirPods switch, screen lock). WKWebView/Safari suspend the <video> when
// another app grabs the audio session — when we get focus back and the user's
// intent was "playing", re-issue play(). state.wantPlaying tracks that intent.
state.wantPlaying = false;
const _resumeIfWanted = () => { if (state.wantPlaying && el.video.paused && el.video.currentTime < state.duration - 0.05) el.video.play().catch(() => {}); };
document.addEventListener('visibilitychange', () => { if (!document.hidden) _resumeIfWanted(); });
window.addEventListener('focus', _resumeIfWanted);
window.addEventListener('resize', () => { fitFrame(); applyView(); renderOverlay(); renderTimeline(); });
window.addEventListener('keydown', (e) => {
  const typing = /INPUT|TEXTAREA/.test(e.target.tagName) || e.target.isContentEditable;
  if (state.editingCaption || !el.uploadView.hidden) return;
  if (e.code === 'Space' && !typing) { e.preventDefault(); el.playBtn.click(); return; }
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a' && !typing) { e.preventDefault(); selectAllCues(); return; }
  // N = add a new caption at the playhead (smart-row choice handled by addCueBtn handler)
  if ((e.key === 'n' || e.key === 'N') && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
    e.preventDefault(); el.addCueBtn.click(); return;
  }
  if ((e.key === 'Delete' || e.key === 'Backspace') && !typing && state.selectedSet.size) {
    e.preventDefault();
    const sorted = [...state.selectedSet].sort((a, b) => b - a);
    sorted.forEach((i) => state.cues.splice(i, 1));
    clearCueSel(); ensureRows(); renderAll(); renderScript(); saveSoon();
    toast(`Deleted ${sorted.length} captions`);
    return;
  }
  if (e.key === 'Escape' && state.selectedSet.size) clearCueSel();
  // ←/→ : step to the previous/next caption (by start time) and seek there. Pins
  // it so the canvas move/resize handles follow, and selects it in the list.
  if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !typing) {
    if (!state.cues.length) return;
    e.preventDefault();
    const order = state.cues.map((c, i) => ({ i, start: c.start })).sort((a, b) => a.start - b.start);
    const t = el.video.currentTime;
    let target = null;
    if (e.key === 'ArrowRight') target = order.find((o) => o.start > t + 0.02);
    else { for (const o of order) if (o.start < t - 0.05) target = o; }
    if (!target) target = e.key === 'ArrowRight' ? order[order.length - 1] : order[0];
    const i = target.i, cue = state.cues[i];
    state.selectedSet.clear(); state.selectedSet.add(i); state.selAnchor = i; state.selCue = i;
    state.pinnedCueId = cue.id; state.capRow = cue.row || 0;
    el.video.currentTime = cue.start + 0.01;
    paintSelected(); renderOverlay();
    const card = el.cues.querySelector(`.cue[data-i="${i}"]`); if (card) card.scrollIntoView({ block: 'nearest' });
    return;
  }
});

// ── Timeline "Add caption" button (mirror of the sidebar button)
el.tlAddCueBtn.onclick = () => el.addCueBtn.click();

// ── Script tab: copy full transcript
el.scriptCopy.onclick = async () => {
  const text = state.cues.map(c => c.text).join(' ').trim();
  if (!text) { toast('No transcript yet'); return; }
  try { await navigator.clipboard.writeText(text); toast('Transcript copied'); }
  catch { toast('Copy failed', true); }
};

// ── Right-click anywhere in the timeline → mini menu with "Add caption here"
el.timeline.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  const innerW = el.tlInner.offsetWidth, D = state.duration; if (!D) return;
  const r = el.tlInner.getBoundingClientRect();
  const t = clamp((e.clientX - r.left) / innerW, 0, 1) * D;
  showTlMenu(e.clientX, e.clientY, t);
});
function showTlMenu(x, y, t) {
  const old = document.getElementById('tlMenu'); if (old) old.remove();
  const m = document.createElement('div'); m.id = 'tlMenu'; m.className = 'tl-menu';
  m.style.left = x + 'px'; m.style.top = y + 'px';
  m.innerHTML = `<button data-act="add">＋ Add caption at ${fmtClock(t)}</button>`;
  document.body.appendChild(m);
  const close = () => { m.remove(); document.removeEventListener('pointerdown', close, true); };
  m.querySelector('[data-act="add"]').onclick = () => { el.video.currentTime = t; el.addCueBtn.click(); close(); };
  setTimeout(() => document.addEventListener('pointerdown', close, true), 0);
}

/* ============================ resizer ============================ */
function applyPanelWidth() { const w = +localStorage.getItem('subby-panel-w') || 384; document.documentElement.style.setProperty('--panel-w', clamp(w, 320, 760) + 'px'); }
el.resizer.addEventListener('pointerdown', (e) => {
  e.preventDefault(); el.resizer.classList.add('active');
  const mv = (ev) => { const w = clamp(window.innerWidth - ev.clientX, 320, 760); document.documentElement.style.setProperty('--panel-w', w + 'px'); fitFrame(); applyView(); renderTimeline(); renderOverlay(); };
  const up = (ev) => { el.resizer.classList.remove('active'); localStorage.setItem('subby-panel-w', clamp(window.innerWidth - ev.clientX, 320, 760)); document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up); };
  document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up);
});

/* ============================ save ============================ */
var saveTimer = null, savePending = false;
function doSave() {
  savePending = false;
  if (!state.id) return;
  fetch(`/api/projects/${state.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cues: state.cues, style: state.style }) }).catch(() => {});
  sendFeedback();
}
function saveSoon() {
  clearTimeout(saveTimer);
  savePending = true;
  saveTimer = setTimeout(doSave, 450);
  pushHistory();
}
// Flush any pending save the instant the user leaves/hides the tab, so freshly
// generated or edited captions are never lost to a quick reload or close.
function flushSave() { if (savePending) { clearTimeout(saveTimer); doSave(); } }
window.addEventListener('pagehide', flushSave);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushSave(); });

/* ============================ learning telemetry ============================ */
// Every AI-generated cue is tagged with the model's ORIGINAL text + timing
// (_ai/_aiStart/_aiEnd). As the user corrects captions we stream the (AI → final)
// diffs to /api/studio/feedback so Capto accumulates real training data — what was
// edited, where, and how — to keep improving the engine. Privacy: only caption
// text + timings + the engine/lang are sent; the video never leaves the device.
const fbSent = {};   // cueId -> last signature sent (dedupe)
function collectFeedbackEvents() {
  const events = [];
  for (const c of state.cues) {
    if (!c || !c._ai) continue;                 // only cues the AI produced
    const textChanged = (c.text || '') !== c._ai;
    const timingChanged = Math.abs((c.start || 0) - (c._aiStart || 0)) > 0.05 || Math.abs((c.end || 0) - (c._aiEnd || 0)) > 0.05;
    if (!textChanged && !timingChanged) continue;
    const sig = `${c.text}|${(c.start || 0).toFixed(2)}|${(c.end || 0).toFixed(2)}`;
    if (fbSent[c.id] === sig) continue;         // unchanged since last send
    fbSent[c.id] = sig;
    events.push({
      kind: textChanged ? 'text' : 'timing',
      cueId: String(c.id),
      aiText: c._ai,
      finalText: c.text,
      payload: { aiStart: c._aiStart, aiEnd: c._aiEnd, finalStart: c.start, finalEnd: c.end },
    });
  }
  return events;
}
function sendFeedback(extra, useBeacon) {
  if (!state.id) return;
  try {
    const events = collectFeedbackEvents();
    if (extra) events.push(extra);
    if (!events.length) return;
    const eu = state.engineUsed || null;
    const body = JSON.stringify({ projectId: state.id, engine: state.engine, language: state.language, engineProvider: eu && eu.provider, engineModel: eu && eu.model, events });
    if (useBeacon && navigator.sendBeacon) { navigator.sendBeacon('/api/studio/feedback', new Blob([body], { type: 'application/json' })); return; }
    fetch('/api/studio/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }).catch(() => {});
  } catch {}
}
// Flush remaining corrections when leaving the project / tab.
window.addEventListener('pagehide', () => sendFeedback(null, true));
document.addEventListener('visibilitychange', () => { if (document.hidden) sendFeedback(null, true); });

/* ============================ undo / redo ============================ */
// Single shared history stack of (cues+style) snapshots. ⌘Z to undo, ⌘⇧Z (or Ctrl-Y) to redo.
const history = { stack: [], cursor: -1, max: 60, suspend: false };
function snapshotState() { return JSON.stringify({ cues: state.cues, style: state.style }); }
var historyTimer = null;
function pushHistory() {
  if (history.suspend) return;
  clearTimeout(historyTimer);
  // Debounce so a fast burst of edits collapses to one history entry
  historyTimer = setTimeout(() => {
    const snap = snapshotState();
    if (history.stack[history.cursor] === snap) return;
    history.stack = history.stack.slice(0, history.cursor + 1);
    history.stack.push(snap);
    if (history.stack.length > history.max) history.stack.shift();
    history.cursor = history.stack.length - 1;
  }, 220);
}
function applyHistoryEntry(snap) {
  const parsed = JSON.parse(snap);
  history.suspend = true;
  state.cues = parsed.cues;
  state.style = parsed.style; normalizeStyle(state.style);
  state.activeCue = -1; state.selCue = -1; state.selectedSet.clear();
  ensureRows(); fixOverlaps();
  renderRowSelectors && renderRowSelectors();
  renderAll(); renderScript && renderScript();
  fetch(`/api/projects/${state.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cues: state.cues, style: state.style }) }).catch(() => {});
  setTimeout(() => { history.suspend = false; }, 50);
}
function undo() {
  if (history.cursor <= 0) return toast('Nothing to undo', true);
  history.cursor--;
  applyHistoryEntry(history.stack[history.cursor]);
  toast('Undo');
}
function redo() {
  if (history.cursor >= history.stack.length - 1) return toast('Nothing to redo', true);
  history.cursor++;
  applyHistoryEntry(history.stack[history.cursor]);
  toast('Redo');
}
el.undoBtn && (el.undoBtn.onclick = undo);
el.redoBtn && (el.redoBtn.onclick = redo);
el.backHome && (el.backHome.onclick = goHome);

// Click the project name in the topbar to rename it inline. Commits to the
// server via PATCH and updates the home view's cached list silently.
if (el.projectName) {
  el.projectName.addEventListener('click', () => {
    if (!state.id || el.projectName.classList.contains('editing')) return;
    const orig = state.originalName || '';
    // The file EXTENSION is not part of the editable name — strip it for editing
    // and re-append on commit so it can never be deleted or changed.
    const extM = orig.match(/\.[a-z0-9]{1,5}$/i);
    const ext = extM ? extM[0] : '';
    const base = ext ? orig.slice(0, -ext.length) : orig;
    el.projectName.classList.add('editing');
    el.projectName.contentEditable = 'plaintext-only';
    el.projectName.textContent = base;
    el.projectName.focus();
    const r = document.createRange(); r.selectNodeContents(el.projectName);
    const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
    let done = false;
    const cleanup = () => { el.projectName.removeEventListener('keydown', onKey); el.projectName.removeEventListener('beforeinput', onBeforeInput); };
    const restore = () => { cleanup(); el.projectName.contentEditable = 'false'; el.projectName.classList.remove('editing'); el.projectName.textContent = state.originalName || orig; };
    const commit = async () => {
      if (done) return; done = true; cleanup();
      const typed = (el.projectName.textContent || '').replace(/[\r\n]+/g, ' ').trim().slice(0, 200);
      if (!typed || (typed + ext) === orig) { el.projectName.contentEditable = 'false'; el.projectName.classList.remove('editing'); el.projectName.textContent = orig; return; }
      const name = typed + ext;
      state.originalName = name;
      el.projectName.contentEditable = 'false'; el.projectName.classList.remove('editing');
      el.projectName.textContent = name;
      try {
        await fetch(`/api/projects/${state.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
        toast('Renamed');
      } catch { toast('Rename failed', true); el.projectName.textContent = orig; state.originalName = orig; }
    };
    // A filename can never contain a line break — block any newline input outright,
    // so Enter (or a pasted multi-line string) can't insert one. Enter just commits.
    const onBeforeInput = (ev) => { if (ev.inputType === 'insertLineBreak' || ev.inputType === 'insertParagraph') ev.preventDefault(); };
    const onKey = (ev) => {
      // Enter saves immediately (commit also runs on blur; guarded by `done` so it
      // can't double-fire). Esc cancels back to the original name.
      if (ev.key === 'Enter') { ev.preventDefault(); ev.stopPropagation(); commit(); el.projectName.blur(); }
      else if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); done = true; restore(); el.projectName.blur(); }
    };
    el.projectName.addEventListener('beforeinput', onBeforeInput);
    el.projectName.addEventListener('blur', commit, { once: true });
    el.projectName.addEventListener('keydown', onKey);
  });
}
window.addEventListener('keydown', (e) => {
  if (el.uploadView && !el.uploadView.hidden) return;
  if (state.editingCaption) return;
  const typing = /INPUT|TEXTAREA/.test(e.target.tagName) || e.target.isContentEditable;
  if (typing) return; // let the input handle ⌘Z natively for text
  const mod = e.metaKey || e.ctrlKey; if (!mod) return;
  const k = e.key.toLowerCase();
  if (k === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
  else if ((k === 'z' && e.shiftKey) || k === 'y') { e.preventDefault(); redo(); }
});

/* ============================ export ============================ */
let exportDir = localStorage.getItem('subby-export-dir') || '~/Desktop';
let lastSavedPath = null;
const exDestEls = {
  path: document.getElementById('exPath'),
  choose: document.getElementById('exChooseDir'),
  openFolder: document.getElementById('exOpenFolder'),
};
function prettyDir(d) { return d.replace(/^\/Users\/[^/]+/, '~'); }
function setExportDir(d) { exportDir = d; localStorage.setItem('subby-export-dir', d); if (exDestEls.path) { exDestEls.path.textContent = prettyDir(d); exDestEls.path.title = d; } fetch('/api/settings/export-dir', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dir: d }) }).catch(() => {}); }
setExportDir(exportDir);
if (exDestEls.choose) exDestEls.choose.onclick = async () => {
  try { const r = await (await fetch('/api/pick-folder')).json(); if (r.path) setExportDir(r.path); }
  catch { toast('Could not open folder picker', true); }
};

el.exportBtn.onclick = () => openExport();
el.exCancel.onclick = el.exClose.onclick = () => el.exportModal.hidden = true;
$$('.tier', el.tiers).forEach((t) => t.onclick = () => { state.exportQuality = t.dataset.q; $$('.tier', el.tiers).forEach((x) => x.classList.toggle('on', x === t)); });
function openExport() {
  if (!state.cues.length) return toast('No captions to export yet.', true);
  el.exportModal.hidden = false; el.exError.hidden = true; el.exBarWrap.hidden = true;
  el.exMainActions.hidden = false; el.exDoneActions.hidden = true; el.exDest.hidden = false;
  el.exTitle.textContent = 'Export video';
  el.exSub.textContent = 'Captions are burned in; audio is kept untouched (except the share preset).';
}
el.exStart.onclick = async () => {
  el.exMainActions.hidden = true; el.exDest.hidden = true; el.exBarWrap.hidden = false; el.exBar.style.width = '0%';
  el.exTitle.textContent = 'Exporting…'; el.exSub.textContent = `Burning captions in and saving to ${prettyDir(exportDir)}.`;
  try {
    const res = await fetch(`/api/projects/${state.id}/export`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cues: state.cues, style: state.style, quality: state.exportQuality, outDir: exportDir }) });
    const data = await res.json(); if (!res.ok) throw new Error(data.error || 'Export failed');
    pollJob(data.jobId);
  } catch (err) { exErr(err.message); }
};
async function pollJob(jobId) {
  try {
    const j = await (await fetch(`/api/jobs/${jobId}`)).json();
    if (j.status === 'running') { el.exBar.style.width = `${Math.round((j.progress || 0) * 100)}%`; setTimeout(() => pollJob(jobId), 400); }
    else if (j.status === 'done') {
      el.exBar.style.width = '100%'; el.exBarWrap.hidden = true;
      lastSavedPath = j.savedPath || null;
      el.exTitle.textContent = 'Exported ✓';
      el.exSub.textContent = j.savedPath ? `Saved to ${j.savedPath}.` : 'Saved to your Downloads folder.';
      el.exDoneActions.hidden = false;
      toast(j.savedPath ? `Saved to ${j.savedPath}` : 'Saved to your Downloads folder');
    }
    else exErr(j.error || 'Export failed');
  } catch (err) { exErr(err.message); }
}
if (exDestEls.openFolder) exDestEls.openFolder.onclick = () => {
  if (lastSavedPath) fetch('/api/reveal?path=' + encodeURIComponent(lastSavedPath)).catch(() => {});
  el.exportModal.hidden = true;
};
function exErr(msg) { el.exTitle.textContent = 'Export failed'; el.exSub.textContent = ''; el.exBarWrap.hidden = true; el.exError.hidden = false; el.exError.textContent = msg; el.exDoneActions.hidden = false; }

/* ============================ utils ============================ */
function setStatus(html, err) { el.status.innerHTML = html; el.status.classList.toggle('err', !!err); }
var toastTimer; function toast(msg, err) { el.toast.textContent = msg; el.toast.hidden = false; el.toast.classList.toggle('err', !!err); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.toast.hidden = true, 3200); }

/* ============================ in-app dialog (replaces native confirm/prompt) */
const dlgEls = { back: document.getElementById('dlg'), title: document.getElementById('dlgTitle'), body: document.getElementById('dlgBody'), input: document.getElementById('dlgInput'), ok: document.getElementById('dlgOk'), cancel: document.getElementById('dlgCancel') };
function dialog(opts) {
  return new Promise((resolve) => {
    dlgEls.title.textContent = opts.title || 'Capto';
    dlgEls.body.textContent = opts.body || '';
    dlgEls.body.style.display = opts.body ? '' : 'none';
    const wantInput = typeof opts.input !== 'undefined';
    dlgEls.input.hidden = !wantInput;
    if (wantInput) { dlgEls.input.value = opts.input || ''; setTimeout(() => { dlgEls.input.focus(); dlgEls.input.select(); }, 30); }
    dlgEls.ok.textContent = opts.okLabel || (wantInput ? 'Save' : 'OK');
    dlgEls.cancel.textContent = opts.cancelLabel || 'Cancel';
    dlgEls.cancel.style.display = opts.noCancel ? 'none' : '';
    dlgEls.ok.classList.toggle('danger', !!opts.danger);
    dlgEls.back.hidden = false;
    const done = (val) => { dlgEls.back.hidden = true; cleanup(); resolve(val); };
    const onOk = () => done(wantInput ? dlgEls.input.value : true);
    const onCancel = () => done(wantInput ? null : false);
    const onKey = (e) => { if (e.key === 'Enter' && (!wantInput || e.target === dlgEls.input)) { e.preventDefault(); onOk(); } if (e.key === 'Escape') { e.preventDefault(); onCancel(); } };
    const onBack = (e) => { if (e.target === dlgEls.back) onCancel(); };
    function cleanup() { dlgEls.ok.removeEventListener('click', onOk); dlgEls.cancel.removeEventListener('click', onCancel); document.removeEventListener('keydown', onKey); dlgEls.back.removeEventListener('mousedown', onBack); }
    dlgEls.ok.addEventListener('click', onOk);
    dlgEls.cancel.addEventListener('click', onCancel);
    document.addEventListener('keydown', onKey);
    dlgEls.back.addEventListener('mousedown', onBack);
  });
}
window.confirm = (msg) => { console.warn('native confirm shimmed — prefer dialog()'); return false; };
window.prompt  = (msg, def) => { console.warn('native prompt shimmed — prefer dialog()');  return null;  };
async function confirmDialog(body, opts = {}) { return await dialog({ body, ...opts }); }
async function promptDialog(body, defaultText, opts = {}) { return await dialog({ body, input: defaultText || '', ...opts }); }

/* ============================ theme ============================ */
function applyTheme(t) {
  const sys = matchMedia('(prefers-color-scheme: light)').matches;
  const effective = t === 'system' ? (sys ? 'light' : 'dark') : t;
  document.body.classList.toggle('theme-light', effective === 'light');
  document.body.classList.toggle('theme-dark', effective !== 'light');
}
function getTheme() { return localStorage.getItem('subby-theme') || 'dark'; }
function setTheme(t) { localStorage.setItem('subby-theme', t); applyTheme(t); }
applyTheme(getTheme());
matchMedia('(prefers-color-scheme: light)').addEventListener?.('change', () => { if (getTheme() === 'system') applyTheme('system'); });

/* ============================ sidebar collapse ============================ */
const collapseBtn = document.getElementById('collapseBtn');
if (collapseBtn) {
  const restoreCollapsed = () => { if (localStorage.getItem('subby-panel-collapsed') === '1') document.body.classList.add('panel-collapsed'); collapseBtn.textContent = document.body.classList.contains('panel-collapsed') ? '‹' : '›'; };
  restoreCollapsed();
  collapseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const collapsed = document.body.classList.toggle('panel-collapsed');
    localStorage.setItem('subby-panel-collapsed', collapsed ? '1' : '0');
    collapseBtn.textContent = collapsed ? '‹' : '›';
    try { renderOverlay && renderOverlay(); renderTimeline && renderTimeline(); } catch {}
  });
}

/* ============================ settings tab bindings ============================ */
function syncThemeSeg() { const t = getTheme(); $$('button', el.setTheme).forEach((b) => b.classList.toggle('on', b.dataset.v === t)); }
if (el.setTheme) {
  syncThemeSeg();
  $$('button', el.setTheme).forEach((b) => b.onclick = () => { setTheme(b.dataset.v); syncThemeSeg(); });
  // Preview-caption-on-click toggle
  el.setPreviewClick.checked = state.previewOnClick;
  el.setPreviewClick.onchange = () => {
    state.previewOnClick = el.setPreviewClick.checked;
    localStorage.setItem('subby-preview-on-click', state.previewOnClick ? '1' : '0');
  };
}

el.homeSettings && (el.homeSettings.onclick = () => { hideHome(); el.uploadView.hidden = true; el.editor && (el.editor.style.display = ''); el.topActions.hidden = false; switchTab('settings'); });

if (el.saveKeys) {
  el.saveKeys.onclick = async () => {
    const body = {
      GROQ_API_KEY: el.setGroqKey.value.trim(),
      OPENAI_API_KEY: el.setOpenaiKey.value.trim(),
      CUSTOM_API_KEY: el.setCustomKey.value.trim(),
      CUSTOM_API_URL: el.setCustomUrl.value.trim(),
      CUSTOM_API_MODEL: el.setCustomModel.value.trim(),
    };
    try {
      const res = await fetch('/api/settings/keys', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      health.engines = data.engines || health.engines;
      populateSelectors();
      toast('Keys saved');
      // Clear inputs so the keys aren't shown in the UI after saving
      el.setGroqKey.value = ''; el.setOpenaiKey.value = ''; el.setCustomKey.value = '';
    } catch (err) { toast(err.message, true); }
  };
}
