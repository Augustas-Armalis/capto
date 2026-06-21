'use strict';
/*
 * Capto caption presets for the studio editor — the SAME 14 styles advertised on
 * the marketing /styles page (mirrors lib/styles.ts), as plain JS (no bundler
 * here). Loaded before app.js, exposed on window so app.js can render the preset
 * picker and apply a preset onto its flat `state.style`.
 */
(function () {
  var WHITE = '#FFFFFF', INK = '#0b0c11';
  var VIOLET = '#b8a4ff', CYAN = '#5fe3f5', FUCHSIA = '#ef79e6', YELLOW = '#ffd233', GREEN = '#46d39a';

  // highlightMode: 'color' | 'box' | 'glow' | 'underline'. Optional flags:
  //   hollow   → letters are a stroke outline, the active word fills solid
  //   gradient → letters washed in a cyan→violet→fuchsia gradient
  //   font     → override the family (default Inter)
  //   scale    → how much the active word grows (100 = none)
  window.CAPTO_PRESETS = [
    { id: 'inter-bold', name: 'Inter Bold', fontWeight: 700, caseMode: 'none', tracking: -0.02, fill: WHITE, highlightFill: WHITE, highlightMode: 'color', scale: 120, sizeRatio: 0.052, shadow: true, popular: true, sample: 'keep it simple' },
    { id: 'hormozi', name: 'Hormozi', fontWeight: 800, caseMode: 'upper', tracking: -0.01, fill: WHITE, highlightFill: INK, highlightMode: 'box', accent: YELLOW, sizeRatio: 0.056, shadow: true, popular: true, sample: 'this changed everything' },
    { id: 'karaoke', name: 'Karaoke', fontWeight: 700, caseMode: 'upper', tracking: -0.01, fill: WHITE, highlightFill: WHITE, highlightMode: 'box', accent: '#7c5cff', sizeRatio: 0.05, shadow: true, popular: true, sample: 'follow every word' },
    { id: 'editorial', name: 'Editorial', fontWeight: 600, caseMode: 'none', tracking: -0.02, fill: WHITE, highlightFill: CYAN, highlightMode: 'color', scale: 112, sizeRatio: 0.046, shadow: true, sample: 'words that earn attention' },
    { id: 'clean-sans', name: 'Clean Sans', fontWeight: 500, caseMode: 'lower', tracking: -0.01, fill: '#f2f3f7', highlightFill: '#f2f3f7', highlightMode: 'underline', accent: CYAN, sizeRatio: 0.044, shadow: true, sample: 'simple is stronger' },
    { id: 'word-by-word', name: 'Word by Word', fontWeight: 700, caseMode: 'upper', tracking: -0.01, fill: WHITE, highlightFill: WHITE, highlightMode: 'color', scale: 124, sizeRatio: 0.07, shadow: true, sample: 'every word hits' },
    { id: 'beasty', name: 'Beasty', fontWeight: 900, caseMode: 'upper', tracking: -0.01, fill: WHITE, highlightFill: INK, highlightMode: 'box', accent: YELLOW, outline: 0.02, sizeRatio: 0.062, shadow: true, sample: 'you wont believe this' },
    { id: 'neon', name: 'Neon', fontWeight: 700, caseMode: 'upper', tracking: -0.01, fill: WHITE, highlightFill: CYAN, highlightMode: 'glow', accent: CYAN, scale: 110, sizeRatio: 0.052, shadow: true, sample: 'turn it up loud' },
    { id: 'pop', name: 'Pop', fontWeight: 700, caseMode: 'none', tracking: -0.01, fill: WHITE, highlightFill: WHITE, highlightMode: 'box', accent: FUCHSIA, pill: true, sizeRatio: 0.05, shadow: true, sample: 'made this for you' },
    { id: 'outline', name: 'Outline', fontWeight: 800, caseMode: 'upper', tracking: -0.01, fill: WHITE, highlightFill: WHITE, highlightMode: 'color', hollow: true, sizeRatio: 0.058, shadow: false, sample: 'big bold outline' },
    { id: 'gradient', name: 'Gradient', fontWeight: 800, caseMode: 'upper', tracking: -0.01, fill: WHITE, highlightFill: WHITE, highlightMode: 'glow', accent: VIOLET, gradient: true, scale: 108, sizeRatio: 0.058, shadow: true, sample: 'make it pop' },
    { id: 'highlighter', name: 'Highlighter', fontWeight: 700, caseMode: 'none', tracking: -0.01, fill: WHITE, highlightFill: WHITE, highlightMode: 'box', accent: '#8b6cffcc', sizeRatio: 0.05, shadow: true, sample: 'read this part' },
    { id: 'bubble', name: 'Bubble', fontWeight: 700, caseMode: 'none', tracking: 0, fill: WHITE, highlightFill: INK, highlightMode: 'box', accent: WHITE, pill: true, sizeRatio: 0.05, shadow: true, sample: 'so clean right' },
    { id: 'typewriter', name: 'Typewriter', font: 'Courier New', fontWeight: 500, caseMode: 'none', tracking: 0, fill: WHITE, highlightFill: CYAN, highlightMode: 'color', scale: 108, sizeRatio: 0.046, shadow: true, sample: 'type every word' },
  ];

  // Map a preset → the studio's flat style object (defaultStyle shape).
  window.captoPresetToStyle = function (p, meta) {
    var H = (meta && meta.height) || 1920;
    var fontSize = Math.max(12, Math.round(H * (p.sizeRatio || 0.05)));
    var ls = Math.round(fontSize * (p.tracking || 0));
    var mode = p.highlightMode || 'color';
    var box = mode === 'box';
    var glow = mode === 'glow';
    return {
      fontFamily: p.font || 'Inter',
      fontSize: fontSize,
      weight: p.fontWeight || 700,
      italic: false,
      lineHeight: 1.12,
      caseMode: p.caseMode || 'none',
      primaryColor: p.fill || WHITE,
      letterSpacing: ls,
      wordSpacing: 0,
      outlineWidth: p.outline ? Math.round(fontSize * p.outline) : 0,
      outlineColor: p.outlineColor || '#000000',
      hollow: !!p.hollow,
      gradient: !!p.gradient,
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
      highlightScale: p.scale != null ? p.scale : (box ? 104 : (mode === 'color' ? 110 : 100)),
      posX: 0.5, posY: 0.78,
      entrance: 'none', exit: 'none', animMs: 180,
      _preset: p.id,
    };
  };
})();
