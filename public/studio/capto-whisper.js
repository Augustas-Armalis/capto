'use strict';
/*
 * Capto Local engine — manager for the in-browser Whisper Web Worker.
 * Exposes window.__captoLocalWhisper used by capto-bridge.js. Everything here is
 * best-effort: if the device/browser can't run it, callers fall back to Groq.
 */
(function () {
  const MODELS = {
    base: 'Xenova/whisper-base',                       // ~145MB, fast, lighter accuracy
    small: 'Xenova/whisper-small',                     // ~480MB, balanced
    turbo: 'onnx-community/whisper-large-v3-turbo',     // ~1.5GB, best accuracy (needs WebGPU)
  };
  const TIER_LABEL = { base: 'Fast', small: 'Balanced', turbo: 'Best' };

  const ua = navigator.userAgent || '';
  const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(ua);
  const hasGPU = !!navigator.gpu;
  const mem = navigator.deviceMemory || 4;   // GB (coarse; Safari/FF report undefined → 4)

  // Can this device reasonably run a local model at all?
  function available() {
    if (isMobile) return false;                 // phones → Groq (too slow / RAM)
    if (hasGPU) return true;                     // WebGPU desktop → great
    return mem >= 8;                             // CPU/WASM only worth it with decent RAM
  }

  // "Auto" model pick — a STABLE quality the device can comfortably handle.
  // Note: we deliberately never auto-pick 'turbo' (1.5GB) — it OOM-crashes many
  // GPUs. 'small' is the sweet spot; 'base' for lighter machines. Turbo stays
  // available only if a power user opts into it explicitly.
  function pickAuto() {
    if (!available()) return null;
    if (hasGPU) return 'small';
    return mem >= 16 ? 'small' : 'base';
  }

  function resolveModel(tier) {
    if (tier === 'auto' || !tier) tier = pickAuto() || 'base';
    return { id: MODELS[tier] || MODELS.base, tier };
  }

  let worker = null;
  function getWorker() {
    if (worker) return worker;
    // Same-origin ES-module worker (imports Transformers.js from a CDN inside).
    worker = new Worker('/studio/capto-whisper-worker.js', { type: 'module' });
    return worker;
  }
  function resetWorker() { try { worker && worker.terminate(); } catch {} worker = null; }

  // Run one transcription. samples = Float32Array @16kHz mono. Returns
  // { words:[{word,start,end}], text, model } or throws (caller falls back).
  function transcribe(samples, opts) {
    opts = opts || {};
    const { id, tier } = resolveModel(opts.model);
    const onProgress = typeof opts.onProgress === 'function' ? opts.onProgress : function () {};
    return new Promise((resolve, reject) => {
      let settled = false;
      const w = getWorker();
      // Generous watchdog: a cold model download + CPU inference can be slow, but
      // if nothing happens at all, bail so the caller can use Groq.
      let timer = setTimeout(() => { if (!settled) { settled = true; cleanup(); resetWorker(); reject(new Error('Local engine timed out.')); } }, 8 * 60 * 1000);
      function bump() { clearTimeout(timer); timer = setTimeout(() => { if (!settled) { settled = true; cleanup(); resetWorker(); reject(new Error('Local engine stalled.')); } }, 4 * 60 * 1000); }
      function cleanup() { w.removeEventListener('message', onMsg); w.removeEventListener('error', onErr); clearTimeout(timer); }
      function onMsg(e) {
        const d = e.data || {};
        if (d.type === 'download') { onProgress({ phase: 'download', file: d.data && d.data.file, progress: d.data && d.data.progress, tier }); bump(); }
        else if (d.type === 'status') { onProgress({ phase: d.status, tier }); bump(); }
        else if (d.type === 'result') { if (settled) return; settled = true; cleanup(); resolve({ words: d.words || [], text: d.text || '', model: id, tier, device: d.device }); }
        else if (d.type === 'error') { if (settled) return; settled = true; cleanup(); reject(new Error(d.error || 'Local engine error.')); }
      }
      function onErr(err) { if (settled) return; settled = true; cleanup(); resetWorker(); reject(new Error((err && err.message) || 'Local engine failed to load.')); }
      w.addEventListener('message', onMsg);
      w.addEventListener('error', onErr);
      onProgress({ phase: 'starting', tier });
      // Transfer the audio buffer (zero-copy) to the worker.
      try { w.postMessage({ type: 'run', model: id, audio: samples, language: opts.language || 'auto' }, [samples.buffer]); }
      catch (e) { settled = true; cleanup(); reject(e); }
    });
  }

  window.__captoLocalWhisper = { available, pickAuto, resolveModel, transcribe, MODELS, TIER_LABEL };
})();
