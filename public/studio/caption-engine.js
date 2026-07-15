'use strict';

/*
 * Capto Caption Engine v3
 *
 * Turns provider word timestamps into deterministic, non-overlapping caption
 * cues. The engine is intentionally dependency-free so the exact same code can
 * run in the browser editor and in Node regression tests.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.CaptoCaptionEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const VERSION = 3;
  const MIN_WORD = 0.045;
  const EPS = 0.001;

  const TERMINAL_RE = /[.!?…]["'’”\)\]]?$/u;
  const CLAUSE_RE = /[,;:—–]["'’”\)\]]?$/u;

  // Ending a card on these words is hard to read because the grammatical unit
  // is incomplete. Lithuanian is first-class here rather than falling through
  // to English-centric punctuation rules.
  const DANGLING = {
    en: new Set([
      'a', 'an', 'the', 'and', 'or', 'but', 'so', 'because', 'if', 'when',
      'while', 'that', 'which', 'who', 'to', 'of', 'in', 'on', 'at', 'for',
      'from', 'with', 'without', 'by', 'as', 'than', 'into', 'about', 'over',
    ]),
    lt: new Set([
      'ir', 'ar', 'bei', 'bet', 'o', 'kad', 'jog', 'nes', 'kai', 'jei',
      'jeigu', 'nors', 'kol', 'kur', 'kaip', 'todėl', 'tačiau', 'arba', 'su',
      'be', 'į', 'iš', 'ant', 'už', 'prie', 'per', 'nuo', 'dėl', 'pagal',
    ]),
  };

  const LEADING = {
    en: new Set(['and', 'or', 'but', 'so', 'because', 'however', 'therefore']),
    lt: new Set(['ir', 'ar', 'bet', 'o', 'nes', 'todėl', 'tačiau', 'arba']),
  };

  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
  function finite(v, fallback) { v = Number(v); return Number.isFinite(v) ? v : fallback; }
  function lexical(word) {
    return String(word || '').toLocaleLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
  }
  function terminal(word) { return TERMINAL_RE.test(String(word || '').trim()); }
  function clause(word) { return CLAUSE_RE.test(String(word || '').trim()); }

  function languageBase(language) {
    const base = String(language || 'en').toLocaleLowerCase().split(/[-_]/)[0];
    return base === 'lt' || base.startsWith('lith') ? 'lt' : 'en';
  }

  /** Repair malformed/overlapping provider timings without inventing equal timing. */
  function normalizeWords(input, opts) {
    opts = opts || {};
    const duration = Number.isFinite(opts.duration) ? Math.max(0, opts.duration) : Infinity;
    const raw = [];
    let fallback = 0;
    for (let i = 0; i < (input || []).length; i++) {
      const source = input[i] || {};
      const word = String(source.word == null ? source.text || '' : source.word).trim();
      if (!word) continue;
      let start = Math.max(0, finite(source.start, fallback));
      let end = finite(source.end, start + MIN_WORD);
      if (Number.isFinite(duration)) start = Math.min(start, duration);
      end = Math.max(start + MIN_WORD, end);
      if (Number.isFinite(duration)) end = Math.min(end, duration);
      if (end <= start) continue;
      raw.push({ word, start, end, _order: i });
      fallback = end;
    }
    raw.sort((a, b) => a.start - b.start || a._order - b._order);

    const out = [];
    for (const w of raw) {
      const prev = out[out.length - 1];
      // Provider retries occasionally duplicate the same token/timestamp.
      if (prev && lexical(prev.word) === lexical(w.word) && Math.abs(prev.start - w.start) < 0.025) continue;
      if (prev && w.start < prev.start + 0.012) w.start = prev.start + 0.012;
      if (w.end < w.start + MIN_WORD) w.end = w.start + MIN_WORD;
      if (Number.isFinite(duration) && w.end > duration) w.end = duration;
      if (w.end <= w.start) continue;
      delete w._order;
      out.push(w);
    }

    // A word display is controlled by the next onset; cap clearly stretched
    // end timestamps so a provider cannot make a token occupy a long pause.
    for (let i = 0; i + 1 < out.length; i++) {
      const nextStart = out[i + 1].start;
      if (out[i].end > nextStart + 0.08) out[i].end = Math.max(out[i].start + MIN_WORD, nextStart);
    }
    return out;
  }

  /** Use audio-energy silence intervals to correct STT words stretched into pauses. */
  function snapWordsToSilence(words, silences) {
    if (!silences || !silences.length) return words;
    let si = 0;
    for (const w of words) {
      while (si < silences.length && silences[si].end <= w.start + EPS) si++;
      for (let k = si; k < silences.length && silences[k].start < w.end - EPS; k++) {
        const s = silences[k];
        if (s.start > w.start + MIN_WORD && s.start < w.end) w.end = s.start;
        if (s.start <= w.start && s.end > w.start + MIN_WORD && s.end < w.end) w.start = s.end;
      }
      if (w.end < w.start + MIN_WORD) w.end = w.start + MIN_WORD;
    }
    return words;
  }

  function crossesHardBoundary(words, from, to, hardGap) {
    for (let i = from; i < to; i++) {
      if (terminal(words[i].word)) return true;
      if (words[i + 1].start - words[i].end >= hardGap) return true;
    }
    return false;
  }

  function segmentCost(words, from, to, opts) {
    const count = to - from + 1;
    const first = words[from];
    const last = words[to];
    const text = words.slice(from, to + 1).map((w) => w.word).join(' ');
    const duration = last.end - first.start;
    const lang = languageBase(opts.language);
    const dangling = DANGLING[lang];
    const leading = LEADING[lang];

    let cost = 0;
    // Prefer 2–3 word cards. Single-word cards remain valid for punchy speech,
    // terminal words, pauses, and genuinely long individual words.
    if (count === 1) cost += 2.7;
    else if (count === 2) cost += 0.35;
    if (text.length > opts.maxChars) cost += 50 + (text.length - opts.maxChars) * 4;
    if (duration > opts.maxDuration) cost += 30 + (duration - opts.maxDuration) * 12;

    const lastLex = lexical(last.word);
    const firstLex = lexical(first.word);
    if (dangling.has(lastLex) && to < words.length - 1) cost += 10;
    if (leading.has(firstLex) && from > 0 && !terminal(words[from - 1].word)) cost += 1.4;

    const next = words[to + 1];
    if (!next) cost -= 2;
    else {
      const gap = Math.max(0, next.start - last.end);
      if (terminal(last.word)) cost -= 9;
      else if (clause(last.word)) cost -= 5;
      else if (gap >= opts.hardGap) cost -= 8;
      else if (gap >= opts.softGap) cost -= 3.5;
      // A break after the first half of a quick 3-word phrase is usually worse
      // than keeping the complete phrase on one card.
      else if (count === 1) cost += 1.4;
    }

    // Avoid a one-word orphan immediately after this card when both fit.
    if (words.length - (to + 1) === 1 && count > 1 && !terminal(last.word)) cost += 3;
    return cost;
  }

  /** Dynamic-programming phrase segmentation; deterministic for identical input. */
  function phraseGroups(words, opts) {
    const n = words.length;
    const dp = new Array(n + 1).fill(Infinity);
    const prev = new Array(n + 1).fill(-1);
    dp[0] = 0;
    for (let end = 1; end <= n; end++) {
      for (let count = 1; count <= opts.maxWords && count <= end; count++) {
        const from = end - count;
        const to = end - 1;
        if (crossesHardBoundary(words, from, to, opts.hardGap)) continue;
        const c = dp[from] + segmentCost(words, from, to, opts);
        if (c < dp[end]) { dp[end] = c; prev[end] = from; }
      }
      // Safety fallback for impossible provider data.
      if (prev[end] < 0) { prev[end] = end - 1; dp[end] = dp[end - 1] + 4; }
    }
    const groups = [];
    for (let cursor = n; cursor > 0;) {
      const from = prev[cursor];
      groups.push(words.slice(from, cursor));
      cursor = from;
    }
    return groups.reverse();
  }

  function cueTiming(groups, opts) {
    const cues = [];
    let previousEnd = 0;
    for (let i = 0; i < groups.length; i++) {
      const ws = groups[i];
      const first = ws[0];
      const last = ws[ws.length - 1];
      const next = groups[i + 1] && groups[i + 1][0];
      const leadIn = clamp(opts.leadIn, 0, Math.max(0, first.start - previousEnd));
      let start = Math.max(previousEnd, first.start - leadIn, 0);
      let end;
      if (next) {
        const gap = Math.max(0, next.start - last.end);
        if (gap <= opts.hideGap) {
          // Exact handoff eliminates flicker during continuous speech.
          end = Math.max(last.end, next.start - Math.min(opts.leadIn, gap * 0.45));
        } else {
          end = last.end + Math.min(opts.leadOut, gap * 0.25);
        }
      } else {
        end = last.end + opts.leadOut;
      }
      if (Number.isFinite(opts.duration)) end = Math.min(end, opts.duration);
      end = Math.max(start + opts.minCueDuration, end);
      if (next) end = Math.min(end, Math.max(start + opts.minCueDuration, next.start));
      if (end <= start) end = start + opts.minCueDuration;

      cues.push({
        id: `c${i}`,
        start,
        end,
        text: ws.map((w) => w.word).join(' ').replace(/\s+/g, ' ').trim(),
        words: ws.map((w) => ({ word: w.word, start: w.start, end: w.end })),
        _engineVersion: VERSION,
      });
      previousEnd = end;
    }
    return cues;
  }

  function wordsToCues(input, options) {
    options = options || {};
    const strictOneWord = options.oneWord === true || Number(options.maxWords) === 1;
    const opts = {
      language: options.language || 'en',
      duration: Number.isFinite(options.duration) ? Math.max(0, options.duration) : Infinity,
      maxWords: strictOneWord ? 1 : clamp(Math.round(finite(options.maxWords, 3)), 1, 5),
      maxChars: clamp(Math.round(finite(options.maxChars, 28)), 10, 60),
      maxDuration: clamp(finite(options.maxDuration, 2.15), 0.5, 5),
      softGap: clamp(finite(options.softGap, 0.2), 0.08, 0.8),
      hardGap: clamp(finite(options.hardGap, 0.48), 0.2, 1.5),
      hideGap: clamp(finite(options.hideGap, 0.42), 0.2, 1.5),
      leadIn: clamp(finite(options.leadIn, 0.065), 0, 0.25),
      leadOut: clamp(finite(options.leadOut, 0.09), 0, 0.4),
      minCueDuration: clamp(finite(options.minCueDuration, strictOneWord ? 0.07 : 0.12), 0.04, 0.5),
    };
    const words = snapWordsToSilence(
      normalizeWords(input, { duration: opts.duration }),
      options.silences || [],
    );
    if (!words.length) return [];
    const groups = strictOneWord ? words.map((w) => [w]) : phraseGroups(words, opts);
    return cueTiming(groups, opts);
  }

  return {
    VERSION,
    normalizeWords,
    snapWordsToSilence,
    wordsToCues,
    _test: { phraseGroups, lexical, terminal, clause },
  };
});
