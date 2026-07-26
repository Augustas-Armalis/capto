(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CaptoExportPolicy = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const MIB = 1024 * 1024;

  function finite(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : fallback;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function sourceBitrate(fileSize, duration) {
    const bytes = finite(fileSize, 0);
    const seconds = finite(duration, 0);
    return bytes && seconds ? Math.round((bytes * 8) / seconds) : 0;
  }

  function losslessBitrate(fileSize, duration) {
    const source = sourceBitrate(fileSize, duration);
    // Caption burn-in always requires a video re-encode. Matching the source
    // rate (within practical browser limits) preserves far more detail than a
    // fixed 16 Mbps target, especially for native 4K phone/camera footage.
    return source ? clamp(source - 192000, 16000000, 50000000) : 16000000;
  }

  function estimatedWebCodecsPeakBytes(input) {
    const bytes = finite(input && input.fileSize, 0);
    const seconds = finite(input && input.duration, 0);
    const bitrate = finite(input && input.outputBitrate, 16000000);
    const output = seconds ? (bitrate * seconds) / 8 : 0;
    const pcmAudio = seconds ? seconds * 48000 * 2 * 4 : 0;
    // The old path retained demuxed source packets, a full file ArrayBuffer,
    // decoded PCM, and the in-memory output at the same time.
    return bytes * 2 + output + pcmAudio;
  }

  function shouldUseMemorySafeExport(input) {
    const width = finite(input && input.width, 0);
    const height = finite(input && input.height, 0);
    const duration = finite(input && input.duration, 0);
    const fileSize = finite(input && input.fileSize, 0);
    const outputBitrate = finite(
      input && input.outputBitrate,
      losslessBitrate(fileSize, duration),
    );
    const peak = estimatedWebCodecsPeakBytes({ fileSize, duration, outputBitrate });

    return (
      fileSize >= 192 * MIB ||
      peak >= 700 * MIB ||
      (width * height >= 3840 * 2160 && duration >= 45)
    );
  }

  return {
    sourceBitrate,
    losslessBitrate,
    estimatedWebCodecsPeakBytes,
    shouldUseMemorySafeExport,
  };
});
