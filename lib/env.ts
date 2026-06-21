function read(key: string, fallback?: string): string {
  const v = process.env[key];
  if (v && v.length) return v;
  if (fallback !== undefined) return fallback;
  return "";
}

export const env = {
  siteUrl: read("NEXT_PUBLIC_SITE_URL", "http://localhost:3000"),
  siteName: read("NEXT_PUBLIC_SITE_NAME", "Capto"),
  authSecret: read("BETTER_AUTH_SECRET"),
  authUrl: read("BETTER_AUTH_URL", read("NEXT_PUBLIC_SITE_URL", "http://localhost:3000")),
  databaseUrl: read("DATABASE_URL"),
  stripeSecret: read("STRIPE_SECRET_KEY"),
  stripeWebhookSecret: read("STRIPE_WEBHOOK_SECRET"),
  stripePublishable: read("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"),
  encryptionKey: read("ENCRYPTION_KEY"),
  // House AI keys. /api/transcribe uses these for managed (paid-tier) AI and as
  // the free-tier allowance. Groq is the always-on default; the others are
  // optional — when unset, those engines are simply offered as BYOK-only.
  houseGroqKey: read("GROQ_API_KEY"),
  houseOpenaiKey: read("OPENAI_API_KEY"),
  houseDeepgramKey: read("DEEPGRAM_API_KEY"),
  houseGeminiKey: read("GEMINI_API_KEY"),
  // House Anthropic (Claude) key. Enhancement-only: Claude cleans up / translates
  // / emoji-decorates caption TEXT for ALL signed-in users. Claude has no
  // speech-to-text, so it is NOT part of houseKeyFor (which is STT/Gemini-typed).
  houseAnthropicKey: read("ANTHROPIC_API_KEY"),
  // Resend transactional email (verification codes). Optional: when unset, email
  // verification is skipped so the app still works without it.
  resendApiKey: read("RESEND_API_KEY"),
  resendFrom: read("RESEND_FROM", "Capto <onboarding@capto.video>"),
  // Google Analytics 4 measurement id (G-XXXXXXXXXX). When set, the GA4 tag is
  // injected; when unset, nothing is loaded — keeps page weight zero by default.
  gaId: read("NEXT_PUBLIC_GA_ID"),
};

export const isConfigured = {
  db: () => env.databaseUrl.length > 10,
  stripe: () => env.stripeSecret.startsWith("sk_"),
  auth: () => env.authSecret.length >= 16,
  email: () => env.resendApiKey.startsWith("re_"),
  gemini: () => env.houseGeminiKey.length > 10,
  anthropic: () => env.houseAnthropicKey.length > 10,
};

/** Which providers have a usable HOUSE key configured right now. */
export function houseKeyFor(provider: "groq" | "openai" | "deepgram" | "gemini"): string {
  switch (provider) {
    case "groq":
      return env.houseGroqKey;
    case "openai":
      return env.houseOpenaiKey;
    case "deepgram":
      return env.houseDeepgramKey;
    case "gemini":
      return env.houseGeminiKey;
  }
}
