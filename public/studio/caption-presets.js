'use strict';
/*
 * Capto caption presets for the studio editor — the SAME styles advertised on the
 * marketing /styles page (mirrors lib/caption-presets.ts), plus a few extras, as
 * plain JS (no bundler here). Loaded before app.js, exposed on window so app.js
 * can render the preset picker and apply a preset onto its flat `state.style`.
 */
(function () {
  var WHITE = '#FFFFFF', INK = '#0b0c11';
  var VIOLET = '#b8a4ff', CYAN = '#5fe3f5', FUCHSIA = '#ef79e6', YELLOW = '#ffd233', GREEN = '#46d39a';

  // highlightMode: 'color' | 'box' | 'glow' | 'underline'
  window.CAPTO_PRESETS = [
    { id: 'inter-bold', name: 'Clean White', fontWeight: 700, caseMode: 'none', tracking: -0.02, fill: WHITE, highlightFill: WHITE, highlightMode: 'color', sizeRatio: 0.072, shadow: true, popular: true, sample: 'clean and simple' },
    { id: 'hormozi', name: 'Hormozi', fontWeight: 800, caseMode: 'upper', tracking: -0.01, fill: WHITE, highlightFill: INK, highlightMode: 'box', accent: YELLOW, sizeRatio: 0.078, shadow: true, popular: true, sample: 'make it POP' },
    { id: 'karaoke', name: 'Karaoke', fontWeight: 700, caseMode: 'upper', tracking: -0.01, fill: WHITE, highlightFill: WHITE, highlightMode: 'box', accent: '#7c5cff', sizeRatio: 0.066, shadow: true, popular: true, sample: 'follow every word' },
    { id: 'beasty', name: 'Beasty', fontWeight: 900, caseMode: 'upper', tracking: -0.01, fill: WHITE, highlightFill: INK, highlightMode: 'box', accent: GREEN, sizeRatio: 0.084, shadow: true, sample: 'go bigger' },
    { id: 'neon', name: 'Neon', fontWeight: 700, caseMode: 'upper', tracking: -0.01, fill: WHITE, highlightFill: CYAN, highlightMode: 'glow', accent: CYAN, sizeRatio: 0.068, shadow: true, sample: 'glow up' },
    { id: 'pop', name: 'Pop', fontWeight: 700, caseMode: 'none', tracking: -0.01, fill: WHITE, highlightFill: WHITE, highlightMode: 'box', accent: FUCHSIA, pill: true, sizeRatio: 0.068, shadow: true, sample: 'so fun' },
    { id: 'editorial', name: 'Editorial', fontWeight: 600, caseMode: 'none', tracking: -0.02, fill: WHITE, highlightFill: CYAN, highlightMode: 'color', sizeRatio: 0.06, shadow: true, sample: 'tell the story' },
    { id: 'clean-sans', name: 'Underline', fontWeight: 500, caseMode: 'lower', tracking: -0.01, fill: '#f2f3f7', highlightFill: '#f2f3f7', highlightMode: 'underline', accent: CYAN, sizeRatio: 0.058, shadow: true, sample: 'keep it minimal' },
    { id: 'word-by-word', name: 'Big Words', fontWeight: 700, caseMode: 'upper', tracking: -0.01, fill: WHITE, highlightFill: WHITE, highlightMode: 'color', sizeRatio: 0.09, shadow: true, sample: 'BIG bold words' },
    // a few extras
    { id: 'sunset', name: 'Sunset', fontWeight: 800, caseMode: 'upper', tracking: -0.01, fill: WHITE, highlightFill: INK, highlightMode: 'box', accent: '#ff8a3d', sizeRatio: 0.076, shadow: true, sample: 'warm vibes' },
    { id: 'mint-box', name: 'Mint', fontWeight: 800, caseMode: 'upper', tracking: -0.01, fill: WHITE, highlightFill: INK, highlightMode: 'box', accent: '#7af0c9', pill: true, sizeRatio: 0.074, shadow: true, sample: 'fresh take' },
    { id: 'bubble', name: 'Bubble', fontWeight: 700, caseMode: 'none', tracking: 0, fill: WHITE, highlightFill: WHITE, highlightMode: 'box', accent: '#5b8cff', pill: true, sizeRatio: 0.07, shadow: true, sample: 'say hello' },
  ];

  // Map a preset → the studio's flat style object (defaultStyle shape). Keeps the
  // existing render path; just sets the right keys + the new highlightMode/Bg.
  window.captoPresetToStyle = function (p, meta) {
    var H = (meta && meta.height) || 1920;
    var fontSize = Math.max(12, Math.round(H * (p.sizeRatio || 0.06)));
    var ls = Math.round(fontSize * (p.tracking || 0));
    var mode = p.highlightMode || 'color';
    var box = mode === 'box';
    var glow = mode === 'glow';
    return {
      fontFamily: 'Inter',
      fontSize: fontSize,
      weight: p.fontWeight || 700,
      italic: false,
      lineHeight: 1.12,
      caseMode: p.caseMode || 'none',
      primaryColor: p.fill || WHITE,
      letterSpacing: ls,
      outlineWidth: p.outline ? Math.round(fontSize * p.outline) : 0,
      outlineColor: p.outlineColor || '#000000',
      shadowEnabled: p.shadow !== false,
      shadowColor: glow ? (p.accent || CYAN) : '#000000',
      shadowOpacity: glow ? 90 : 60,
      shadowDistance: glow ? 0 : Math.max(2, Math.round(H * 0.0025)),
      shadowBlur: glow ? Math.round(H * 0.015) : Math.max(2, Math.round(H * 0.0035)),
      highlightEnabled: true,
      highlightMode: mode,
      highlightColor: box ? (p.highlightFill || INK) : (p.highlightFill || p.accent || p.fill || WHITE),
      highlightBg: p.accent || YELLOW,
      highlightPill: !!p.pill,
      highlightScale: box ? 104 : (mode === 'color' ? 108 : 100),
      posX: 0.5, posY: 0.82,
      entrance: 'none', exit: 'none', animMs: 180,
      _preset: p.id,
    };
  };
})();
