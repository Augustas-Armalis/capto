import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getCurrentSession } from "@/lib/session";
import { getDb, user as userTable } from "@/lib/db";
import { isConfigured, houseKeyFor } from "@/lib/env";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";
import { resolveEngine, resolveByokEngine, type ResolvedEngine } from "@/lib/ai/select";
import { runTranscription, TranscribeError } from "@/lib/ai/transcribe";
import { consumeTranscribeSeconds, recordRun, topVocabulary, globalVocabulary } from "@/lib/usage";
import { STT_MODELS, getModel } from "@/lib/ai/models";
import type { PlanId } from "@/lib/pricing";

export const runtime = "nodejs";
export const maxDuration = 60;

const houseGroq = (): ResolvedEngine | null => {
  const key = houseKeyFor("groq");
  if (!key) return null;
  const model = STT_MODELS.find((m) => m.provider === "groq")!;
  return { model, apiKey: key, isHouse: true };
};

/**
 * Transcription proxy. Routes the clip to the best available engine (managed or
 * the user's own key), meters managed use, and biases the model with learned
 * vocabulary. The smart path is fully guarded: on ANY error it falls back to the
 * house Groq key and still transcribes, so a metering/DB hiccup never blocks a
 * caption. The video never touches our storage.
 */
export async function POST(req: Request) {
  const rl = await rateLimit(`transcribe:${clientIp(req)}`, 40, 60 * 10);
  if (!rl.ok) return tooMany(rl.retryAfter);

  const inForm = await req.formData().catch(() => null);
  const file = inForm?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No audio file provided." }, { status: 400 });
  }
  const language = (inForm?.get("language") as string) || "auto";
  const requestedModel = (inForm?.get("model") as string) || "";
  const durationSec = Math.max(1, Math.round(Number(inForm?.get("durationSec")) || 60));

  // ── resolve the signed-in user (guarded) ───────────────────────────────
  let plan: PlanId = "free";
  let userId: string | null = null;
  let prefs = { aiProvider: "auto", aiUseOwnKey: false };
  try {
    if (isConfigured.db()) {
      const session = await getCurrentSession();
      if (session?.user?.id) {
        userId = session.user.id;
        const db = getDb();
        const [u] = await db
          .select({ plan: userTable.plan, aiProvider: userTable.aiProvider, aiUseOwnKey: userTable.aiUseOwnKey })
          .from(userTable)
          .where(eq(userTable.id, session.user.id))
          .limit(1);
        if (u) {
          plan = u.plan;
          prefs = {
            aiProvider: requestedModel && getModel(requestedModel) ? requestedModel : u.aiProvider,
            aiUseOwnKey: u.aiUseOwnKey,
          };
        }
      }
    }
  } catch {
    /* session/DB hiccup — fall through; we'll use the house key */
  }

  // Anonymous in production must sign in (editor is auth-gated; this only stops
  // direct unmetered API abuse). Dev/no-DB serves the house key.
  if (!userId && isConfigured.db()) {
    return NextResponse.json(
      { error: "Please sign in to generate captions.", code: "auth" },
      { status: 401 },
    );
  }

  // ── pick the engine, with a guaranteed house-Groq fallback ──────────────
  let active: ResolvedEngine | null = null;
  let capError: NextResponse | null = null;
  if (userId) {
    try {
      const engine = await resolveEngine(userId, plan, prefs);
      if (engine?.isHouse) {
        const consumed = await consumeTranscribeSeconds(userId, plan, durationSec).catch(() => ({
          allowed: true,
          usedMinutes: 0,
          limitMinutes: null as number | null,
        }));
        if (consumed.allowed) {
          active = engine;
        } else {
          const own = await resolveByokEngine(userId).catch(() => null);
          if (own) active = own;
          else {
            capError = NextResponse.json(
              {
                error:
                  plan === "free"
                    ? "Free captioning runs on your own free Groq key. Add one in Settings → it takes 30 seconds at console.groq.com/keys."
                    : "You've reached this month's transcription minutes.",
                code: "cap_reached",
                plan,
                limit: consumed.limitMinutes,
              },
              { status: 402 },
            );
          }
        }
      } else if (engine) {
        active = engine; // BYOK, uncapped
      }
    } catch {
      /* resolution failed — house fallback below */
    }
  }
  if (capError) return capError;

  // Free is BYOK-required: a signed-in Free user with no own key is NOT rescued by
  // the house Groq fallback — they must add their own free Groq key. The house
  // fallback still covers paid plans and the anonymous/no-DB dev path below.
  if (!active && userId && plan === "free") {
    return NextResponse.json(
      {
        error:
          "Free captioning runs on your own free Groq key. Add one in Settings → it takes 30 seconds at console.groq.com/keys.",
        code: "byok_required",
        plan: "free",
      },
      { status: 402 },
    );
  }

  if (!active) active = houseGroq();
  if (!active) {
    return NextResponse.json({ error: "No transcription engine configured." }, { status: 503 });
  }

  // ── large/long-file routing (paid): Groq/OpenAI Whisper reject ~25MB+ uploads.
  // For a managed Whisper engine on a big file, switch to house Deepgram nova-3
  // (handles up to ~2GB and long audio in one shot) when the house key exists.
  if (
    active.isHouse &&
    active.model.provider !== "deepgram" &&
    file.size > 18 * 1024 * 1024 &&
    (plan === "pro" || plan === "ultra") &&
    houseKeyFor("deepgram").length > 10
  ) {
    const dg = STT_MODELS.find((m) => m.provider === "deepgram");
    if (dg) active = { model: dg, apiKey: houseKeyFor("deepgram"), isHouse: true };
  }

  // Bias the engine with BOTH this user's learned terms and the collective
  // dictionary (terms many users have corrected) — so transcription improves for
  // everyone as people edit. User terms first (higher priority), then global.
  const [own, global] = await Promise.all([
    userId ? topVocabulary(userId).catch(() => []) : Promise.resolve([]),
    globalVocabulary().catch(() => []),
  ]);
  const vocab = [...new Set([...own, ...global])].slice(0, 60);
  return transcribeAndRespond(active, file, language, vocab, plan);
}

