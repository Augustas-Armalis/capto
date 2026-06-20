// Server-side usage accounting + the AI learning loop. All writes are single
// atomic SQL statements so concurrent requests can't slip past a cap.

import { neon } from "@neondatabase/serverless";
import { env, isConfigured } from "./env";
import type { PlanId } from "./pricing";
import { transcriptionLimit, isUnlimitedTranscriptions, PLAN_LIMITS } from "./plan-limits";

const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

export type TranscriptionUsage = {
  plan: PlanId;
  used: number;
  limit: number | null; // null = unlimited (display)
  remaining: number | null;
  unlimited: boolean;
};

function db() {
  return neon(env.databaseUrl);
}

/** Read transcription usage without mutating (safe in renders). */
export async function readTranscriptionUsage(userId: string): Promise<TranscriptionUsage | null> {
  if (!isConfigured.db()) return null;
  const sql = db();
  const rows = (await sql`
    SELECT plan,
           CASE WHEN now() - transcriptions_reset_at > ${`${MONTH_MS} milliseconds`}::interval
                THEN 0 ELSE monthly_transcriptions_used END AS used
    FROM "user" WHERE id = ${userId} LIMIT 1
  `) as { plan: PlanId; used: number }[];
  if (!rows.length) return null;
  const plan = rows[0].plan;
  const used = rows[0].used;
  const unlimited = isUnlimitedTranscriptions(plan);
  const limit = unlimited ? null : PLAN_LIMITS[plan].transcriptions;
  return {
    plan,
    used,
    limit,
    remaining: limit === null ? null : Math.max(0, limit - used),
    unlimited,
  };
}

/**
 * Atomically consume one transcription against the monthly cap. Returns
 * { allowed:false } when the user is over their plan's house-AI budget.
 * Skipped entirely for BYOK (the caller passes countsAgainstCap=false).
 */
export async function consumeTranscription(
  userId: string,
  plan: PlanId,
): Promise<{ allowed: boolean; used: number; limit: number | null }> {
  if (!isConfigured.db()) return { allowed: true, used: 0, limit: null };
  const cap = transcriptionLimit(plan); // numeric ceiling (safety cap for ultra)
  const sql = db();
  const months = `${MONTH_MS} milliseconds`;
  const rows = (await sql`
    UPDATE "user" u SET
      monthly_transcriptions_used = (CASE WHEN now() - u.transcriptions_reset_at > ${months}::interval THEN 0 ELSE u.monthly_transcriptions_used END) + 1,
      transcriptions_reset_at = CASE WHEN now() - u.transcriptions_reset_at > ${months}::interval THEN now() ELSE u.transcriptions_reset_at END
    WHERE u.id = ${userId}
      AND (CASE WHEN now() - u.transcriptions_reset_at > ${months}::interval THEN 0 ELSE u.monthly_transcriptions_used END) < ${cap}
    RETURNING u.monthly_transcriptions_used AS used
  `) as { used: number }[];
  if (!rows.length) {
    return { allowed: false, used: cap, limit: isUnlimitedTranscriptions(plan) ? null : cap };
  }
  return { allowed: true, used: rows[0].used, limit: isUnlimitedTranscriptions(plan) ? null : cap };
}

// ─── AI learning loop ────────────────────────────────────────────────

/** Record that an engine produced `words` words on one run (best-effort). */
export async function recordRun(provider: string, model: string, words: number): Promise<void> {
  if (!isConfigured.db()) return;
  try {
    const sql = db();
    await sql`
      INSERT INTO ai_metric (provider, model, runs, words, edited_words, updated_at)
      VALUES (${provider}, ${model}, 1, ${words}, 0, now())
      ON CONFLICT (provider, model) DO UPDATE SET
        runs = ai_metric.runs + 1,
        words = ai_metric.words + ${words},
        updated_at = now()
    `;
  } catch {
    /* metrics are best-effort; never block transcription */
  }
}

/** Record how many words the user changed from the AI output (accuracy signal). */
export async function recordEdits(
  provider: string,
  model: string,
  editedWords: number,
): Promise<void> {
  if (!isConfigured.db() || editedWords <= 0) return;
  try {
    const sql = db();
    await sql`
      UPDATE ai_metric SET edited_words = edited_words + ${editedWords}, updated_at = now()
      WHERE provider = ${provider} AND model = ${model}
    `;
  } catch {
    /* best-effort */
  }
}

/** Per-engine accuracy ranking learned from real edits. Higher = better. */
export async function engineAccuracy(): Promise<Record<string, number>> {
  if (!isConfigured.db()) return {};
  try {
    const sql = db();
    const rows = (await sql`
      SELECT provider, model, runs, words, edited_words FROM ai_metric WHERE words > 200
    `) as { provider: string; model: string; words: number; edited_words: number }[];
    const out: Record<string, number> = {};
    for (const r of rows) {
      // accuracy in [0,1]; needs a meaningful sample before it sways selection.
      out[`${r.provider}:${r.model}`] = 1 - Math.min(1, r.edited_words / Math.max(1, r.words));
    }
    return out;
  } catch {
    return {};
  }
}

/** Bump the weight of terms the user keeps typing (learned vocabulary). */
export async function bumpVocabulary(userId: string, terms: string[]): Promise<void> {
  if (!isConfigured.db() || !terms.length) return;
  try {
    const sql = db();
    for (const term of terms.slice(0, 25)) {
      await sql`
        INSERT INTO user_vocabulary (user_id, term, weight, updated_at)
        VALUES (${userId}, ${term}, 1, now())
        ON CONFLICT (user_id, term) DO UPDATE SET
          weight = user_vocabulary.weight + 1, updated_at = now()
      `;
    }
  } catch {
    /* best-effort */
  }
}

/** The user's strongest learned terms, to bias future transcriptions. */
export async function topVocabulary(userId: string, limit = 40): Promise<string[]> {
  if (!isConfigured.db()) return [];
  try {
    const sql = db();
    const rows = (await sql`
      SELECT term FROM user_vocabulary WHERE user_id = ${userId}
      ORDER BY weight DESC, updated_at DESC LIMIT ${limit}
    `) as { term: string }[];
    return rows.map((r) => r.term);
  } catch {
    return [];
  }
}
