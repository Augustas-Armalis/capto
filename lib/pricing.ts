// "friend" = a comped, admin-only tier (full access, no payment). Never sold.
export type PlanId = "free" | "pro" | "ultra" | "friend";

export type Plan = {
  id: PlanId;
  name: string;
  tagline: string;
  /** per month, billed monthly */
  priceMonthly: number;
  priceMonthlyUsd: number;
  /** per month, effective when billed annually */
  priceAnnualMonthly: number;
  priceAnnualMonthlyUsd: number;
  /** total per year */
  priceAnnualTotal: number;
  priceAnnualTotalUsd: number;
  highlight?: boolean;
  badge?: string;
  audience: string;
  features: string[];
  limits: string[];
  cta: string;
};

// USD prices are the EUR figures converted (~1.1x) and rounded UP to .99.
export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    tagline: "Real captions, real exports, stamped.",
    priceMonthly: 0,
    priceMonthlyUsd: 0,
    priceAnnualMonthly: 0,
    priceAnnualMonthlyUsd: 0,
    priceAnnualTotal: 0,
    priceAnnualTotalUsd: 0,
    audience: "Trying it out · students · price-shoppers",
    features: [
      "Word-perfect AI captions, all 50+ languages",
      "Every caption style & highlight preset",
      "Real timeline editing, full word-level control",
      "3 captioned exports / month",
      "15 AI source-minutes/mo on us — or unlimited with your own key",
      "SRT / VTT subtitle file export",
    ],
    limits: ["Capto watermark on exports", "Compressed export · 2 min per video", "No Magic Clips or brand kit"],
    cta: "Start free",
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Unlimited, no watermark.",
    priceMonthly: 6.99,
    priceMonthlyUsd: 7.99,
    priceAnnualMonthly: 5.0,
    priceAnnualMonthlyUsd: 5.83,
    priceAnnualTotal: 59.99,
    priceAnnualTotalUsd: 69.99,
    highlight: true,
    badge: "Most popular",
    audience: "For creators who post weekly",
    features: [
      "Lossless export, original quality, in & out",
      "No watermark on any export, forever",
      "Unlimited captioned exports",
      "Every aspect ratio (9:16 · 1:1 · 16:9)",
      "Word-level highlight presets + custom fonts & colors",
      "Caption translation across 50+ languages",
      "Use your Groq key, or ours (managed)",
      "Priority transcription queue",
    ],
    limits: ["4K / 60fps is Ultra", "~600 source minutes / month", "Single seat"],
    cta: "Get Pro",
  },
  {
    id: "ultra",
    name: "Ultra",
    tagline: "For teams and daily posting.",
    priceMonthly: 17.99,
    priceMonthlyUsd: 19.99,
    priceAnnualMonthly: 15.0,
    priceAnnualMonthlyUsd: 16.67,
    priceAnnualTotal: 179.99,
    priceAnnualTotalUsd: 199.99,
    badge: "Best for teams",
    audience: "For teams and daily posting",
    features: [
      "Everything in Pro, and:",
      "Lossless 4K / 60fps export",
      "Magic Clips: long video into viral shorts with Hook Score",
      "AI B-roll, auto-transitions & filler/silence removal",
      "Brand Kit, fonts, colors, logo & custom vocabulary",
      "5 team seats included (flat, not per-member)",
      "~2,000 source minutes / month",
      "Capto Captions API + Zapier",
    ],
    limits: ["API metered beyond included minutes", "Need >5 seats? Talk to us about Teams"],
    cta: "Get Ultra",
  },
];

export const getPlan = (id: PlanId) => PLANS.find((p) => p.id === id);

/** Marketing comparison data, competitor prices captured June 2026.
 *  Competitors are USD-listed; eur is the approximate converted figure. */
export const COMPETITOR_PRICES = [
  { name: "Capto", eur: 6.99, usd: 7.99, note: "Pro · no watermark", us: true },
  { name: "OpusClip", eur: 27, usd: 29, note: "Starter" },
  { name: "Captions", eur: 23, usd: 24.99, note: "Max · credit-metered" },
  { name: "VEED", eur: 22, usd: 24, note: "Pro" },
  { name: "Submagic", eur: 18, usd: 19, note: "+ clips add-on" },
];
