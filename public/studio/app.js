'use strict';

/* ============================ constants ============================ */
const FONTS = [
  { family: 'Inter', label: 'Inter' }, { family: 'Anton', label: 'Anton' },
  { family: 'Archivo Black', label: 'Archivo Black' }, { family: 'Bebas Neue', label: 'Bebas Neue' },
  { family: 'Poppins', label: 'Poppins' }, { family: 'Lato', label: 'Lato' },
  { family: 'Luckiest Guy', label: 'Luckiest Guy' }, { family: 'Pacifico', label: 'Pacifico' },
];
const HAS_BOLD = new Set(['Inter', 'Poppins', 'Lato']);
const LANGUAGES = [
  { code: 'en', label: 'English' }, { code: 'lt', label: 'Lithuanian' },
  { code: '__sep', label: '──────────' }, { code: 'auto', label: 'Auto-detect' },
  { code: 'es', label: 'Spanish' }, { code: 'fr', label: 'French' }, { code: 'de', label: 'German' },
  { code: 'it', label: 'Italian' }, { code: 'pt', label: 'Portuguese' }, { code: 'nl', label: 'Dutch' },
  { code: 'pl', label: 'Polish' }, { code: 'ru', label: 'Russian' }, { code: 'uk', label: 'Ukrainian' },
  { code: 'lv', label: 'Latvian' }, { code: 'et', label: 'Estonian' }, { code: 'fi', label: 'Finnish' },
  { code: 'sv', label: 'Swedish' }, { code: 'no', label: 'Norwegian' }, { code: 'da', label: 'Danish' },
  { code: 'cs', label: 'Czech' }, { code: 'tr', label: 'Turkish' }, { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' }, { code: 'zh', label: 'Chinese' }, { code: 'ar', label: 'Arabic' },
];
const ENGINES = [
  { code: 'local', label: 'On your Mac — free, offline' },
  { code: 'groq', label: 'Groq — free online' },
  { code: 'openai', label: 'OpenAI — paid' },
];
const MODELS = [
  { code: 'tiny', label: 'Tiny — fastest' }, { code: 'base', label: 'Base' },
  { code: 'small', label: 'Small' }, { code: 'medium', label: 'Medium — accurate' },
  { code: 'large-v3', label: 'Large-v3 — best' },
];
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
  return s;
}
const optList = (items, sel) => items.map((i) => i.code === '__sep' ? `<option disabled>${i.label}</option>` : `<option value="${i.code}"${i.code === sel ? ' selected' : ''}>${i.label}</option>`).join('');

/* ============================ state ============================ */
const state = {
  id: null, meta: null, originalName: '', cues: [], style: null,
  language: 'en', engine: 'local', model: 'small',
  rows: 1, capRow: 0, scriptRow: 0,
  activeCue: -1, selCue: -1, duration: 0, zoom: 1,
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
  state.engine = health.engines[health.defaultEngine] ? health.defaultEngine : 'local';
  state.model = health.defaultModel || 'small';
  populateSelectors();
  applyPanelWidth();
  // Start on the home view (project library). The user picks an existing
  // project or hits "New video" to upload.
  showHome();
}
function engineOptions(sel) {
  return ENGINES.map((e) => { const ok = health.engines[e.code]; return `<option value="${e.code}"${e.code === sel ? ' selected' : ''}${ok ? '' : ' disabled'}>${ok ? e.label : e.label + ' (needs key)'}</option>`; }).join('');
}
function populateSelectors() {
  [el.uploadEngine, el.setEngine, el.editEngine, el.homeEngine].forEach((s) => s.innerHTML = engineOptions(state.engine));
  [el.uploadLang, el.setLang, el.editLang, el.homeLang].forEach((s) => s.innerHTML = optList(LANGUAGES, state.language));
  [el.uploadModel, el.setModel, el.editModel, el.homeModel].forEach((s) => s.innerHTML = optList(MODELS, state.model));
  syncSelectors();
  const need = []; if (!health.engines.groq) need.push('GROQ_API_KEY'); if (!health.engines.openai) need.push('OPENAI_API_KEY');
  el.engineHint.textContent = need.length ? 'Add ' + need.join(' / ') + ' in .env to enable more engines.' : 'All engines ready.';
  el.uploadHint.textContent = state.engine === 'local' ? 'Tip: Groq (free online) or a bigger model = better quality.' : 'Online engine selected.';
}
function syncSelectors() {
  [el.uploadEngine, el.setEngine, el.editEngine, el.homeEngine].forEach((s) => s.value = state.engine);
  [el.uploadLang, el.setLang, el.editLang, el.homeLang].forEach((s) => s.value = state.language);
  [el.uploadModel, el.setModel, el.editModel, el.homeModel].forEach((s) => s.value = state.model);
  const local = state.engine === 'local';
  el.uploadModelField.hidden = !local; el.setModelField.hidden = !local; el.editModel.hidden = !local;
  if (el.homeModelField) el.homeModelField.hidden = !local;
}
function bindSel(elem, key) { elem.addEventListener('change', () => { state[key] = elem.value; syncSelectors(); if (key === 'engine') populateSelectors(); }); }
[['uploadEngine','engine'],['setEngine','engine'],['editEngine','engine'],['homeEngine','engine'],
 ['uploadLang','language'],['setLang','language'],['editLang','language'],['homeLang','language'],
 ['uploadModel','model'],['setModel','model'],['editModel','model'],['homeModel','model']].forEach(([id, k]) => bindSel(el[id], k));

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

