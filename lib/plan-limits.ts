import type { PlanId } from "./pricing";

// Monthly house-AI budgets per plan. Transcription is metered in source MINUTES
// (matches the pricing copy). BYOK (the user's own key) is never counted — only
// managed/house usage is. null = effectively unlimited (Ultra has a high hidden
// safety cap but we never surface a number).
export const PLAN_LIMITS: Record<
  PlanId,
  { minutes: number | null; exports: number | null }
> = {
  free: { minutes: 15, exports: 3 },
  pro: { minutes: 600, exports: null },
  ultra: { minutes: null, exports: null },
  friend: { minutes: null, exports: null }, // comped — unlimited, on the house
};

// Hidden safety ceiling for "unlimited" plans so an abuse case can't bill us
// into the ground. Never shown in the UI.
export const ULTRA_SAFETY_MINUTES = 6000;

/** Numeric minute ceiling actually enforced (unlimited plans use the safety cap). */
export function transcribeMinuteLimit(plan: PlanId): number {
  const m = PLAN_LIMITS[plan].minutes;
  return m === null ? ULTRA_SAFETY_MINUTES : m;
}

/** True when the plan's transcription budget should be presented as unlimited. */
export function isUnlimitedTranscription(plan: PlanId): boolean {
  return PLAN_LIMITS[plan].minutes === null;
}
