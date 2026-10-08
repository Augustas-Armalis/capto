'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
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
    assert.equal(cues[i]._engineVersion, 13);
    if (i) assert.ok(cues[i].start >= cues[i - 1].end - 1e-9, 'cues must not overlap');
  }
}

test('reports Caption Engine v13', () => {
  assert.equal(engine.VERSION, 13);
});

test('defaults to one or two words and avoids dangling English connectors', () => {
  const cues = engine.wordsToCues(timed('This is how we build better captions for everyone.'), { language: 'en' });
  assert.deepEqual(cues.map((c) => c.text), ['This is', 'how we', 'build better', 'captions', 'for everyone.']);
  assert.ok(cues.every((c) => c.words.length <= 2));
  assertValid(cues);
});
test('uses Lithuanian-aware boundaries with only rare grammatical triples', () => {
  const cues = engine.wordsToCues(timed('Tai yra būdas kaip mes kuriame geresnius subtitrus visiems.'), { language: 'lt' });
  assert.ok(cues.every((c) => c.words.length <= 3));
  assert.ok(cues.filter((c) => c.words.length === 3).length <= 1);
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

test('cuts the real sample opening into readable grammatical beats', () => {
  const cues = engine.wordsToCues(timed('Apparently, every random decided that the way to grow content is to hire two girls.'), { language: 'en' });
  assert.deepEqual(cues.map((cue) => cue.text), [
    'Apparently,',
    'every random',
    'decided that',
    'the way',
    'to grow',
    'content is',
    'to hire',
    'two girls.',
  ]);
  assertValid(cues);
});

test('keeps clause starters and prepositional phrases with the thought they belong to', () => {
  const flow = engine.wordsToCues(timed('I changed a lot of things how we speak about the brand.'), { language: 'en' });
  assert.deepEqual(flow.map((cue) => cue.text), [
    'I changed',
    'a lot',
    'of things',
    'how we',
    'speak',
    'about the brand.',
  ]);
  assert.ok(flow.every((cue) => cue.text !== 'of things how'));

  const role = engine.wordsToCues(timed('and I stole her from the team.'), { language: 'en' });
  assert.deepEqual(role.map((cue) => cue.text), ['and I', 'stole her', 'from the team.']);
  assert.ok(role.every((cue) => cue.text !== 'stole her from'));

  const title = engine.wordsToCues(timed('I joined Contles as a CMO,'), { language: 'en' });
  assert.equal(title.at(-1).text, 'as a CMO,');
  assertValid(flow);
  assertValid(role);
  assertValid(title);
});

test('strict word-by-word mode changes on every provider onset without anticipation', () => {
  const words = timed('one word at a time');
  const cues = engine.wordsToCues(words, { language: 'en', oneWord: true });
  assert.equal(cues.length, words.length);
  assert.ok(cues.every((c) => c.words.length === 1));
  for (let i = 0; i < cues.length; i++) {
    assert.ok(Math.abs(cues[i].start - words[i].start) < 1e-9);
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
  assert.ok(cues[0].end <= 0.65, 'sentence end should stay within one frame of its spoken word end');
  assert.ok(cues[1].start - cues[0].end >= 0.2, 'the sentence pause should clear the screen');
  assertValid(cues);
});

test('the final sentence card does not inherit the generic caption tail', () => {
  const cues = engine.wordsToCues([
    { word: 'Follow', start: 1.0, end: 1.22 },
    { word: 'now!', start: 1.24, end: 1.52 },
  ], { language: 'en', duration: 2, latencyCompensation: 0 });
  assert.ok(cues[0].end - 1.52 <= 0.026, 'final punctuation should clear essentially at speech end');
  assertValid(cues);
});

test('corrects a sentence-final word stretched across the following pause', () => {
  const cues = engine.wordsToCues([
    { word: 'two', start: 3.82, end: 4.04 },
    // Exact provider failure observed in the real clip: “girls.” was reported
    // as 1.28s even though the voice ends near the beginning of that span.
    { word: 'girls.', start: 4.04, end: 5.32 },
    { word: 'Which', start: 5.54, end: 5.68 },
    { word: 'is', start: 5.68, end: 5.84 },
    { word: 'funny,', start: 5.84, end: 6.18 },
  ], { language: 'en', duration: 7, latencyCompensation: 0 });
  const first = cues.find((cue) => cue.text === 'two girls.');
  const next = cues.find((cue) => cue.text.includes('Which'));
  assert.ok(first.end <= 4.57, 'the stretched final word must be capped near its plausible spoken end');
  assert.ok(next.start - first.end >= 0.9, 'the following pause should be visibly empty');
  assertValid(cues);
});

test('audio silence does not invent a global early offset', () => {
  const cues = engine.wordsToCues([
    { word: 'Now', start: 0.54, end: 0.76 },
    { word: 'listen.', start: 0.82, end: 1.1 },
  ], {
    language: 'en',
    oneWord: true,
    silences: [{ start: 0, end: 0.46 }],
  });
  assert.equal(cues[0].start, 0.54, 'must keep the provider onset when silence does not overlap it');
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

test('bridges a short provider gap during continuous speech', () => {
  const cues = engine.wordsToCues([
    { word: 'Clean', start: 0.4, end: 0.62 },
    { word: 'caption', start: 0.66, end: 0.92 },
    { word: 'timing', start: 1.05, end: 1.30 },
    { word: 'now', start: 1.34, end: 1.58 },
  ], { language: 'en', latencyCompensation: 0 });
  assert.equal(cues.length, 2);
  assert.equal(cues[0].end, cues[1].start, 'continuous speech must hand off without a blank flash');
  assertValid(cues);
});

test('decoded-audio silence stays blank even inside the bridge window', () => {
  const cues = engine.wordsToCues([
    { word: 'First', start: 0.4, end: 0.62 },
    { word: 'part', start: 0.66, end: 0.88 },
    { word: 'Second', start: 1.04, end: 1.28 },
    { word: 'part', start: 1.32, end: 1.54 },
  ], {
    language: 'en',
    latencyCompensation: 0,
    silences: [{ start: 0.89, end: 1.03 }],
  });
  assert.equal(cues.length, 2);
  assert.ok(cues[1].start - cues[0].end > 0.1, 'real audio silence must clear the display');
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

test('shares a backward sentence boundary instead of chopping the final word', () => {
  const cues = engine.wordsToCues([
    { word: 'the', start: 11.88, end: 12.00 },
    { word: 'brand.', start: 12.00, end: 12.26 },
    { word: 'The', start: 11.82, end: 12.38 },
    { word: 'website,', start: 12.38, end: 12.86 },
  ], { language: 'en', latencyCompensation: 0 });
  const words = cues.flatMap((cue) => cue.words);
  const brand = words.find((word) => word.word === 'brand.');
  const next = words.find((word) => word.word === 'The');
  assert.ok(brand.end > 12.15, 'the sentence-ending word must keep most of its spoken interval');
  assert.equal(brand.end, next.start, 'the repaired sentence boundary must be contiguous');
  assertValid(cues);
});

test('a new sentence word spanning silence is placed after the pause', () => {
  const cues = engine.wordsToCues([
    { word: 'content.', start: 21.20, end: 21.74 },
    { word: 'So', start: 21.40, end: 21.96 },
    { word: 'I', start: 21.96, end: 22.16 },
  ], {
    language: 'en',
    latencyCompensation: 0,
    silences: [{ start: 21.60, end: 21.76 }],
  });
  const so = cues.flatMap((cue) => cue.words).find((word) => word.word === 'So');
  assert.ok(so.start >= 21.76, 'the next sentence must not appear on the pre-pause side');
  assertValid(cues);
});

test('editor paints captions on decoded video frames with end-exclusive handoffs', () => {
  const source = fs.readFileSync(require.resolve('../public/studio/app.js'), 'utf8');
  assert.match(source, /requestVideoFrameCallback/);
  assert.match(source, /t >= c\.start && t < c\.end/);
  assert.match(source, /frame\.mediaTime/);
  assert.match(source, /addEventListener\('ended',[\s\S]*clearCaptionDisplay\(\)/);
});

test('chunk stitching only deduplicates words from different overlap chunks', () => {
  const source = fs.readFileSync(require.resolve('../public/studio/capto-bridge.js'), 'utf8');
  assert.match(source, /old\._chunkIndex !== i/);
  assert.doesNotMatch(source, /const duplicate = cleanWords/);
});
