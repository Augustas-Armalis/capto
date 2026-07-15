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
    // A focused, production set: clear hierarchy, strong contrast, and distinct
    // use cases instead of many near-duplicates.
    { id: 'inter', name: 'Capto Clean', fontWeight: 600, caseMode: 'none', tracking: -0.032, fill: WHITE, highlight: false, scale: 100, sizeRatio: 0.043, shadow: true, popular: true, sample: 'clear by default' },
    { id: 'inter-focus', name: 'Focus Yellow', fontWeight: 700, caseMode: 'none', tracking: -0.03, fill: WHITE, highlightFill: YELLOW, highlightMode: 'color', scale: 100, sizeRatio: 0.044, shadow: true, popular: true, sample: 'make every word land' },
    { id: 'signal', name: 'Signal', fontWeight: 800, caseMode: 'upper', tracking: -0.025, fill: WHITE, highlightFill: INK, highlightMode: 'box', accent: YELLOW, scale: 100, sizeRatio: 0.047, shadow: true, popular: true, sample: 'this changes everything' },
    { id: 'violet-pill', name: 'Violet Pill', fontWeight: 700, caseMode: 'none', tracking: -0.025, fill: WHITE, highlightFill: WHITE, highlightMode: 'box', accent: '#7C5CFF', pill: true, scale: 100, sizeRatio: 0.043, shadow: true, sample: 'follow the thought' },
    { id: 'soft-glow', name: 'Soft Glow', fontWeight: 600, caseMode: 'none', tracking: -0.025, fill: WHITE, highlightFill: CYAN, highlightMode: 'glow', accent: CYAN, scale: 100, sizeRatio: 0.043, shadow: true, sample: 'light in motion' },
    { id: 'editorial-serif', name: 'Editorial Serif', font: 'Georgia', italic: true, fontWeight: 600, caseMode: 'none', tracking: -0.025, fill: WHITE, highlightFill: '#FFE7A8', highlightMode: 'color', scale: 100, sizeRatio: 0.042, shadow: true, sample: 'a quieter kind of confidence' },
    { id: 'word-by-word', name: 'One Word', fontWeight: 800, caseMode: 'upper', tracking: -0.025, fill: WHITE, highlightFill: YELLOW, highlightMode: 'color', singleWord: true, scale: 100, sizeRatio: 0.058, shadow: true, sample: 'every word matters' },
    { id: 'underline', name: 'Underline', fontWeight: 600, caseMode: 'none', tracking: -0.03, fill: '#F8F8FA', highlightFill: WHITE, highlightMode: 'underline', accent: CYAN, scale: 100, sizeRatio: 0.041, shadow: true, sample: 'simple stays readable' },
    { id: 'impact', name: 'Impact', font: 'Anton', fontWeight: 700, caseMode: 'upper', tracking: -0.015, fill: WHITE, highlightFill: INK, highlightMode: 'box', accent: '#B9FF66', outline: 0.018, scale: 100, sizeRatio: 0.052, shadow: true, sample: 'stop the scroll' },
    { id: 'gradient', name: 'Aurora', fontWeight: 800, caseMode: 'upper', tracking: -0.025, fill: WHITE, highlightFill: WHITE, highlightMode: 'glow', accent: VIOLET, gradient: true, scale: 100, sizeRatio: 0.047, shadow: true, sample: 'colour with control' },
    { id: 'outline', name: 'Outline', fontWeight: 800, caseMode: 'upper', tracking: -0.02, fill: WHITE, highlightFill: WHITE, highlightMode: 'color', hollow: true, scale: 100, sizeRatio: 0.049, shadow: false, sample: 'bold without the block' },
    { id: 'mono', name: 'Mono Note', font: 'Courier New', fontWeight: 700, caseMode: 'none', tracking: -0.01, fill: WHITE, highlightFill: '#B9FF66', highlightMode: 'color', scale: 100, sizeRatio: 0.039, shadow: true, sample: 'document the moment' },
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
      italic: !!p.italic,
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
      // highlight:false → plain captions, no karaoke colouring (the Inter default).
      highlightEnabled: p.highlight !== false,
      highlightMode: mode,
      highlightColor: box ? (p.highlightFill || INK) : (p.highlightFill || p.accent || p.fill || WHITE),
      highlightBg: p.accent || YELLOW,
      highlightPill: !!p.pill,
      highlightScale: p.scale != null ? p.scale : (box ? 104 : (mode === 'color' ? 110 : 100)),
      singleWord: !!p.singleWord,
      // Wide, easy-to-grab text box by default (matches defaultStyle) so captions
      // are movable/resizable straight away, whichever preset you pick.
      boxWidth: 0.84,
      posX: 0.5, posY: 0.72,
      entrance: 'none', exit: 'none', animMs: 180,
      _preset: p.id,
    };
  };
})();
