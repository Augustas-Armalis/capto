// Decides WHICH engine transcribes a given request. Combines: the user's plan,
// their explicit preference, whether they want their own key, which house keys
// exist, and the learned accuracy ranking. Server-only (touches DB + secrets).

import { and, eq } from "drizzle-orm";
import { getDb, userApiKey } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { houseKeyFor } from "@/lib/env";
import type { PlanId } from "@/lib/pricing";
import { engineAccuracy } from "@/lib/usage";
import { STT_MODELS, getModel, PLAN_RANK, type AiProvider, type SttModel } from "./models";

export type ResolvedEngine = {
  model: SttModel;
  apiKey: string;
  /** true = our managed key (counts against the monthly cap); false = BYOK */
  isHouse: boolean;
};

export type EnginePrefs = { aiProvider: string; aiUseOwnKey: boolean };

async function userKeys(userId: string): Promise<Partial<Record<AiProvider, string>>> {
  const db = getDb();
  const rows = await db
    .select({ provider: userApiKey.provider, enc: userApiKey.encryptedKey })
    .from(userApiKey)
    .where(eq(userApiKey.userId, userId));
  const out: Partial<Record<AiProvider, string>> = {};
  for (const r of rows) {
    try {
      const k = decrypt(r.enc);
      if (k) out[r.provider as AiProvider] = k;
    } catch {
      /* skip undecryptable */
    }
  }
  return out;
}

/** Models allowed as HOUSE engines for this plan that actually have a key set. */
function houseCandidates(plan: PlanId): SttModel[] {
  return STT_MODELS.filter(
    (m) => PLAN_RANK[m.minPlan] <= PLAN_RANK[plan] && houseKeyFor(m.provider).length > 10,
  );
}

async function rankBest(models: SttModel[]): Promise<SttModel | null> {
  if (!models.length) return null;
  const acc = await engineAccuracy();
  // One comparable score per model so the ordering is total + transitive:
  // learned accuracy (0..1) when we have a meaningful sample, else the static
  // quality prior mapped onto the same 0..1 scale.
  const score = (m: SttModel) => {
    const a = acc[`${m.provider}:${m.apiModel}`];
    return a !== undefined ? a : m.quality / 10;
  };
  return [...models].sort((a, b) => score(b) - score(a))[0];
}

/**
 * Resolve the engine for a signed-in user. Returns null when nothing is usable
 * (no house key for the plan AND no relevant BYOK key) — caller shows guidance.
 */
export async function resolveEngine(
  userId: string,
  plan: PlanId,
  prefs: EnginePrefs,
): Promise<ResolvedEngine | null> {
  const keys = await userKeys(userId);
  const hasOwn = (p: AiProvider) => !!keys[p] && keys[p]!.length > 10;
  const ownTranscribers = (["deepgram", "openai", "groq"] as AiProvider[]).filter(hasOwn);

  // 1) Own key first when: the user is on Free (Free is BYOK-required — it MUST
  // run on the user's own key, no house fallback), OR a paid user opted in.
  const preferOwn = plan === "free" || prefs.aiUseOwnKey;
  if (preferOwn && ownTranscribers.length) {
    const picked = getModel(prefs.aiProvider);
    if (picked && hasOwn(picked.provider)) {
      return { model: picked, apiKey: keys[picked.provider]!, isHouse: false };
    }
    // best model among providers they hold a key for
    const best = await rankBest(STT_MODELS.filter((m) => hasOwn(m.provider)));
    if (best) return { model: best, apiKey: keys[best.provider]!, isHouse: false };
  }

  // Free is BYOK-required: if we reach here with no own transcriber key, do NOT
  // fall through to the house/managed engines — return null so the route shows
  // the "add your own free Groq key" guidance. Paid plans continue below.
  if (plan === "free") return null;

  // 2) Managed / house engine.
  const candidates = houseCandidates(plan);
  if (candidates.length) {
    const explicit = getModel(prefs.aiProvider);
    if (explicit && candidates.some((c) => c.id === explicit.id)) {
      return { model: explicit, apiKey: houseKeyFor(explicit.provider), isHouse: true };
    }
    const best = await rankBest(candidates);
    if (best) return { model: best, apiKey: houseKeyFor(best.provider), isHouse: true };
  }

  // 3) Last resort: any BYOK key the user has, even if they didn't opt in.
  if (ownTranscribers.length) {
    const best = await rankBest(STT_MODELS.filter((m) => hasOwn(m.provider)));
    if (best) return { model: best, apiKey: keys[best.provider]!, isHouse: false };
  }

  return null;
}

/**
 * Resolve the best engine that runs on the user's OWN key (uncapped). Used as a
 * fallback when the managed monthly budget is exhausted: a user who already
 * holds a usable key should never be blocked.
 */
export async function resolveByokEngine(userId: string): Promise<ResolvedEngine | null> {
  const keys = await userKeys(userId);
  const hasOwn = (p: AiProvider) => !!keys[p] && keys[p]!.length > 10;
  const best = await rankBest(STT_MODELS.filter((m) => hasOwn(m.provider)));
  if (best) return { model: best, apiKey: keys[best.provider]!, isHouse: false };
  return null;
}