async function transcribeAndRespond(
  engine: ResolvedEngine,
  file: File,
  language: string,
  vocab: string[],
  plan: PlanId,
) {
  const base = "Transcribe accurately with correct spelling, punctuation, and capitalization.";
  const prompt = vocab.length ? `${base} Proper nouns: ${vocab.join(", ")}.` : base;

  try {
    const result = await runTranscription({
      model: engine.model,
      apiKey: engine.apiKey,
      file,
      language,
      prompt,
      vocabulary: vocab,
    });
    if (!result.words.length) {
      return NextResponse.json({ error: "No speech detected in this clip." }, { status: 422 });
    }
    void recordRun(engine.model.provider, engine.model.apiModel, result.words.length);

    return NextResponse.json({
      language: result.language || language,
      text: result.text,
      words: result.words,
      engine: {
        id: engine.model.id,
        provider: engine.model.provider,
        model: engine.model.apiModel,
        label: engine.model.label,
        managed: engine.isHouse,
      },
    });
  } catch (e) {
    if (e instanceof TranscribeError) {
      // File-too-large: Whisper engines hard-cap around 25MB. Surface a friendly,
      // actionable message instead of a raw provider error.
      const detail = (e.detail || "").toLowerCase();
      const tooLarge =
        e.status === 413 ||
        ((e.status === 400 || e.status === 422) &&
          /size|large|too big/.test(detail));
      if (tooLarge) {
        const paid = plan === "pro" || plan === "ultra";
        return NextResponse.json(
          {
            error: paid
              ? "This file is too large for the selected engine. Try the Deepgram engine for long videos."
              : "This clip is too large for Groq Whisper (~25MB cap). Keep it under ~12 minutes, or upgrade for long videos.",
            code: "file_too_large",
          },
          { status: 413 },
        );
      }
      return NextResponse.json(
        { error: `Transcription failed (${e.status}).`, detail: e.detail },
        { status: 502 },
      );
    }
    return NextResponse.json({ error: "Transcription failed." }, { status: 502 });
  }
}
