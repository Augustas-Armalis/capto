'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const engine = require('../public/studio/caption-engine.js');

function timed(text, gaps = []) {
  let t = 0.5;
  return text.split(' ').map((word, i) => {
    const out = { word, start: t, end: t + 0.18 };
    t += 0.22 + (gaps[i] || 0);
    return out;
  });
}

function assertValid(cues) {
  for (let i = 0; i < cues.length; i++) {
    assert.ok(cues[i].start >= 0);
    assert.ok(cues[i].end > cues[i].start);
    assert.equal(cues[i].text, cues[i].words.map((w) => w.word).join(' '));
    if (i) assert.ok(cues[i].start >= cues[i - 1].end - 1e-9, 'cues must not overlap');
  }
}

test('creates short natural English phrases without dangling connectors', () => {
  const cues = engine.wordsToCues(timed('This is how we build better captions for everyone.'), { language: 'en' });
  assert.deepEqual(cues.map((c) => c.text), [
    'This is how',
    'we build better',
    'captions for everyone.',
  ]);
  assert.ok(cues.every((c) => c.words.length <= 3));
  assertValid(cues);
});
test('uses Lithuanian-aware phrase boundaries', () => {
  const cues = engine.wordsToCues(timed('Tai yra būdas kaip mes kuriame geresnius subtitrus visiems.'), { language: 'lt' });
  assert.deepEqual(cues.map((c) => c.text), [
    'Tai yra būdas',
    'kaip mes kuriame',
    'geresnius subtitrus visiems.',
  ]);
  assert.ok(cues.every((c) => !/\b(ir|kad|su)$/iu.test(c.text)));
  assertValid(cues);
});

test('strict word-by-word mode changes on every real word onset', () => {
  const words = timed('one word at a time');
  const cues = engine.wordsToCues(words, { language: 'en', oneWord: true });
  assert.equal(cues.length, words.length);
  assert.ok(cues.every((c) => c.words.length === 1));
  for (let i = 1; i < cues.length; i++) {
    assert.ok(Math.abs(cues[i - 1].end - cues[i].start) < 1e-9);
  }
  assertValid(cues);
});

test('clears the display during a real pause', () => {
  const words = timed('Hello everyone welcome back', [0, 0.8, 0]);
  const cues = engine.wordsToCues(words, { language: 'en' });
  assert.deepEqual(cues.map((c) => c.text), ['Hello everyone', 'welcome back']);
  assert.ok(cues[1].start - cues[0].end > 0.5);
  assertValid(cues);
});

test('audio silence trims a provider word stretched across dead air', () => {
  const cues = engine.wordsToCues([
    { word: 'Stop.', start: 0.2, end: 1.4 },
    { word: 'Continue', start: 1.8, end: 2.1 },
  ], {
    language: 'en',
    silences: [{ start: 0.62, end: 1.72 }],
  });
  assert.ok(cues[0].end < 0.75);
  assert.ok(cues[1].start > 1.7);
  assertValid(cues);
});

test('repairs invalid, duplicate, and overlapping provider timings', () => {
  const cues = engine.wordsToCues([
    { word: 'Good', start: Number.NaN, end: Number.NaN },
    { word: 'Good', start: 0, end: 0.02 },
    { word: 'timing', start: 0, end: 0 },
    { word: 'now.', start: 0.01, end: 0.3 },
  ], { language: 'en' });
  assert.equal(cues.flatMap((c) => c.words).filter((w) => w.word === 'Good').length, 1);
  assertValid(cues);
});