async function transcribeProject() {
  const lang = (LANGUAGES.find((l) => l.code === state.language) || {}).label || 'audio';
  setStatus(`<span class="spinner"></span> Transcribing ${lang}… (first local run downloads the model)`);
  el.cues.innerHTML = '<div class="cue-empty"><span class="spinner"></span><br>Generating captions…</div>';
  el.retranscribeBtn.disabled = true;
  try {
    const res = await fetch(`/api/projects/${state.id}/transcribe`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ language: state.language, engine: state.engine, model: state.model }) });
    const data = await res.json(); if (!res.ok) throw new Error(data.error || 'Transcription failed');
    state.cues = data.cues.map((c) => ({ row: 0, ...c }));
    // Push any overlapping cues to fresh rows (engine occasionally emits two cues
    // covering the same window — we never want them stacked on the same row).
    state.rows = distributeRows(state.cues);
    state.capRow = 0; state.scriptRow = 0;
    fixOverlaps();
    setStatus(`Done — ${data.cues.length} captions${data.language ? ` (${data.language})` : ''}.`);
    renderAll(); renderScript();
  } catch (err) { setStatus(err.message, true); el.cues.innerHTML = `<div class="cue-empty">⚠️ ${escapeHtml(err.message)}</div>`; }
  finally { el.retranscribeBtn.disabled = false; }
}
el.retranscribeBtn.onclick = async () => { if (state.cues.length && !(await confirmDialog('Re-transcribe from audio? This replaces the current captions.', { okLabel: 'Re-transcribe' }))) return; transcribeProject(); };
// (the old topbar "New" button was removed — back chevron handles going home)

