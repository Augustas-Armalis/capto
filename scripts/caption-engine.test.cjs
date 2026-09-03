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
    assert.equal(cues[i]._engineVersion, 7);
    if (i) assert.ok(cues[i].start >= cues[i - 1].end - 1e-9, 'cues must not overlap');
  }
}

test('reports Caption Engine v7', () => {
  assert.equal(engine.VERSION, 7);
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
  const grammatical = engine.wordsToCues(timed('that the way'), { language: 'en' });
  assert.equal(grammatical.length, 1);
  assert.equal(grammatical[0].text, 'that the way');
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

test('word-by-word duration follows each spoken word instead of equal blocks', () => {
  const words = [
    { word: 'Quick', start: 0.5, end: 0.64 },
    { word: 'longer', start: 0.82, end: 1.31 },
    { word: 'end.', start: 1.48, end: 1.70 },
  ];
  const cues = engine.wordsToCues(words, { language: 'en', oneWord: true, latencyCompensation: 0 });
  const durations = cues.map((cue) => cue.end - cue.start);
  assert.ok(durations[1] > durations[0] * 2, 'the longer spoken word must remain visibly longer');
  assert.ok(cues[0].end < cues[1].start, 'a real inter-word pause must remain visible');
  assertValid(cues);
});

test('sentence-ending captions stop on speech instead of hanging until the next phrase', () => {
  const cues = engine.wordsToCues([
    { word: 'Done.', start: 0.3, end: 0.62 },
    { word: 'Next', start: 0.9, end: 1.12 },
    { word: 'thought', start: 1.15, end: 1.48 },
  ], { language: 'en', oneWord: true, latencyCompensation: 0 });
  assert.ok(cues[0].end <= 0.65, 'sentence end should stay close to its spoken word end');
  assert.ok(cues[1].start - cues[0].end > 0.2, 'the sentence pause should clear the screen');
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

test('moves a provider word after a silent intro instead of flashing it before speech', () => {
  const cues = engine.wordsToCues([
    { word: 'Apparently', start: 0, end: 0.98 },
    { word: 'every', start: 0.98, end: 1.42 },
    { word: 'random', start: 1.42, end: 1.60 },
  ], {
    language: 'en',
    silences: [
      { start: 0.12, end: 0.32 },
      { start: 0.40, end: 0.64 },
    ],
  });
  assert.ok(cues[0].start >= 0.64, 'first caption must wait for the measured voice onset');
  assert.ok(cues[0].text.startsWith('Apparently'));
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

test('preserves transcript order when provider timestamps move backwards', () => {
  const cues = engine.wordsToCues([
    { word: 'joined', start: 8.20, end: 8.48 },
    { word: 'Contles', start: 8.48, end: 8.80 },
    { word: 'as', start: 8.80, end: 9.14 },
    { word: 'a', start: 9.14, end: 9.54 },
    { word: 'CMO', start: 8.60, end: 9.64 },
    { word: 'I', start: 9.64, end: 9.98 },
  ], { language: 'en', latencyCompensation: 0 });
  assert.equal(cues.flatMap((cue) => cue.words).map((word) => word.word).join(' '), 'joined Contles as a CMO I');
  assert.ok(cues.flatMap((cue) => cue.words).every((word, index, words) => index === 0 || word.start >= words[index - 1].start));
  assertValid(cues);
});
