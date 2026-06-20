// Server-side transcription dispatch. Every provider is normalised to the same
// { words, text, language } shape (word-level timing is the whole point), so the
// rest of the app never cares which engine ran. Audio is forwarded straight to
// the provider and never persisted — it lives only on the user's device.

import type { SttModel } from "./models";

export type Word = { word: string; start: number; end: number };
export type TranscriptResult = {
  words: Word[];
  text: string;
  language: string;
};

export type TranscribeInput = {
  model: SttModel;
  apiKey: string;
  file: File;
  language: string; // "auto" or ISO code
  /** learned vocabulary / spelling hints to bias the model */
  prompt?: string;
  vocabulary?: string[];
};

// OpenAI-compatible multipart Whisper API (Groq + OpenAI both speak this).
async function whisperCompatible(
  baseUrl: string,
  input: TranscribeInput,
): Promise<TranscriptResult> {
  const { model, apiKey, file, language, prompt } = input;
  const form = new FormData();
  form.append("file", file, file.name || "audio.mp4");
  form.append("model", model.apiModel);
  form.append("response_format", "verbose_json");
  form.append("timestamp_granularities[]", "word");
  form.append("timestamp_granularities[]", "segment");
  form.append("temperature", "0");
  if (prompt) form.append("prompt", prompt);
  if (language && language !== "auto") form.append("language", language);

  const res = await fetch(`${baseUrl}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new TranscribeError(res.status, detail);
  }
  const j = (await res.json()) as {
    language?: string;
    text?: string;
    words?: { word: string; start: number; end: number }[];
  };
  return {
    language: j.language || language,
    text: j.text || "",
    words: (j.words || []).map((w) => ({ word: w.word, start: w.start, end: w.end })),
  };
}

// Deepgram speaks a different protocol: raw audio body + JSON response.
async function deepgram(input: TranscribeInput): Promise<TranscriptResult> {
  const { model, apiKey, file, language, vocabulary } = input;
  const params = new URLSearchParams({
    model: model.apiModel,
    smart_format: "true",
    punctuate: "true",
  });
  if (language && language !== "auto") params.set("language", language);
  else params.set("detect_language", "true");
  // Bias toward the user's learned terms.
  for (const term of (vocabulary || []).slice(0, 50)) {
    params.append("keyterm", term);
  }

  const buf = await file.arrayBuffer();
  const res = await fetch(`https://api.deepgram.com/v1/listen?${params.toString()}`, {
    method: "POST",
    headers: {
      Authorization: `Token ${apiKey}`,
      "content-type": file.type || "audio/mp4",
    },
    body: buf,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new TranscribeError(res.status, detail);
  }
  const j = (await res.json()) as {
    results?: {
      channels?: {
        alternatives?: {
          transcript?: string;
          words?: { word: string; start: number; end: number; punctuated_word?: string }[];
        }[];
        detected_language?: string;
      }[];
    };
  };
  const alt = j.results?.channels?.[0]?.alternatives?.[0];
  const detected = j.results?.channels?.[0]?.detected_language;
  return {
    language: detected || language,
    text: alt?.transcript || "",
    words: (alt?.words || []).map((w) => ({
      word: w.punctuated_word || w.word,
      start: w.start,
      end: w.end,
    })),
  };
}

export class TranscribeError extends Error {
  status: number;
  detail: string;
  constructor(status: number, detail: string) {
    super(`Transcription failed (${status}).`);
    this.status = status;
    this.detail = (detail || "").slice(0, 300);
  }
}

export async function runTranscription(input: TranscribeInput): Promise<TranscriptResult> {
  switch (input.model.provider) {
    case "groq":
      return whisperCompatible("https://api.groq.com/openai/v1", input);
    case "openai":
      return whisperCompatible("https://api.openai.com/v1", input);
    case "deepgram":
      return deepgram(input);
    default:
      throw new Error(`Provider ${input.model.provider} cannot transcribe.`);
  }
}
