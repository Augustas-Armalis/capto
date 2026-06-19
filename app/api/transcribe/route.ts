import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { getCurrentSession } from "@/lib/session";
import { getDb, userApiKey } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { env, isConfigured } from "@/lib/env";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

const GROQ_URL = "https://api.groq.com/openai/v1/audio/transcriptions";

/**
 * Transcription proxy. The browser sends the clip's audio/video; we forward it
 * to Groq Whisper with the user's key (or the house key) and return word-level
 * timing. The video itself is never stored — it lives on the user's device.
 */
async function resolveGroqKey(): Promise<string | null> {
  // Prefer the user's own key (bring-your-own-key is the promise). Only fall
  // back to the house key when the user has none, so paid users never silently
  // bill the house account.
  if (isConfigured.db()) {
    const session = await getCurrentSession();
    if (session?.user?.id) {
      const db = getDb();
      const [row] = await db
        .select({ encryptedKey: userApiKey.encryptedKey })
        .from(userApiKey)
        .where(and(eq(userApiKey.userId, session.user.id), eq(userApiKey.provider, "groq")))
        .limit(1);
      if (row) {
        try {
          const k = decrypt(row.encryptedKey);
          if (k) return k;
        } catch {
          /* fall through to house key */
        }
      }
    }
  }
  if (env.houseGroqKey) return env.houseGroqKey;
  return null;
}

export async function POST(req: Request) {
  // Throttle the AI endpoint to stop hammering / cost abuse.
  const rl = await rateLimit(`transcribe:${clientIp(req)}`, 40, 60 * 10);
  if (!rl.ok) return tooMany(rl.retryAfter);

  const key = await resolveGroqKey();
  if (!key) {
    return NextResponse.json(
      { error: "No Groq key. Add one in Settings, or set GROQ_API_KEY." },
      { status: 400 },
    );
  }

  const inForm = await req.formData().catch(() => null);
  const file = inForm?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No audio file provided." }, { status: 400 });
  }
  const language = (inForm?.get("language") as string) || "auto";

  const groqForm = new FormData();
  groqForm.append("file", file, file.name || "audio.mp4");
  groqForm.append("model", "whisper-large-v3");
  groqForm.append("response_format", "verbose_json");
  groqForm.append("timestamp_granularities[]", "word");
  groqForm.append("timestamp_granularities[]", "segment");
  // Deterministic decoding (no sampling) gives the most accurate, repeatable
  // transcript — important since captions are edited by hand afterwards.
  groqForm.append("temperature", "0");
  // A light style prompt nudges Whisper toward clean punctuation/casing, which
  // makes our sentence-aware chunking land cleaner.
  groqForm.append(
    "prompt",
    "Transcribe accurately with correct spelling, punctuation, and capitalization.",
  );
  if (language && language !== "auto") groqForm.append("language", language);

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: groqForm,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return NextResponse.json(
      { error: `Groq transcription failed (${res.status}).`, detail: detail.slice(0, 300) },
      { status: 502 },
    );
  }

  const j = (await res.json()) as {
    language?: string;
    words?: { word: string; start: number; end: number }[];
    text?: string;
  };

  return NextResponse.json({
    language: j.language || language,
    text: j.text || "",
    words: (j.words || []).map((w) => ({ word: w.word, start: w.start, end: w.end })),
  });
}
