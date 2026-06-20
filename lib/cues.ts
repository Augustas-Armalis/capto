// Caption cue model + chunking. Ported from the legacy desktop app (lib/ass.js)
// to run fully in the browser: a flat word list from transcription becomes
// short, snappy caption cues with word-level timing for karaoke highlighting.

export type Word = { word: string; start: number; end: number };

export type Cue = {
  id: string;
  start: number;
  end: number;
  text: string;
  words: Word[];
};

export type ChunkOpts = {
  maxWords?: number;
  maxChars?: number;
  maxDuration?: number;
  maxGap?: number;
  maxHold?: number;
  minDur?: number;
  leadIn?: number;
  totalDuration?: number;
};

/**
 * Chunk a flat list of {word,start,end} into short caption cues, then extend
 * each cue to hold through short pauses (less flicker). Defaults tuned for
 * short-form vertical video: snappy, on-the-word, two-to-four words per cue.
 */
export function wordsToCues(words: Word[], opts: ChunkOpts = {}): Cue[] {
  const {
    maxWords = 4,
    maxChars = 18,
    maxDuration = 2.2,
    maxGap = 0.7,
    maxHold = 0.5,
    minDur = 0.3,
    leadIn = 0.15,
    totalDuration = Infinity,
  } = opts;

  type Acc = { start: number; end: number; chars: number; words: Word[] };
  const cues: Acc[] = [];
  let cur: Acc | null = null;
  const flush = () => {
    if (cur && cur.words.length) cues.push(cur);
    cur = null;
  };

  for (const w of words) {
    const word = (w.word ?? "").trim();
    if (!word) continue;
    if (!cur) {
      cur = { start: w.start, end: w.end, chars: word.length, words: [w] };
      continue;
    }
    const gap = w.start - cur.end;
    const dur = w.end - cur.start;
    const last = cur.words[cur.words.length - 1].word?.trim() || "";
    const endsSentence = /[.!?…]$/.test(last);
    const tooLong =
      cur.words.length >= maxWords ||
      cur.chars + 1 + word.length > maxChars ||
      dur > maxDuration;
    if (tooLong || gap > maxGap || endsSentence) {
      flush();
      cur = { start: w.start, end: w.end, chars: word.length, words: [w] };
    } else {
      cur.words.push(w);
      cur.end = w.end;
      cur.chars += 1 + word.length;
    }
  }
  flush();

  // Timing pass: pull each cue ~150ms earlier (Whisper word starts lag the
  // audible onset), then fill short gaps toward the next cue so captions don't
  // blink during brief pauses, while long silences still clear the caption.
  const lead = cues.map((c) => Math.max(0, c.start - leadIn));
  for (let i = 0; i < cues.length; i++) {
    const c = cues[i];
    const nextLead = i + 1 < cues.length ? lead[i + 1] : totalDuration;
    c.start = lead[i];
    c.end = Math.min(nextLead, c.end + maxHold);
    if (c.end - c.start < minDur) c.end = Math.min(nextLead, c.start + minDur);
    if (c.end <= c.start) c.end = c.start + minDur;
  }

  // Comma sweep: Whisper sprinkles commas inside short bursts ("Hi, everyone,
  // today,"). Strip the noisy ones; keep commas before a real clause break.
  const KEEP = new Set([
    "and", "but", "or", "so", "because", "though", "although", "however", "yet", "then",
  ]);
  const tidy = (ws: Word[]) => {
    for (let k = 0; k + 1 < ws.length; k++) {
      const w = ws[k].word.trim();
      if (/[,]$/.test(w)) {
        const next = (ws[k + 1].word || "").trim().toLowerCase();
        if (!KEEP.has(next)) ws[k].word = w.replace(/,+$/, "");
      }
    }
    return ws;
  };

  return cues.map((c, i) => {
    const ws = tidy(
      c.words.map((w) => ({ word: w.word.trim(), start: w.start, end: w.end })),
    );
    return {
      id: `c${i}`,
      start: c.start,
      end: c.end,
      text: ws.map((w) => w.word).join(" ").replace(/\s+/g, " ").trim(),
      words: ws,
    };
  });
}

/** Evenly distribute a new caption text across an existing [start,end] span. */
export function evenWords(text: string, start: number, end: number): Word[] {
  const parts = text.split(/\s+/).filter(Boolean);
  if (!parts.length) return [];
  const span = Math.max(0.001, end - start);
  return parts.map((w, i) => ({
    word: w,
    start: start + (span * i) / parts.length,
    end: start + (span * (i + 1)) / parts.length,
  }));
}

/** Rebuild a cue with new text, keeping its timing window. */
export function retimeCue(cue: Cue, newText: string): Cue {
  const clean = newText.replace(/\s+/g, " ").trim();
  return { ...cue, text: clean, words: evenWords(clean, cue.start, cue.end) };
}

/** Which cue (if any) is active at time t. */
export function activeCueIndex(cues: Cue[], t: number): number {
  for (let i = 0; i < cues.length; i++) {
    if (t >= cues[i].start && t < cues[i].end) return i;
  }
  return -1;
}

/** Which word within a cue is active at time t (for karaoke highlight). */
export function activeWordIndex(cue: Cue, t: number): number {
  const ws = cue.words;
  if (!ws.length) return -1;
  for (let i = 0; i < ws.length; i++) {
    const from = ws[i].start;
    const to = i + 1 < ws.length ? ws[i + 1].start : cue.end;
    if (t >= from && t < to) return i;
  }
  // Before the first word's start but cue is showing -> highlight first word.
  if (t < ws[0].start) return 0;
  return ws.length - 1;
}

/** mm:ss for UI labels. */
export function fmtTime(sec: number): string {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** mm:ss.cs for finer cue editing. */
export function fmtTimeCs(sec: number): string {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const cs = Math.floor((sec % 1) * 100);
  return `${m}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}
