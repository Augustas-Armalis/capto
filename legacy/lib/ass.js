// Build an ASS subtitle file from cues + a style object, and the cue
// chunking logic. Positioning uses \pos so captions can be dragged anywhere.

// ---- color helpers -------------------------------------------------------
// ASS colors are &HAABBGGRR with alpha inverted (00 = fully opaque).
function hexToAss(hex, alpha = 0) {
  const h = (hex || '#FFFFFF').replace('#', '');
  const r = h.slice(0, 2), g = h.slice(2, 4), b = h.slice(4, 6);
  const a = Math.round(alpha).toString(16).padStart(2, '0').toUpperCase();
  return `&H${a}${b}${g}${r}`.toUpperCase();
}

// seconds -> H:MM:SS.CC  (centiseconds)
function assTime(t) {
  if (t < 0) t = 0;
  const cs = Math.round(t * 100);
  const h = Math.floor(cs / 360000);
  const m = Math.floor((cs % 360000) / 6000);
  const s = Math.floor((cs % 6000) / 100);
  const c = cs % 100;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(c).padStart(2, '0')}`;
}

function esc(text) {
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/\{/g, '(')
    .replace(/\}/g, ')')
    .replace(/\r?\n/g, '\\N');
}

// Case transform shared with the front-end.
export function applyCase(text, mode) {
  switch (mode) {
    case 'lower': return text.toLocaleLowerCase();
    case 'upper': return text.toLocaleUpperCase();
    case 'title': return text.replace(/\S+/g, (w) => w.charAt(0).toLocaleUpperCase() + w.slice(1).toLocaleLowerCase());
    case 'sentence':
    default: return text; // keep as transcribed/typed (Whisper already sentence-cases)
  }
}

// Chunk a flat list of {word,start,end} into short caption cues, then
// extend each cue to hold through short pauses (less flicker).
export function wordsToCues(words, opts = {}) {
  // Tight timing so captions feel snappy + on-point:
  //  - leadIn 40ms: caption appears a hair before the first word (perceived as in-sync, not "late")
  //  - holdMax  80ms: barely hold past the last word (just enough to avoid 1-frame flickers between adjacent cues)
  //  - minDur  0.35s: short minimum so quick words don't linger forever
  // Snappier defaults: shorter cues (less chance of overflow on portrait video),
  // bigger lead-in so captions feel exactly on-the-word (Whisper word timings
  // tend to lag ~100ms behind the audible onset).
  const { maxWords = 4, maxChars = 18, maxDuration = 2.2, maxGap = 0.7,
          maxHold = 0.5, minDur = 0.30, leadIn = 0.15, totalDuration = Infinity } = opts;
  const cues = [];
  let cur = null;
  const flush = () => { if (cur && cur.words.length) cues.push(cur); cur = null; };

  for (const w of words) {
    const word = (w.word ?? '').trim();
    if (!word) continue;
    if (!cur) { cur = { start: w.start, end: w.end, chars: word.length, words: [w] }; continue; }
    const gap = w.start - cur.end;
    const dur = w.end - cur.start;
    const last = cur.words[cur.words.length - 1].word?.trim() || '';
    const endsSentence = /[.!?…]$/.test(last);
    const tooLong = cur.words.length >= maxWords || (cur.chars + 1 + word.length) > maxChars || dur > maxDuration;
    if (tooLong || gap > maxGap || endsSentence) {
      flush();
      cur = { start: w.start, end: w.end, chars: word.length, words: [w] };
    } else {
      cur.words.push(w); cur.end = w.end; cur.chars += 1 + word.length;
    }
  }
  flush();

  // Timing pass:
  //  1) Pull every caption ~150ms EARLIER (leadIn) — Whisper word starts lag the
  //     audible onset, so this makes captions feel exactly on-the-word, not late.
  //  2) FILL GAPS: extend each caption's end toward the next caption's (lead-in'd)
  //     start, up to maxHold (0.5s). Removes the random blank flashes between words
  //     during short pauses, while long silences still clear the caption.
  const lead = cues.map((c) => Math.max(0, c.start - leadIn));
  for (let i = 0; i < cues.length; i++) {
    const c = cues[i];
    const nextLead = i + 1 < cues.length ? lead[i + 1] : totalDuration;
    c.start = lead[i];
    c.end = Math.min(nextLead, c.end + maxHold);     // fill short gaps, never overlap next
    if (c.end - c.start < minDur) c.end = Math.min(nextLead, c.start + minDur);
    if (c.end <= c.start) c.end = c.start + minDur;
  }

  // Comma sweep: Whisper has a habit of sprinkling commas inside short bursts
  // of speech ("Hi, everyone, today, I want to") — strip the noisy ones. We keep:
  //   • A comma followed by AND/BUT/OR/SO/BECAUSE (real clause break)
  //   • A comma BEFORE the cue ends (terminal punctuation is preserved by the
  //     ASS escape layer, but we keep it on the LAST word of the cue too)
  // Everything else drops to a clean space — much less stutter, no missing words.
  const tidy = (words) => {
    for (let k = 0; k + 1 < words.length; k++) {
      const w = words[k].word.trim();
      if (/[,]$/.test(w)) {
        const next = (words[k + 1].word || '').trim().toLowerCase();
        const KEEP = new Set(['and','but','or','so','because','though','although','however','yet','then']);
        if (!KEEP.has(next)) words[k].word = w.replace(/,+$/, '');
      }
    }
    return words;
  };
  return cues.map((c, i) => {
    const ws = tidy(c.words.map((w) => ({ word: w.word.trim(), start: w.start, end: w.end })));
    return {
      id: `c${i}`,
      start: c.start,
      end: c.end,
      text: ws.map((w) => w.word).join(' ').replace(/\s+/g, ' ').trim(),
      words: ws,
    };
  });
}

const DEFAULT_STYLE = {
  fontFamily: 'Inter',
  fontSize: 64,
  bold: true,
  italic: false,
  caseMode: 'sentence',
  primaryColor: '#FFFFFF',
  letterSpacing: -4,
  outlineWidth: 0,
  outlineColor: '#000000',
  shadowEnabled: true,
  shadowColor: '#000000',
  shadowOpacity: 45,
  shadowDistance: 6,
  shadowBlur: 8,
  highlightEnabled: false,
  highlightColor: '#C4B5FD',
  highlightScale: 100,
  posX: 0.5,
  posY: 0.82,
};

// Build the full .ass document. video = { width, height }
// libass selects font weight by family name. Map a numeric weight (300–900) to
// the matching bundled face. Inter has 7 static weights; other fonts fall back
// to their single face + the Bold flag for heavier weights.
const INTER_FACES = { 300: 'Inter Light', 400: 'Inter', 500: 'Inter Medium', 600: 'Inter SemiBold', 700: 'Inter', 800: 'Inter ExtraBold', 900: 'Inter Black' };
function resolveFontFace(family, weight) {
  const w = Math.min(900, Math.max(300, Math.round(weight / 100) * 100));
  if (family === 'Inter') {
    return { fontname: INTER_FACES[w] || 'Inter', bold: w === 700 ? -1 : 0 };
  }
  // Display fonts (Anton, Bebas, etc.) are single-weight — emulate via Bold flag.
  return { fontname: family, bold: w >= 600 ? -1 : 0 };
}

export function buildAss(cues, style, video) {
  const W = video.width || 1080;
  const H = video.height || 1920;
  const s = { ...DEFAULT_STYLE, ...style };

  const primary = hexToAss(s.primaryColor);
  const outline = hexToAss(s.outlineColor);
  const shadowAlpha = s.shadowEnabled ? Math.round(255 * (1 - (s.shadowOpacity ?? 45) / 100)) : 255;
  const back = hexToAss(s.shadowColor || '#000000', shadowAlpha);
  // Numeric font weight (300–900). libass selects weight by the font FAMILY NAME,
  // not a numeric field — so we map the weight to the matching bundled face name.
  const weight = typeof s.weight === 'number' ? Math.round(s.weight) : (s.bold ? 700 : 400);
  const resolved = resolveFontFace(s.fontFamily, weight);
  const fontName = resolved.fontname;
  const bold = resolved.bold;
  const italic = s.italic ? -1 : 0;
  // Shadow is rendered as its own blurred layer BEHIND the text (below), so the
  // main text stays perfectly crisp. The Style's own Shadow field is therefore 0.
  const shadowDepth = 0;
  const shDist = s.shadowEnabled ? Math.max(1, Math.round(s.shadowDistance ?? 4)) : 0;
  const shBlur = s.shadowEnabled ? Math.max(0, +(s.shadowBlur ?? 0)) : 0;
  const colorBGR = (hex) => { const h = (hex || '#000000').replace('#', ''); return `&H${h.slice(4, 6)}${h.slice(2, 4)}${h.slice(0, 2)}&`.toUpperCase(); };
  const alphaHex = (opPct) => `&H${Math.round(255 * (1 - (opPct ?? 60) / 100)).toString(16).padStart(2, '0').toUpperCase()}&`;
  // Horizontal margins set the wrap width. If the user set an explicit box width,
  // derive the margins from it; otherwise default to 5% each side.
  const marginH = (typeof s.boxWidth === 'number' && s.boxWidth > 0)
    ? Math.max(0, Math.round(W * (1 - Math.min(1, s.boxWidth)) / 2))
    : Math.round(W * 0.05);

  const header = [
    '[Script Info]',
    'ScriptType: v4.00+',
    'WrapStyle: 0',
    'ScaledBorderAndShadow: yes',
    `PlayResX: ${W}`,
    `PlayResY: ${H}`,
    '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    `Style: Default,${fontName},${s.fontSize},${primary},${primary},${outline},${back},${bold},${italic},0,0,100,100,0,0,1,${s.outlineWidth},${shadowDepth},5,${marginH},${marginH},40,1`,
    '',
    '[Events]',
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
  ].join('\n');

  const cx = Math.round((s.posX ?? 0.5) * W);
  const rowLift = s.fontSize * 2.4;
  const animMs = Math.max(0, Math.min(1500, s.animMs || 0));
  const entrance = s.entrance || 'none', exit = s.exit || 'none';
  // For slide entrances we use \move from offset to final position over animMs;
  // for fade we use \fad(in,out); for pop we use \t scale.
  function intro(cue) {
    const yFinal = Math.round((s.posY ?? 0.82) * H - (cue.row || 0) * rowLift);
    const fadeIn = entrance === 'fade' ? animMs : 0;
    const fadeOut = exit === 'fade' ? animMs : 0;
    const fadTag = (fadeIn || fadeOut) ? `\\fad(${fadeIn},${fadeOut})` : '';
    if (entrance === 'slide-up')   { const dy = Math.round(H * 0.04); return `\\move(${cx},${yFinal + dy},${cx},${yFinal},0,${animMs})${fadTag}`; }
    if (entrance === 'slide-down') { const dy = Math.round(H * 0.04); return `\\move(${cx},${yFinal - dy},${cx},${yFinal},0,${animMs})${fadTag}`; }
    if (entrance === 'pop')        return `\\pos(${cx},${yFinal})\\fscx70\\fscy70\\t(0,${animMs},\\fscx100\\fscy100)${fadTag}`;
    return `\\pos(${cx},${yFinal})${fadTag}`;
  }
  // Letter spacing via inline \fsp — libass CLAMPS negative Style "Spacing" to 0,
  // but the \fsp override honors negative values (the tight look from the preview).
  const fsp = `\\fsp${(+(s.letterSpacing ?? 0)).toFixed(2)}`;
  const posTagFor = (cue) => `\\an5${intro(cue)}${fsp}`;   // main text — NO blur (stays crisp)
  // A separate, blurred, offset shadow copy of the full cue text on a lower layer.
  function shadowTag(cue) {
    const yFinal = Math.round((s.posY ?? 0.82) * H - (cue.row || 0) * rowLift);
    return `\\an5\\pos(${cx + shDist},${yFinal + shDist})${fsp}\\1c${colorBGR(s.shadowColor)}\\alpha${alphaHex(s.shadowOpacity)}\\bord0\\shad0${shBlur > 0 ? `\\blur${shBlur.toFixed(1)}` : ''}`;
  }
  const xform = (t) => applyCase(t, s.caseMode);
  const hi = hexToAss(s.highlightColor);
  const hiScale = s.highlightScale && s.highlightScale !== 100 ? `\\fscx${s.highlightScale}\\fscy${s.highlightScale}` : '';
  const lines = [];

  const lh = typeof s.lineHeight === 'number' ? s.lineHeight : 1.1;
  const baseY = (cue) => Math.round((s.posY ?? 0.82) * H - (cue.row || 0) * rowLift);
  const fadFor = (cue) => {
    const fi = (s.entrance === 'fade') ? animMs : 0, fo = (s.exit === 'fade') ? animMs : 0;
    return (fi || fo) ? `\\fad(${fi},${fo})` : '';
  };

  for (const cue of cues) {
    const posTag = posTagFor(cue);
    const words = (cue.words && cue.words.length)
      ? cue.words
      : [{ word: cue.text, start: cue.start, end: cue.end }];

    const textLines = String(xform(cue.text)).split('\n');

    // Multi-line (manual breaks): position each line ourselves so line-height is honored.
    if (textLines.length > 1) {
      const N = textLines.length, gap = s.fontSize * lh, fad = fadFor(cue);
      textLines.forEach((ln, k) => {
        const ly = Math.round(baseY(cue) + (k - (N - 1) / 2) * gap);
        if (s.shadowEnabled) lines.push(dialogue(0, cue.start, cue.end, `{\\an5\\pos(${cx + shDist},${ly + shDist})${fsp}\\1c${colorBGR(s.shadowColor)}\\alpha${alphaHex(s.shadowOpacity)}\\bord0\\shad0${shBlur > 0 ? `\\blur${shBlur.toFixed(1)}` : ''}}${esc(ln)}`));
        lines.push(dialogue(1, cue.start, cue.end, `{\\an5\\pos(${cx},${ly})${fsp}${fad}}${esc(ln)}`));
      });
      continue;
    }

    // Shadow layer (layer 0, behind) — one blurred copy of the whole cue.
    if (s.shadowEnabled) lines.push(dialogue(0, cue.start, cue.end, `{${shadowTag(cue)}}${esc(xform(cue.text))}`));

    // Main text (layer 1, on top, crisp)
    if (!s.highlightEnabled || words.length <= 1) {
      lines.push(dialogue(1, cue.start, cue.end, `{${posTag}}${esc(xform(cue.text))}`));
      continue;
    }

    const boundaries = [];
    if (words[0].start > cue.start + 0.02) boundaries.push({ from: cue.start, to: words[0].start, active: -1 });
    for (let i = 0; i < words.length; i++) {
      const from = words[i].start;
      const to = (i + 1 < words.length) ? words[i + 1].start : cue.end;
      boundaries.push({ from, to: Math.max(to, from + 0.04), active: i });
    }
    for (const b of boundaries) {
      const parts = words.map((w, i) => {
        const t = esc(xform(w.word));
        return (i === b.active) ? `{\\c${hi}${hiScale}}${t}{\\c${primary}\\fscx100\\fscy100}` : t;
      });
      lines.push(dialogue(1, b.from, b.to, `{${posTag}}${parts.join(' ')}`));
    }
  }

  return `${header}\n${lines.join('\n')}\n`;

  function dialogue(layer, start, end, text) {
    return `Dialogue: ${layer},${assTime(start)},${assTime(end)},Default,,0,0,0,,${text}`;
  }
}
