const test = require('node:test');
const assert = require('node:assert/strict');
const policy = require('../public/studio/export-policy.js');

test('large 4K source uses the memory-safe exporter', () => {
  const fileSize = 403 * 1024 * 1024;
  const duration = 120.58;
  const bitrate = policy.losslessBitrate(fileSize, duration);

  assert.ok(bitrate > 27_000_000 && bitrate < 29_000_000);
  assert.equal(policy.shouldUseMemorySafeExport({
    fileSize,
    duration,
    width: 3840,
    height: 2160,
    outputBitrate: bitrate,
  }), true);
});

test('ordinary short 1080p source keeps deterministic WebCodecs export', () => {
  const fileSize = 24 * 1024 * 1024;
  const duration = 30;
  const bitrate = policy.losslessBitrate(fileSize, duration);

  assert.equal(policy.shouldUseMemorySafeExport({
    fileSize,
    duration,
    width: 1920,
    height: 1080,
    outputBitrate: bitrate,
  }), false);
});

test('lossless bitrate is bounded for unusually small and huge sources', () => {
  assert.equal(policy.losslessBitrate(2 * 1024 * 1024, 60), 16_000_000);
  assert.equal(policy.losslessBitrate(2 * 1024 * 1024 * 1024, 60), 50_000_000);
});