/* ============================ cue model ============================ */
function ensureRows() { const mx = state.cues.reduce((m, c) => Math.max(m, c.row || 0), 0); state.rows = Math.max(1, mx + 1, state.rows); }
function cuesInRow(r) { return state.cues.map((c, i) => ({ c, i })).filter((x) => (x.c.row || 0) === r).sort((a, b) => a.c.start - b.c.start); }
function redistributeWords(cue) {
  const toks = cue.text.split(/\s+/).filter(Boolean); const span = Math.max(0.001, cue.end - cue.start), per = span / Math.max(1, toks.length);
  cue.words = toks.map((w, k) => ({ word: w, start: cue.start + k * per, end: cue.start + (k + 1) * per }));
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
function distributeRows(cues) {
  const rowEnds = [];  // rowEnds[r] = the last "end" timestamp on that row
  const sorted = cues.map((c, i) => ({ c, i })).sort((a, b) => a.c.start - b.c.start);
  for (const { c } of sorted) {
    let placed = -1;
    for (let r = 0; r < rowEnds.length; r++) {
      if (c.start >= rowEnds[r] - 1e-3) { placed = r; break; }
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
      if (c.start < cursor) c.start = cursor;
      if (c.end < c.start + MIN_DUR) c.end = c.start + MIN_DUR;
      if (c.end > state.duration) c.end = state.duration;
      if (c.start >= c.end) c.start = Math.max(0, c.end - MIN_DUR);
      cursor = c.end + OVERLAP_EPS;
      if (c.words && c.words.length) redistributeWords(c);
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
function clearCueSel() { state.selectedSet.clear(); state.selAnchor = -1; state.selCue = -1; paintSelected(); }
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
  state.selectedSet.clear(); state.selectedSet.add(i); state.selAnchor = i; state.selCue = i; paintSelected();
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
  if (act === 'del') { state.cues.splice(i, 1); if (state.selCue === i) state.selCue = -1; ensureRows(); renderAll(); renderScript(); saveSoon(); }
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
// Use a function so it's hoisted — no chance of TDZ from any caller.
function builtinPresets() { return {
  'Clean':    { fontFamily: 'Inter', bold: true,  caseMode: 'sentence', outlineWidth: 0,    shadowEnabled: true,  shadowColor: '#000000', shadowOpacity: 55, shadowDistance: 0,    shadowBlur: 0.08, highlightEnabled: false, letterSpacingPct: -6 },
  'Bold Pop': { fontFamily: 'Inter', bold: true,  caseMode: 'upper',    outlineWidth: 0,    shadowEnabled: true,  shadowColor: '#000000', shadowOpacity: 70, shadowDistance: 0.06, shadowBlur: 0.05, highlightEnabled: true, highlightColor: '#FFE36E', highlightScale: 112, letterSpacingPct: -3 },
  'Outline':  { fontFamily: 'Anton', bold: false, caseMode: 'upper',    outlineWidth: 0.05, outlineColor: '#000000', shadowEnabled: false, highlightEnabled: false, letterSpacingPct: 0 },
  'Subtle':   { fontFamily: 'Inter', bold: true,  caseMode: 'sentence', outlineWidth: 0,    shadowEnabled: true,  shadowColor: '#000000', shadowOpacity: 40, shadowDistance: 0.03, shadowBlur: 0.06, highlightEnabled: false, letterSpacingPct: -5 },
  'Hormozi':  { fontFamily: 'Archivo Black', bold: false, caseMode: 'upper', outlineWidth: 0.02, outlineColor: '#000000', shadowEnabled: true, shadowColor: '#000000', shadowOpacity: 70, shadowDistance: 0.05, shadowBlur: 0.04, highlightEnabled: true, highlightColor: '#FFE36E', highlightScale: 112, letterSpacingPct: -2 },
  'Karaoke':  { fontFamily: 'Poppins', bold: true, caseMode: 'upper', outlineWidth: 0, shadowEnabled: true, shadowColor: '#000000', shadowOpacity: 60, shadowDistance: 0.03, shadowBlur: 0.05, highlightEnabled: true, highlightColor: '#82A5FF', highlightScale: 108, letterSpacingPct: -2 },
  'Neon':     { fontFamily: 'Bebas Neue', bold: false, caseMode: 'upper', outlineWidth: 0, shadowEnabled: true, shadowColor: '#62D8FF', shadowOpacity: 85, shadowDistance: 0, shadowBlur: 0.14, highlightEnabled: true, highlightColor: '#62D8FF', highlightScale: 106, letterSpacingPct: 1 },
  'Beasty':   { fontFamily: 'Anton', bold: false, caseMode: 'upper', outlineWidth: 0.035, outlineColor: '#000000', shadowEnabled: true, shadowColor: '#000000', shadowOpacity: 75, shadowDistance: 0.05, shadowBlur: 0.03, highlightEnabled: true, highlightColor: '#46D39A', highlightScale: 116, letterSpacingPct: -1 },
}; }
function customPresets() { try { return JSON.parse(localStorage.getItem('subby-presets') || '{}'); } catch { return {}; } }
function saveCustomPresets(p) { localStorage.setItem('subby-presets', JSON.stringify(p)); }

function renderStylePanel() {
  const s = state.style;
  $('#tab-style').innerHTML = `
    <div class="section">
      <p class="sec-title">Presets</p>
      <div class="chips" id="preset-chips"></div>
      <div style="display:flex; gap:6px; margin-top:9px">
        <button class="btn ghost sm" id="savePreset">＋ Save preset</button>
        <button class="btn ghost sm" id="resetDefault" title="Forget the saved default style — fresh videos will use Capto's built-in defaults again">⟲ Reset default</button>
      </div>
      <p class="hint-line">Your current style is auto‑saved and applied to every new video. Click a preset to switch instantly.</p>
    </div>
    <div class="section">
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
        <div class="row2" style="margin-top:10px">
          <div class="field"><label>Highlight color</label><input type="color" id="st-hlcolor"></div>
          <div class="field"><label>Pop <span class="val" id="v-hls"></span></label><input type="range" id="st-hls" min="100" max="150"></div>
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
    </div>
    <div class="section">
      <p class="sec-title">Position</p>
      <div class="chips"><div class="chip" data-y="0.12">Top</div><div class="chip" data-y="0.5">Middle</div><div class="chip" data-y="0.82">Bottom</div></div>
      <p class="hint-line">Drag the caption on the video to place it freely. Drag its corners to resize. Double‑click to edit text.</p>
    </div>`;

  $('#st-font').value = s.fontFamily; $('#st-font').onchange = () => { s.fontFamily = $('#st-font').value; afterStyle(); };
  $('#st-size').max = Math.round((state.meta.height || 1920) * 0.18);
  rng('#st-size', 'fontSize', '#v-size', (v) => `${(Math.round(v * 100) / 100)}px`);
  rng('#st-ls', 'letterSpacing', '#v-ls', (v) => `${v}px`);
  rng('#st-lh', 'lineHeight', '#v-lh', (v) => `${(Math.round(v * 100) / 100)}`);
  rng('#st-shop', 'shadowOpacity', '#v-shop', (v) => `${Math.round(v)}%`);
  rng('#st-shd', 'shadowDistance', '#v-shd', (v) => `${v}px`);
  rng('#st-shb', 'shadowBlur', '#v-shb', (v) => `${v}px`);
  rng('#st-ow', 'outlineWidth', '#v-ow', (v) => `${v}px`);
  rng('#st-hls', 'highlightScale', '#v-hls', (v) => `${Math.round(v)}%`);
  col('#st-color', 'primaryColor'); col('#st-shcolor', 'shadowColor'); col('#st-ocolor', 'outlineColor'); col('#st-hlcolor', 'highlightColor');
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
  const hlSeg = $('#st-hl'); const syncHl = () => { $$('button', hlSeg).forEach((b) => b.classList.toggle('on', (b.dataset.h === 'on') === !!s.highlightEnabled)); $('#hlAdv').style.maxHeight = s.highlightEnabled ? '120px' : '0px'; };
  $$('button', hlSeg).forEach((b) => b.onclick = () => { s.highlightEnabled = b.dataset.h === 'on'; syncHl(); afterStyle(); }); syncHl();
  // position chips
  $$('#tab-style .chips .chip[data-y]').forEach((c) => c.onclick = () => { s.posX = 0.5; s.posY = parseFloat(c.dataset.y); afterStyle(); });
  // Animation controls
  seg('#st-entrance', 'entrance', 'v');
  seg('#st-exit', 'exit', 'v');
  rng('#st-animms', 'animMs', '#v-animms', (v) => `${Math.round(v)}ms`);

  refreshShadowInputs();
  renderPresetChips();
  $('#savePreset').onclick = async () => { const name = await promptDialog('Save current style as preset', ''); if (!name) return; const p = customPresets(); p[name] = snapshotStyle(); saveCustomPresets(p); renderPresetChips(); toast('Preset saved'); };
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
function renderPresetChips() {
  const wrap = $('#preset-chips'); if (!wrap) return;
  const custom = customPresets();
  wrap.innerHTML = Object.keys(builtinPresets()).map((n) => `<div class="chip preset" data-preset="${n}">${n}</div>`).join('')
    + Object.keys(custom).map((n) => `<div class="chip preset" data-cpreset="${n}">${n}<span class="x" data-delpreset="${n}">✕</span></div>`).join('');
  $$('[data-preset]', wrap).forEach((c) => c.onclick = () => applyPreset(builtinPresets()[c.dataset.preset]));
  $$('[data-cpreset]', wrap).forEach((c) => c.onclick = (e) => { if (e.target.dataset.delpreset) { const p = customPresets(); delete p[e.target.dataset.delpreset]; saveCustomPresets(p); renderPresetChips(); return; } applyPreset(custom[c.dataset.cpreset]); });
}
function applyPreset(p) {
  const s = state.style, H = state.meta.height;
  Object.assign(s, p);
  if ('bold' in p) s.weight = p.bold ? 700 : 400; // presets still describe bold; map to numeric weight
  if (p.letterSpacingPct != null) s.letterSpacing = Math.round(s.fontSize * p.letterSpacingPct / 100);
  if (p.outlineWidth != null && p.outlineWidth <= 1) s.outlineWidth = Math.round(p.outlineWidth * H);
  if (p.shadowDistance != null && p.shadowDistance <= 1) s.shadowDistance = Math.round(p.shadowDistance * H);
  if (p.shadowBlur != null && p.shadowBlur <= 1) s.shadowBlur = Math.round(p.shadowBlur * H);
  renderStylePanel(); afterStyle();
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
  $$('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === name));
  ['captions', 'script', 'style', 'settings'].forEach((n) => $('#tab-' + n).hidden = n !== name);
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
  return `${cue.id}|${s.fontFamily}|${s.fontSize}|${styleWeight(s)}|${s.italic}|${s.letterSpacing}|${s.lineHeight}|${s.outlineWidth}|${s.outlineColor}|${s.shadowEnabled}|${s.shadowColor}|${s.shadowOpacity}|${s.shadowDistance}|${s.shadowBlur}|${s.primaryColor}|${s.posX}|${s.posY}|${cue.row||0}|${el.frame.clientWidth}|${el.frame.clientHeight}`;
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
  block.style.lineHeight = (typeof s.lineHeight === 'number' ? s.lineHeight : 1.12);
  block.style.color = s.primaryColor;
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
// Per-frame: only mutate spans when the active word actually changes.
function paintActiveWord(block, cue, t) {
  const s = state.style;
  const words = (cue.words && cue.words.length) ? cue.words : [{ word: cue.text, start: cue.start, end: cue.end }];
  let aw = -1; for (let k = 0; k < words.length; k++) if (t >= words[k].start) aw = k;
  const sig = `${aw}|${s.highlightEnabled}|${s.highlightColor}|${s.highlightScale}`;
  if (block.dataset.awsig === sig) return; // no change — no DOM mutation
  block.dataset.awsig = sig;
  const spans = block.children;
  for (let k = 0; k < spans.length; k++) {
    const on = s.highlightEnabled && k === aw;
    spans[k].style.color = on ? s.highlightColor : '';
    spans[k].style.transform = on && s.highlightScale !== 100 ? `scale(${s.highlightScale / 100})` : '';
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
  // Remove any prior scale so we measure the natural width
  block.style.transform = 'translate(-50%, -50%)';
  const fw = el.frame.clientWidth;
  const bw = block.offsetWidth;
  if (bw <= fw * 0.95) return; // fits — no scaling
  const scale = Math.max(0.5, (fw * 0.92) / bw);
  block.style.transform = `translate(-50%, -50%) scale(${scale.toFixed(3)})`;
}
function doRenderOverlay() {
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
  // The block uses transform:translate(-50%,-50%) with left/top in px relative to .frame.
  // The sel box does the same, so we mirror left/top exactly + measure the rendered size.
  el.capSel.style.left = block.style.left;
  el.capSel.style.top = block.style.top;
  el.capSel.style.width = block.offsetWidth + 'px';
  el.capSel.style.height = block.offsetHeight + 'px';
  el.capSel.classList.add('on');
}

/* caption drag / select / resize / inline-edit (delegated on frame) */
el.frame.addEventListener('pointerdown', (e) => {
  const block = e.target.closest('.cap-block'); if (!block || state.editingCaption) return;
  e.preventDefault(); e.stopPropagation();
  const i = state.cues.findIndex((c) => c.id === block.dataset.cue);
  if (i < 0) return;
  state.selCue = i; positionSelBox();
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
  const up = () => { document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up); if (moved) afterStyle(); else { highlightActive(); positionSelBox(); } };
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
    const up = () => { document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up); afterStyle(); };
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
  const up = () => { document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up); refreshSizeInput(); afterStyle(); };
  document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up);
}));
function refreshSizeInput() { const i = $('#st-size'); if (i) { i.value = state.style.fontSize; const v = $('#v-size'); if (v) v.textContent = (Math.round(state.style.fontSize * 100) / 100) + 'px'; } }
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
      const rowH = 44; // matches CSS .tl-row height
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
if (scriptOneWordBtn) scriptOneWordBtn.onclick = () => {
  scriptSegs = []; scriptSel = null;
  for (let k = 0; k < scriptWords.length; k++) scriptSegs.push({ from: k, to: k, text: scriptWords[k].word });
  renderScriptSegs(); highlightScript();
  toast(`${scriptSegs.length} segments — one per word. Hit Rewrite to apply.`);
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
const TL_MIN = 100, TL_MAX_FACTOR = 0.65;   // up to 65% of window height
function applyTlHeight(px) {
  const max = Math.max(TL_MIN + 50, Math.round(window.innerHeight * TL_MAX_FACTOR));
  const h = clamp(px, TL_MIN, max);
  document.documentElement.style.setProperty('--tl-h', h + 'px');
  // Row height scales modestly with timeline height — bigger timeline → fatter
  // rows (max ~76px), so you get more readable blocks when expanded.
  const rowH = clamp(56 + Math.round((h - 188) * 0.10), 56, 76);
  document.documentElement.style.setProperty('--tl-row-h', rowH + 'px');
  localStorage.setItem('subby-tl-h', String(h));
}
applyTlHeight(+localStorage.getItem('subby-tl-h') || 188);   // ~3 rows by default
el.tlResize.addEventListener('pointerdown', (e) => {
  e.preventDefault(); el.tlResize.classList.add('active');
  const startY = e.clientY, startH = el.timeline.getBoundingClientRect().height;
  const mv = (ev) => applyTlHeight(startH + (startY - ev.clientY));   // drag UP grows
  const up = () => { el.tlResize.classList.remove('active'); document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up); };
  document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up);
});
window.addEventListener('resize', () => applyTlHeight(+localStorage.getItem('subby-tl-h') || 188));

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
var saveTimer = null;
function saveSoon() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { fetch(`/api/projects/${state.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cues: state.cues, style: state.style }) }).catch(() => {}); }, 450);
  pushHistory();
}

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
    el.projectName.classList.add('editing');
    el.projectName.contentEditable = 'plaintext-only';
    el.projectName.textContent = orig;
    el.projectName.focus();
    // Select the whole name (minus extension if there is one)
    const r = document.createRange(); r.selectNodeContents(el.projectName);
    const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
    const commit = async () => {
      el.projectName.contentEditable = 'false';
      el.projectName.classList.remove('editing');
      const name = (el.projectName.textContent || '').replace(/[\r\n]+/g, ' ').trim().slice(0, 200);
      if (!name) { el.projectName.textContent = orig; return; }
      if (name === orig) { el.projectName.textContent = orig; return; }
      state.originalName = name;
      el.projectName.textContent = name;
      try {
        await fetch(`/api/projects/${state.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
        toast('Renamed');
      } catch { toast('Rename failed', true); el.projectName.textContent = orig; state.originalName = orig; }
    };
    el.projectName.addEventListener('blur', commit, { once: true });
    // Enter = save instantly (never a new line). Esc = cancel. (No { once } — must
    // catch Enter even after the user has typed other keys first.)
    const onKey = (ev) => {
      if (ev.key === 'Enter') { ev.preventDefault(); el.projectName.removeEventListener('keydown', onKey); el.projectName.blur(); }
      else if (ev.key === 'Escape') { ev.preventDefault(); el.projectName.removeEventListener('keydown', onKey); el.projectName.textContent = orig; el.projectName.blur(); }
    };
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
      el.exSub.textContent = j.savedPath ? `Saved to ${prettyDir(j.savedPath)}` : 'Your captioned video is ready.';
      el.exDoneActions.hidden = false;
      toast('Video exported');
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
