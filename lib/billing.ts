import type { PlanId } from "./pricing";

export type Interval = "monthly" | "annual";
export type Currency = "eur" | "usd";

/** plan → interval → currency → env var holding the Stripe price ID */
const PRICE_ENV = {
  pro: {
    monthly: { eur: "STRIPE_PRICE_PRO_MONTHLY_EUR", usd: "STRIPE_PRICE_PRO_MONTHLY_USD" },
    annual: { eur: "STRIPE_PRICE_PRO_ANNUAL_EUR", usd: "STRIPE_PRICE_PRO_ANNUAL_USD" },
  },
  ultra: {
    monthly: { eur: "STRIPE_PRICE_ULTRA_MONTHLY_EUR", usd: "STRIPE_PRICE_ULTRA_MONTHLY_USD" },
    annual: { eur: "STRIPE_PRICE_ULTRA_ANNUAL_EUR", usd: "STRIPE_PRICE_ULTRA_ANNUAL_USD" },
  },
} as const;

export function currencyFromString(c?: string | null): Currency {
  return c === "usd" ? "usd" : "eur";
}

/** Resolve a plan + interval + currency to the configured Stripe price ID. */
export function priceIdFor(plan: PlanId, interval: Interval, currency: Currency): string | null {
  if (plan === "free" || plan === "friend") return null; // neither is sold via Stripe
  const name = PRICE_ENV[plan]?.[interval]?.[currency];
  return name ? process.env[name] || null : null;
}

/** Reverse-map a Stripe price ID to a plan (for webhook handling). */
export function planFromPriceId(priceId?: string | null): PlanId {
  if (!priceId) return "free";
  for (const plan of ["pro", "ultra"] as const) {
    for (const interval of ["monthly", "annual"] as const) {
      for (const currency of ["eur", "usd"] as const) {
        if (process.env[PRICE_ENV[plan][interval][currency]] === priceId) return plan;
      }
    }
  }
  return "free";
}
