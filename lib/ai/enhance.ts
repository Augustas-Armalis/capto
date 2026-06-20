// Premium caption enhancement powered by Gemini. These operate on caption TEXT
// only (never audio): translate to another language, or sprinkle tasteful emoji.
// Timing is preserved by re-distributing the new words across each cue's span.

import { ENHANCE_MODEL } from "./models";

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models";

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
  try {
    return JSON.parse(text);
  } catch {
    // Models sometimes wrap JSON in prose/fences — salvage the array.
    const m = text.match(/\[[\s\S]*\]/);
    if (m) return JSON.parse(m[0]);
    throw new Error("Gemini returned unparseable output.");
  }
}

const LANGS: Record<string, string> = {
  en: "English", es: "Spanish", fr: "French", de: "German", pt: "Portuguese",
  it: "Italian", nl: "Dutch", hi: "Hindi", ja: "Japanese", ko: "Korean",
  zh: "Chinese", ar: "Arabic", ru: "Russian", tr: "Turkish", pl: "Polish",
};

export function languageName(code: string): string {
  return LANGS[code] || code;
}

/** Translate an array of caption lines; returns a same-length array of strings. */
export async function translateLines(
  apiKey: string,
  lines: string[],
  targetCode: string,
): Promise<string[]> {
  const target = languageName(targetCode);
  const out = (await geminiJson(
    apiKey,
    `Translate each caption line into ${target}. Keep it punchy and natural for short-form video subtitles. Return ONLY a JSON array of strings, exactly ${lines.length} items, in the same order. Do not merge or split lines.`,
    lines,
  )) as unknown;
  if (!Array.isArray(out)) throw new Error("Bad translation output.");
  return lines.map((orig, i) => (typeof out[i] === "string" && out[i].trim() ? String(out[i]) : orig));
}

/** Add at most one tasteful emoji to some lines; returns same-length array. */
export async function emojiLines(apiKey: string, lines: string[]): Promise<string[]> {
  const out = (await geminiJson(
    apiKey,
    `For each short caption line, optionally append ONE relevant emoji at the end if it fits naturally (otherwise return the line unchanged). Keep the original words. Do not add more than one emoji. Return ONLY a JSON array of strings, exactly ${lines.length} items, same order.`,
    lines,
  )) as unknown;
  if (!Array.isArray(out)) throw new Error("Bad emoji output.");
  return lines.map((orig, i) => (typeof out[i] === "string" && out[i].trim() ? String(out[i]) : orig));
}
