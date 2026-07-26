'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const coverage = require('../public/studio/transcription-coverage.js');

function wordsAt(times) {
  return times.map((start, index) => ({ word: `w${index}`, start, end: start + 0.22 }));
}

test('flags a successful transcript with a large missing middle section', () => {
  const sparse = wordsAt([0, 1, 3, 7.7, 24.7, 26.2]);
  const value = coverage.stats(sparse, 30);
  assert.ok(value.maxInternalGap > 16);
  assert.equal(coverage.needsRecovery(sparse, 30), true);
});

test('prefers a materially complete language-detection recovery', () => {
  const sparse = wordsAt([0, 1, 3, 7.7, 24.7, 26.2]);
  const recovered = wordsAt(Array.from({ length: 70 }, (_, index) => index * 0.41));
  assert.equal(coverage.preferRecovered(sparse, recovered, 30), true);
  assert.equal(coverage.preferRecovered(recovered, sparse, 30), false);
});

test('does not replace a valid transcript because of a natural short pause', () => {
  const primary = wordsAt([0, 0.5, 1, 4.5, 5, 5.5, 9, 9.5, 10]);
  const alternate = wordsAt([0, 0.5, 1, 4.5, 5, 9]);
  assert.equal(coverage.needsRecovery(primary, 12), false);
  assert.equal(coverage.preferRecovered(primary, alternate, 12), false);
});
