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
    assert.equal(cues[i]._engineVersion, 5);
    if (i) assert.ok(cues[i].start >= cues[i - 1].end - 1e-9, 'cues must not overlap');
  }
}

test('reports Caption Engine v5', () => {
  assert.equal(engine.VERSION, 5);
});

test('defaults to one or two words and avoids dangling English connectors', () => {
  const cues = engine.wordsToCues(timed('This is how we build better captions for everyone.'), { language: 'en' });
  assert.deepEqual(cues.map((c) => c.text), ['This is', 'how we', 'build better', 'captions', 'for everyone.']);
  assert.ok(cues.every((c) => c.words.length <= 2));
  assertValid(cues);
});
test('uses Lithuanian-aware boundaries with one or two words by default', () => {
  const cues = engine.wordsToCues(timed('Tai yra būdas kaip mes kuriame geresnius subtitrus visiems.'), { language: 'lt' });
  assert.ok(cues.every((c) => c.words.length <= 2));
  assert.ok(cues.every((c) => !/\b(ir|kad|su)$/iu.test(c.text)));
  assertValid(cues);
});

test('allows a three-word card only for an exceptionally short quick phrase', () => {
  const short = engine.wordsToCues(timed('in and we'), { language: 'en' });
  assert.equal(short.length, 1);
  assert.equal(short[0].words.length, 3);
  const normal = engine.wordsToCues(timed('captions look very professional today'), { language: 'en' });
  assert.ok(normal.every((c) => c.words.length <= 2));
});

test('strict word-by-word mode changes on every latency-corrected onset', () => {
  const words = timed('one word at a time');
  const cues = engine.wordsToCues(words, { language: 'en', oneWord: true });
  assert.equal(cues.length, words.length);
  assert.ok(cues.every((c) => c.words.length === 1));
  for (let i = 0; i < cues.length; i++) {
    assert.ok(Math.abs(cues[i].start - (words[i].start - 0.075)) < 1e-9);
  }
  for (let i = 1; i < cues.length; i++) {
    assert.ok(Math.abs(cues[i - 1].end - cues[i].start) < 1e-9);
  }
  assertValid(cues);
});

test('audio silence calibrates late provider onsets without anticipating speech', () => {
  const cues = engine.wordsToCues([
    { word: 'Now', start: 0.54, end: 0.76 },
    { word: 'listen.', start: 0.82, end: 1.1 },
  ], {
    language: 'en',
    oneWord: true,
    silences: [{ start: 0, end: 0.46 }],
  });
  assert.ok(cues[0].start >= 0.46, 'must not enter detected silence');
  assert.ok(cues[0].start < 0.49, 'must remove the provider onset delay');
  assert.ok(cues[0].start < 0.54, 'must be earlier than the raw provider timestamp');
  assertValid(cues);
});

test('latency compensation can be explicitly disabled for diagnostics', () => {
  const words = timed('exact provider timing');
  const cues = engine.wordsToCues(words, { language: 'en', oneWord: true, latencyCompensation: 0 });
  assert.equal(cues[0].start, words[0].start);
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
