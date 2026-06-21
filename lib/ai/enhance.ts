// Caption enhancement. These operate on caption TEXT only (never audio): clean up
// transcription errors, translate to another language, or sprinkle tasteful emoji.
// Claude (Anthropic) is the default brain on a house key for everyone; Gemini is
// the fallback. Timing is preserved by re-distributing words across each cue span.

import { ENHANCE_MODEL, ANTHROPIC_ENHANCE_MODEL } from "./models";

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

/** Salvage a JSON value from model output that may be wrapped in prose/fences. */
function parseJsonLoose(text: string, engine: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    // Models sometimes wrap JSON in prose/fences — salvage the array.
    const m = text.match(/\[[\s\S]*\]/);
    if (m) return JSON.parse(m[0]);
    throw new Error(`${engine} returned unparseable output.`);
  }
}

async function geminiJson(apiKey: string, instruction: string, payload: unknown): Promise<unknown> {
  const res = await fetch(`${GEMINI_URL}/${ENHANCE_MODEL}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: `${instruction}\n\nINPUT:\n${JSON.stringify(payload)}` }] }],
      generationConfig: { temperature: 0.4, responseMimeType: "application/json" },
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Gemini failed (${res.status}). ${detail.slice(0, 200)}`);
  }
  const j = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = j.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return parseJsonLoose(text, "Gemini");
}

async function anthropicJson(apiKey: string, instruction: string, payload: unknown): Promise<unknown> {
  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: ANTHROPIC_ENHANCE_MODEL,
      max_tokens: 4096,
      messages: [
        { role: "user", content: `${instruction}\n\nINPUT:\n${JSON.stringify(payload)}` },
      ],
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Anthropic failed (${res.status}). ${detail.slice(0, 200)}`);
  }
  const j = (await res.json()) as {
    content?: { type?: string; text?: string }[];
  };
  const text = j.content?.[0]?.text || "";
  return parseJsonLoose(text, "Anthropic");
}

/** Which engine to run an enhancement on. Claude when an Anthropic key is set,
 * otherwise Gemini. The route resolves exactly one of these per request. */
export type EnhanceEngine = { anthropicKey?: string; geminiKey?: string };

async function runEnhance(
  opts: EnhanceEngine,
  instruction: string,
  payload: unknown,
): Promise<unknown> {
  if (opts.anthropicKey && opts.anthropicKey.length > 10) {
    return anthropicJson(opts.anthropicKey, instruction, payload);
  }
  if (opts.geminiKey && opts.geminiKey.length > 10) {
    return geminiJson(opts.geminiKey, instruction, payload);
  }
  throw new Error("No enhancement key provided.");
}

const LANGS: Record<string, string> = {
  en: "English", es: "Spanish", fr: "French", de: "German", pt: "Portuguese",
  it: "Italian", nl: "Dutch", hi: "Hindi", ja: "Japanese", ko: "Korean",
  zh: "Chinese", ar: "Arabic", ru: "Russian", tr: "Turkish", pl: "Polish",
};

export function languageName(code: string): string {
  return LANGS[code] || code;
}

/** Map model output back onto the inputs, preserving array length: any item that
 * isn't a usable non-empty string falls back to the original line. */
function sameLength(lines: string[], out: unknown): string[] {
  if (!Array.isArray(out)) throw new Error("Bad enhancement output.");
  return lines.map((orig, i) =>
    typeof out[i] === "string" && out[i].trim() ? String(out[i]) : orig,
  );
}

/** Translate an array of caption lines; returns a same-length array of strings. */
export async function translateLines(
  opts: EnhanceEngine,
  lines: string[],
  targetCode: string,
): Promise<string[]> {
  const target = languageName(targetCode);
  const out = await runEnhance(
    opts,
    `Translate each caption line into ${target}. Keep it punchy and natural for short-form video subtitles. Return ONLY a JSON array of strings, exactly ${lines.length} items, in the same order. Do not merge or split lines.`,
    lines,
  );
  return sameLength(lines, out);
}

/** Add at most one tasteful emoji to some lines; returns same-length array. */
export async function emojiLines(opts: EnhanceEngine, lines: string[]): Promise<string[]> {
  const out = await runEnhance(
    opts,
    `For each short caption line, optionally append ONE relevant emoji at the end if it fits naturally (otherwise return the line unchanged). Keep the original words. Do not add more than one emoji. Return ONLY a JSON array of strings, exactly ${lines.length} items, same order.`,
    lines,
  );
  return sameLength(lines, out);
}

/** Fix transcription errors in each line without changing wording or meaning. */
export async function cleanupLines(opts: EnhanceEngine, lines: string[]): Promise<string[]> {
  const out = await runEnhance(
    opts,
    `Fix transcription errors in each caption line: correct punctuation, capitalization, obvious misheard words, and spacing. Keep the SAME wording and meaning — do not paraphrase, translate, merge, or split. Return ONLY a JSON array of strings, exactly ${lines.length} items, same order.`,
    lines,
  );
  return sameLength(lines, out);
}
