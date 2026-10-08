'use strict';

/*
 * Capto Caption Engine v13
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
  const VERSION = 13;
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
      'this', 'these', 'those', 'each', 'every', 'some', 'any', 'my', 'your',
      'our', 'their', 'its',
    ]),
    lt: new Set([
      'ir', 'ar', 'bei', 'bet', 'o', 'kad', 'jog', 'nes', 'kai', 'jei',
      'jeigu', 'nors', 'kol', 'kur', 'kaip', 'todėl', 'tačiau', 'arba', 'su',
      'be', 'į', 'iš', 'ant', 'už', 'prie', 'per', 'nuo', 'dėl', 'pagal',
      'šis', 'ši', 'šie', 'šios', 'tas', 'ta', 'tie', 'tos', 'mano', 'tavo',
      'mūsų', 'jūsų', 'jų', 'kiekvienas', 'kiekviena',
    ]),
  };

  const LEADING = {
    en: new Set(['and', 'or', 'but', 'so', 'because', 'however', 'therefore']),
    lt: new Set(['ir', 'ar', 'bet', 'o', 'nes', 'todėl', 'tačiau', 'arba']),
  };

  // These words normally open the next thought. Letting a three-word repair
  // end on one creates cards such as “of things how”, which are technically
  // compact but force the viewer to mentally re-parse the sentence.
  const CLAUSE_STARTERS = {
    en: new Set(['how', 'why', 'what', 'where', 'when', 'who', 'which']),
    lt: new Set(['kaip', 'kodėl', 'kas', 'kur', 'kada', 'kuomet']),
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
      fallback = Math.max(fallback, end);
    }

    const out = [];
    for (const w of raw) {
      const prev = out[out.length - 1];
      // Provider retries occasionally duplicate the same token/timestamp.
      if (prev && lexical(prev.word) === lexical(w.word) && Math.abs(prev.start - w.start) < 0.025) continue;
      // Provider timestamps can overlap or even move backwards inside a
      // perfectly ordered transcript. Keep the provider's TEXT order and
      // repair the onset; sorting by timestamp changes actual sentences (for
      // example "as a CMO I" became "CMO as a I").
      if (prev && w.start < prev.start + MIN_WORD) w.start = prev.start + MIN_WORD;
      if (w.end < w.start + MIN_WORD) w.end = w.start + MIN_WORD;
      if (Number.isFinite(duration) && w.end > duration) w.end = duration;
      if (w.end <= w.start) continue;
      out.push(w);
    }

    for (const w of out) delete w._order;
    return out;
  }

  /**
   * Use audio-energy silence intervals to correct STT words stretched into pauses.
   *
   * A provider sometimes wraps a leading music/noise bed and the first spoken
   * word in one timestamp (for example 0.00–0.98 even though speech begins at
   * 0.64). When a silence sits fully inside that span, keep the larger spoken
   * side instead of always keeping the left side. The old behaviour could turn
   * the first caption into a tiny flash entirely before the voice started.
   */
  function snapWordsToSilence(words, silences) {
    if (!silences || !silences.length) return words;
    let si = 0;
    for (let wi = 0; wi < words.length; wi++) {
      const w = words[wi];
      const previous = words[wi - 1];
      while (si < silences.length && silences[si].end <= w.start + EPS) si++;
      for (let k = si; k < silences.length && silences[k].start < w.end - EPS; k++) {
        const s = silences[k];
        const cutsLeft = s.start > w.start + MIN_WORD && s.start < w.end;
        const cutsRight = s.end > w.start && s.end < w.end - MIN_WORD;
        if (cutsLeft && cutsRight) {
          const before = s.start - w.start;
          const after = w.end - s.end;
          // A word following terminal punctuation belongs AFTER the pause even
          // when a provider stretched its timestamp equally across both sides.
          // Conversely, a sentence-ending word belongs before that pause.
          if (previous && terminal(previous.word)) w.start = s.end;
          else if (terminal(w.word)) w.end = s.start;
          else if (after > before) w.start = s.end;
          else w.end = s.start;
        } else if (cutsLeft) {
          // Speech is before a silence that reaches beyond this word.
          w.end = s.start;
        } else if (cutsRight) {
          // Speech is after a silence that began before this word.
          w.start = s.end;
        }
      }
      if (w.end < w.start + MIN_WORD) w.end = w.start + MIN_WORD;
    }
    return words;
  }

  /** Resolve residual backward/overlapping word timestamps without reordering text. */
  function resolveWordOverlaps(words) {
    for (let i = 0; i + 1 < words.length; i++) {
      const current = words[i];
      const next = words[i + 1];
      if (current.end <= next.start + EPS) continue;
      const overlap = current.end - next.start;
      // At a sentence boundary, protect most of the final spoken word instead
      // of chopping it at the next provider onset. Inside a phrase, split the
      // uncertain overlap evenly.
      const weight = terminal(current.word) ? 1 : 0.5;
      let boundary = next.start + overlap * weight;
      boundary = clamp(boundary, current.start + MIN_WORD, next.end - MIN_WORD);
      if (!Number.isFinite(boundary)) continue;
      current.end = boundary;
      next.start = boundary;
    }
    return words;
  }

  /**
   * Correct a provider's most visible alignment failure: stretching the final
   * word of a sentence across most of the following pause. Audio-energy VAD
   * cannot always see that pause under music, so use a conservative lexical
   * ceiling only for extreme terminal-word outliers. Normal and deliberately
   * slow words remain untouched.
   */
  function limitStretchedTerminalWords(words) {
    for (let i = 0; i < words.length - 1; i++) {
      const word = words[i];
      if (!terminal(word.word)) continue;
      const letters = lexical(word.word).length;
      if (!letters) continue;
      const naturalMax = clamp(0.20 + letters * 0.06, 0.42, 0.78);
      const spokenDuration = word.end - word.start;
      // Leave ordinary model variance alone. This is specifically for cases
      // such as “girls.” being reported as 1.28s while nearby words are ~0.2s.
      if (spokenDuration > naturalMax + 0.12) word.end = word.start + naturalMax;
    }
    return words;
  }

  /**
   * Keep provider timings exact by default. Earlier versions inferred a global
   * offset from noisy silence edges; after frame-synchronised rendering that
   * "correction" became visible anticipation. An offset remains available only
   * as an explicit diagnostic option.
   */
  function compensateProviderLatency(words, _silences, requested) {
    const offset = Number.isFinite(Number(requested))
      ? clamp(Number(requested), 0, 0.18)
      : 0;
    if (offset <= EPS) return words;
    for (const w of words) {
      w.start = Math.max(0, w.start - offset);
      w.end = Math.max(w.start + MIN_WORD, w.end - offset);
    }
    return words;
  }

  function silenceOverlap(silences, start, end) {
    if (!silences || end <= start) return 0;
    let overlap = 0;
    for (const silence of silences) {
      if (silence.end <= start) continue;
      if (silence.start >= end) break;
      overlap += Math.max(0, Math.min(end, silence.end) - Math.max(start, silence.start));
    }
    return overlap;
  }

  function firstSilenceBetween(silences, start, end) {
    for (const silence of silences || []) {
      if (silence.end <= start) continue;
      if (silence.start >= end) break;
      if (Math.min(end, silence.end) - Math.max(start, silence.start) > EPS) return silence;
    }
    return null;
  }

  function crossesHardBoundary(words, from, to, opts) {
    for (let i = from; i < to; i++) {
      if (terminal(words[i].word)) return true;
      const gapStart = words[i].end;
      const gapEnd = words[i + 1].start;
      if (gapEnd - gapStart >= opts.hardGap) return true;
      // Provider timestamps sometimes paper over a pause. The decoded audio is
      // authoritative: never put words from opposite sides of audible silence
      // on the same caption card.
      if (silenceOverlap(opts.silences, gapStart, gapEnd) >= opts.acousticPause) return true;
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
    const clauseStarters = CLAUSE_STARTERS[lang];

    let cost = 0;
    // One or two words is the product default. Three-word cards are deliberately
    // exceptional: they are only allowed for a very short, quick phrase such as
    // “I am in”. This keeps the normal rhythm punchy without chopping every
    // leftover word into an orphan card.
    if (count === 1) {
      cost += 2.35;
      // A rapid single-word flash is harder to follow than a compact pair.
      // Keep solo cards for real sentence/pause structure, not as a cheap way
      // for the optimiser to balance every odd phrase.
      if (duration < 0.30) cost += (0.30 - duration) * 10;
    }
    else if (count === 2) cost += 0;
    else if (count === 3) {
      const lexicalWords = words.slice(from, to + 1).map((w) => lexical(w.word));
      const totalLetters = lexicalWords.reduce((sum, w) => sum + w.length, 0);
      const connectorRepair = lexicalWords.every((w) => w.length > 0 && w.length <= 7)
        && totalLetters <= 13
        && lexicalWords.slice(0, 2).some((w) => dangling.has(w) || leading.has(w));
      const shortTriple = opts.allowShortTriple
        // Three words repair a broken grammatical unit ("from the team",
        // "that Contles is"). They are never a generic response to an odd
        // word count; ordinary phrases stay at the one/two-word default.
        && connectorRepair
        && duration <= opts.tripleMaxDuration
        && !terminal(words[from].word)
        && !terminal(words[from + 1].word)
        && !clause(words[from].word)
        && !clause(words[from + 1].word)
        // Keep the next clause together: “of things / how we”, never
        // “of things how / we”.
        && !clauseStarters.has(lexicalWords[2]);
      if (!shortTriple) return 1e6;
      // A connector repair is intentional grammar, not a generic longer card.
      // Prefer “as a CMO” and “from the team” over orphaning the connector.
      cost += connectorRepair ? 0.35 : 1.25;
    } else return 1e6;
    if (text.length > opts.maxChars) cost += 50 + (text.length - opts.maxChars) * 4;
    if (duration > opts.maxDuration) cost += 30 + (duration - opts.maxDuration) * 12;

    const lastLex = lexical(last.word);
    const firstLex = lexical(first.word);
    const complementCanTrail = count >= 2 && (
      lastLex === 'that' || lastLex === 'which' || lastLex === 'who' ||
      lastLex === 'kad' || lastLex === 'jog'
    );
    if (dangling.has(lastLex) && !complementCanTrail && to < words.length - 1) cost += 14;
    if (leading.has(firstLex) && from > 0 && !terminal(words[from - 1].word)) cost += 2.2;

    const next = words[to + 1];
    if (!next) cost -= 2;
    else {
      const gap = Math.max(0, next.start - last.end);
      if (terminal(last.word)) cost -= 9;
      else if (clause(last.word)) cost -= count === 1 ? 1.5 : 5;
      else if (gap >= opts.hardGap) cost -= 8;
      else if (gap >= opts.softGap) cost -= 3.5;
      else if (count === 1) cost += 0.65;
    }

    // Avoid a one-word orphan immediately after this card when both fit.
    if (words.length - (to + 1) === 1 && count > 1 && !terminal(last.word)) cost += 2.2;
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
        if (crossesHardBoundary(words, from, to, opts)) continue;
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
      // Sentence-ending cards should release essentially with the final spoken
      // word. Using the generic tail here made the last subtitle of a sentence
      // look stuck, especially when there was no following cue to constrain it.
      let end = last.end + (terminal(last.word) ? opts.sentenceLeadOut : opts.leadOut);
      if (next) {
        const gap = next.start - last.end;
        const sentenceEnds = terminal(last.word);
        const audiblePause = silenceOverlap(opts.silences, last.end, next.start) >= opts.acousticPause;
        const pause = audiblePause ? firstSilenceBetween(opts.silences, last.end, next.start) : null;
        // Track the provider's real spoken span. Bridge only a brief gap in
        // acoustically continuous speech so fluent delivery does not flash;
        // never bridge measured silence or punctuation. The previous broad
        // hide-gap rule made unrelated words look equal-duration and kept
        // sentence endings onscreen.
        if (!sentenceEnds && !audiblePause && gap >= -EPS && gap <= opts.bridgeGap) {
          end = next.start;
        } else if (gap > 0) {
          const tail = sentenceEnds ? opts.sentenceLeadOut : opts.leadOut;
          // Let the spoken ending breathe without occupying the whole pause.
          // Preserve a guaranteed blank interval before the next phrase.
          end = last.end + Math.min(tail, Math.max(0, gap - opts.blankBeforeNext));
          if (pause) end = Math.min(end, pause.start + opts.pauseRelease);
        }
        // A cue must never consume the next word's onset. Overlapping provider
        // words meet at that onset; downstream word timings remain untouched.
        end = Math.min(end, next.start);
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
      maxWords: strictOneWord ? 1 : clamp(Math.round(finite(options.maxWords, 3)), 1, 3),
      maxChars: clamp(Math.round(finite(options.maxChars, 28)), 10, 60),
      maxDuration: clamp(finite(options.maxDuration, 2.15), 0.5, 5),
      softGap: clamp(finite(options.softGap, 0.2), 0.08, 0.8),
      hardGap: clamp(finite(options.hardGap, 0.36), 0.2, 1.5),
      // Short provider gaps inside continuous speech should be a direct visual
      // handoff, not a 3-6 frame flash of empty video. Actual decoded-audio
      // silence still wins through acousticPause below.
      bridgeGap: clamp(finite(options.bridgeGap, strictOneWord ? 0.055 : 0.14), 0.02, 0.24),
      acousticPause: clamp(finite(options.acousticPause, 0.08), 0.05, 0.3),
      silences: options.silences || [],
      leadIn: clamp(finite(options.leadIn, 0), 0, 0.25),
      leadOut: clamp(finite(options.leadOut, 0.08), 0, 0.2),
      sentenceLeadOut: clamp(finite(options.sentenceLeadOut, 0.025), 0, 0.12),
      pauseRelease: clamp(finite(options.pauseRelease, 0.04), 0.015, 0.1),
      blankBeforeNext: clamp(finite(options.blankBeforeNext, 0.045), 0.02, 0.15),
      minCueDuration: clamp(finite(options.minCueDuration, strictOneWord ? 0.07 : 0.12), 0.04, 0.5),
      allowShortTriple: options.allowShortTriple !== false,
      tripleMaxDuration: clamp(finite(options.tripleMaxDuration, 1.05), 0.45, 1.2),
    };
    const words = normalizeWords(input, { duration: opts.duration });
    compensateProviderLatency(words, opts.silences, options.latencyCompensation);
    snapWordsToSilence(words, opts.silences);
    limitStretchedTerminalWords(words);
    resolveWordOverlaps(words);
    if (!words.length) return [];
    const groups = strictOneWord ? words.map((w) => [w]) : phraseGroups(words, opts);
    return cueTiming(groups, opts);
  }

  return {
    VERSION,
    normalizeWords,
    compensateProviderLatency,
    snapWordsToSilence,
    limitStretchedTerminalWords,
    resolveWordOverlaps,
    wordsToCues,
    _test: { phraseGroups, lexical, terminal, clause },
  };
});
