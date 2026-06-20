import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getCurrentSession } from "@/lib/session";
import { getDb, user as userTable } from "@/lib/db";
import { env, isConfigured, houseKeyFor } from "@/lib/env";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";
import { resolveEngine } from "@/lib/ai/select";
import { runTranscription, TranscribeError } from "@/lib/ai/transcribe";
import { consumeTranscription, recordRun, topVocabulary } from "@/lib/usage";
import { STT_MODELS, getModel } from "@/lib/ai/models";
import type { PlanId } from "@/lib/pricing";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Transcription proxy. The browser sends the clip's audio; we route it to the
 * best available engine (managed or the user's own key), enforce the plan's
 * monthly budget for managed use, bias the model with the user's learned
 * vocabulary, and record quality metrics. The video never touches our storage.
 */
export async function POST(req: Request) {
  // Throttle the AI endpoint to stop hammering / cost abuse.
  const rl = await rateLimit(`transcribe:${clientIp(req)}`, 40, 60 * 10);
  if (!rl.ok) return tooMany(rl.retryAfter);

  const inForm = await req.formData().catch(() => null);
  const file = inForm?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No audio file provided." }, { status: 400 });
  }
  const language = (inForm?.get("language") as string) || "auto";
  const requestedModel = (inForm?.get("model") as string) || "";

  // ── resolve the user + engine ──────────────────────────────────────────
  let plan: PlanId = "free";
  let userId: string | null = null;
  let prefs = { aiProvider: "auto", aiUseOwnKey: false };
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
        // A per-request model override (from the editor picker) wins for this run.
        prefs = {
          aiProvider: requestedModel && getModel(requestedModel) ? requestedModel : u.aiProvider,
          aiUseOwnKey: u.aiUseOwnKey,
        };
      }
    }
  }

  // No DB / signed-out: fall back to the house Groq key directly (BYOK-less).
  if (!userId) {
    const key = houseKeyFor("groq");
    if (!key) return NextResponse.json({ error: "No transcription engine configured." }, { status: 503 });
    const model = STT_MODELS.find((m) => m.provider === "groq")!;
    return transcribeAndRespond({ model, apiKey: key, isHouse: true }, file, language, [], null, plan);
  }

  const engine = await resolveEngine(userId, plan, prefs);
  if (!engine) {
    return NextResponse.json(
      {
        error:
          "No AI engine available. Add your own key in Settings, or upgrade for managed AI.",
        code: "no_engine",
      },
      { status: 400 },
    );
  }

  // Enforce the monthly budget only for managed (house) usage. BYOK is uncapped.
  if (engine.isHouse) {
    const consumed = await consumeTranscription(userId, plan);
    if (!consumed.allowed) {
      return NextResponse.json(
        {
          error:
            plan === "free"
              ? "You've used your free AI captions this month. Add your own free Groq key in Settings, or upgrade for more."
              : "You've reached this month's transcription limit.",
          code: "cap_reached",
          plan,
          limit: consumed.limit,
        },
        { status: 402 },
      );
    }
  }

  const vocab = await topVocabulary(userId);
  return transcribeAndRespond(engine, file, language, vocab, userId, plan);
}

async function transcribeAndRespond(
  engine: { model: typeof STT_MODELS[number]; apiKey: string; isHouse: boolean },
  file: File,
  language: string,
  vocab: string[],
  userId: string | null,
  plan: PlanId,
) {
  // Build a spelling/style prompt from the user's learned vocabulary.
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
    // Learning loop: record this run (best-effort, never blocks the response).
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
      return NextResponse.json(
        { error: `Transcription failed (${e.status}).`, detail: e.detail },
        { status: 502 },
      );
    }
    return NextResponse.json({ error: "Transcription failed." }, { status: 502 });
  }
}
