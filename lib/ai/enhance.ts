// Caption enhancement. These operate on caption TEXT only (never audio): clean up
// transcription errors, translate to another language, or sprinkle tasteful emoji.
// Groq (Llama 3.3 70B) is the default brain on a house key for everyone — it's
// cheap/free-tier and fast. Gemini is the fallback. Claude support is available
// when an Anthropic key is configured. Timing is preserved by re-distributing
// words across each cue's span.

import { ENHANCE_MODEL, ANTHROPIC_ENHANCE_MODEL, GROQ_ENHANCE_MODEL } from "./models";

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

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

/** Which engine to run an enhancement on. Priority: Groq (cheapest, free tier,
 * fast Llama 3.3 70B) → Claude → Gemini. The route resolves whichever keys are
 * available and we pick in that order. */
export type EnhanceEngine = { groqKey?: string; anthropicKey?: string; geminiKey?: string };

async function groqCall(apiKey: string, instruction: string, payload: unknown, jsonMode: boolean): Promise<string> {
  const body: Record<string, unknown> = {
    model: GROQ_ENHANCE_MODEL,
    temperature: 0.3,
    messages: [
      {
        role: "system",
        content:
          'Return ONLY valid JSON. The response must be a JSON object with a single key "lines" whose value is an array of strings in the requested order.',
      },
      {
        role: "user",
        content: `${instruction}\n\nINPUT:\n${JSON.stringify(payload)}\n\nRespond as {"lines": [...]}.`,
      },
    ],
  };
  if (jsonMode) body.response_format = { type: "json_object" };
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Groq failed (${res.status}). ${detail.slice(0, 200)}`);
  }
  const j = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return j.choices?.[0]?.message?.content || "";
}

function unwrapLines(text: string): unknown {
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && Array.isArray(parsed.lines)) return parsed.lines;
  } catch { /* fall through */ }
  const loose = parseJsonLoose(text, "Groq");
  if (Array.isArray(loose)) return loose;
  if (loose && typeof loose === "object" && Array.isArray((loose as { lines?: unknown }).lines)) {
    return (loose as { lines: unknown[] }).lines;
  }
  throw new Error("Groq returned unexpected shape.");
}

async function groqJson(apiKey: string, instruction: string, payload: unknown): Promise<unknown> {
  // Try strict JSON mode first; if the model/endpoint rejects response_format,
  // retry once in plain mode and salvage the array — so Polish never silently no-ops.
  try {
    return unwrapLines(await groqCall(apiKey, instruction, payload, true));
  } catch {
    return unwrapLines(await groqCall(apiKey, instruction, payload, false));
  }
}

async function runEnhance(
  opts: EnhanceEngine,
  instruction: string,
  payload: unknown,
): Promise<unknown> {
  if (opts.groqKey && opts.groqKey.length > 10) {
    return groqJson(opts.groqKey, instruction, payload);
  }
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
