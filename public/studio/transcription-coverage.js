'use strict';

(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.CaptoTranscriptionCoverage = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function finite(value, fallback) {
    value = Number(value);
    return Number.isFinite(value) ? value : fallback;
  }

  function stats(input, duration) {
    const words = (input || [])
      .map((word) => ({
        start: Math.max(0, finite(word && word.start, 0)),
        end: Math.max(0, finite(word && word.end, 0)),
      }))
      .filter((word) => word.end > word.start)
      .sort((a, b) => a.start - b.start);
    const totalDuration = Math.max(0, finite(duration, 0));
    let maxInternalGap = 0;
    for (let i = 1; i < words.length; i++) {
      maxInternalGap = Math.max(maxInternalGap, words[i].start - words[i - 1].end);
    }
    return {
      wordCount: words.length,
      span: words.length ? Math.max(0, words[words.length - 1].end - words[0].start) : 0,
      maxInternalGap,
      density: totalDuration > 0 ? words.length / totalDuration : 0,
    };
  }

  function needsRecovery(words, duration) {
    duration = Math.max(0, finite(duration, 0));
    if (duration < 12) return false;
    const value = stats(words, duration);
    if (!value.wordCount) return false;
    return value.maxInternalGap >= Math.max(6, duration * 0.3)
      || value.wordCount < duration * 0.35;
  }

  function preferRecovered(primaryWords, recoveredWords, duration) {
    const primary = stats(primaryWords, duration);
    const recovered = stats(recoveredWords, duration);
    if (recovered.wordCount < Math.max(primary.wordCount + 6, primary.wordCount * 1.5)) return false;
    if (recovered.span < primary.span * 0.8) return false;
    return recovered.maxInternalGap + 2 < primary.maxInternalGap
      || recovered.wordCount >= Math.max(8, primary.wordCount * 2);
  }

  return { stats, needsRecovery, preferRecovered };
});
