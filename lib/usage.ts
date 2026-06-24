// Server-side usage accounting + the AI learning loop. All writes are single
// atomic SQL statements so concurrent requests can't slip past a cap.

import { neon } from "@neondatabase/serverless";
import { env, isConfigured } from "./env";
import type { PlanId } from "./pricing";
import { transcribeMinuteLimit, isUnlimitedTranscription, PLAN_LIMITS } from "./plan-limits";

const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

export type TranscriptionUsage = {
  plan: PlanId;
  usedMinutes: number;
  limitMinutes: number | null; // null = unlimited (display)
  remainingMinutes: number | null;
  unlimited: boolean;
};

function db() {
  return neon(env.databaseUrl);
}

/** Read transcription usage (in minutes) without mutating (safe in renders). */
export async function readTranscriptionUsage(userId: string): Promise<TranscriptionUsage | null> {
  if (!isConfigured.db()) return null;
  const sql = db();
  const rows = (await sql`
    SELECT plan,
           CASE WHEN now() - transcriptions_reset_at > ${`${MONTH_MS} milliseconds`}::interval
                THEN 0 ELSE monthly_transcribe_seconds END AS secs
    FROM "user" WHERE id = ${userId} LIMIT 1
  `) as { plan: PlanId; secs: number }[];
  if (!rows.length) return null;
  const plan = rows[0].plan;
  const usedMinutes = Math.round((rows[0].secs || 0) / 60);
  const unlimited = isUnlimitedTranscription(plan);
  const limitMinutes = unlimited ? null : PLAN_LIMITS[plan].minutes;
  return {
    plan,
    usedMinutes,
    limitMinutes,
    remainingMinutes: limitMinutes === null ? null : Math.max(0, limitMinutes - usedMinutes),
    unlimited,
  };
}

/**
 * Atomically add `seconds` of source audio to the monthly budget. Returns
 * { allowed:false } when the user is ALREADY over their plan's house-AI minute
 * budget (we let the in-progress clip finish rather than reject mid-budget).
 * Skipped entirely for BYOK (caller only invokes this for managed usage).
 */
export async function consumeTranscribeSeconds(
  userId: string,
  plan: PlanId,
  seconds: number,
): Promise<{ allowed: boolean; usedMinutes: number; limitMinutes: number | null }> {
  if (!isConfigured.db()) return { allowed: true, usedMinutes: 0, limitMinutes: null };
  const capSecs = transcribeMinuteLimit(plan) * 60; // numeric ceiling (safety cap for ultra)
  const add = Math.max(1, Math.round(seconds || 0));
  const sql = db();
  const months = `${MONTH_MS} milliseconds`;
  const rows = (await sql`
    UPDATE "user" u SET
      monthly_transcribe_seconds = (CASE WHEN now() - u.transcriptions_reset_at > ${months}::interval THEN 0 ELSE u.monthly_transcribe_seconds END) + ${add},
      transcriptions_reset_at = CASE WHEN now() - u.transcriptions_reset_at > ${months}::interval THEN now() ELSE u.transcriptions_reset_at END
    WHERE u.id = ${userId}
      AND (CASE WHEN now() - u.transcriptions_reset_at > ${months}::interval THEN 0 ELSE u.monthly_transcribe_seconds END) < ${capSecs}
    RETURNING u.monthly_transcribe_seconds AS secs
  `) as { secs: number }[];
  const unlimited = isUnlimitedTranscription(plan);
  if (!rows.length) {
    return { allowed: false, usedMinutes: Math.round(capSecs / 60), limitMinutes: unlimited ? null : Math.round(capSecs / 60) };
  }
  return {
    allowed: true,
    usedMinutes: Math.round(rows[0].secs / 60),
    limitMinutes: unlimited ? null : transcribeMinuteLimit(plan),
  };
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
    // Upsert (not a bare UPDATE): if the run row hasn't landed yet — both writes
    // are fire-and-forget — we still capture the edit signal instead of dropping
    // it. A words=0 row stays below engineAccuracy's sample gate until a real run
    // accrues words, so it never skews ranking prematurely.
    await sql`
      INSERT INTO ai_metric (provider, model, runs, words, edited_words, updated_at)
      VALUES (${provider}, ${model}, 0, 0, ${editedWords}, now())
      ON CONFLICT (provider, model) DO UPDATE SET
        edited_words = ai_metric.edited_words + ${editedWords},
        updated_at = now()
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

/**
 * Collective learning: terms that MULTIPLE users have corrected to (≥2 distinct
 * users, enough total weight) — a shared dictionary that biases EVERY user's
 * transcriptions, so the engine gets better for everyone as people edit. The
 * multi-user threshold keeps one person's noise out of the global list.
 */
export async function globalVocabulary(limit = 25): Promise<string[]> {
  if (!isConfigured.db()) return [];
  try {
    const sql = db();
    const rows = (await sql`
      SELECT term FROM user_vocabulary
      GROUP BY term
      HAVING count(DISTINCT user_id) >= 2 AND sum(weight) >= 4
      ORDER BY sum(weight) DESC
      LIMIT ${limit}
    `) as { term: string }[];
    return rows.map((r) => r.term);
  } catch {
    return [];
  }
}
