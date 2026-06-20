import type { PlanId } from "./pricing";

// Monthly house-AI budgets per plan. BYOK (user's own key) is never counted
// against these — only managed/house usage is. null = effectively unlimited
// (Ultra has a high internal safety cap but we never surface a number).
export const PLAN_LIMITS: Record<
  PlanId,
  { transcriptions: number | null; exports: number | null }
> = {
  free: { transcriptions: 5, exports: 3 },
  pro: { transcriptions: 300, exports: null },
  ultra: { transcriptions: null, exports: null },
};

// Hidden safety ceiling for "unlimited" plans, so a runaway/abuse case can't
// bill us into the ground. Never shown in the UI.
export const ULTRA_SAFETY_CAP = 5000;

/** Numeric ceiling actually enforced in SQL (unlimited plans use a safety cap). */
export function transcriptionLimit(plan: PlanId): number {
  const l = PLAN_LIMITS[plan].transcriptions;
  return l === null ? ULTRA_SAFETY_CAP : l;
}

/** True when the plan's transcription limit should be presented as unlimited. */
export function isUnlimitedTranscriptions(plan: PlanId): boolean {
  return PLAN_LIMITS[plan].transcriptions === null;
}
