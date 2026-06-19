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
  // House Groq key. /api/transcribe uses it ONLY as a fallback when the user
  // hasn't supplied their own key. Optional; leave unset for strict BYOK.
  houseGroqKey: read("GROQ_API_KEY"),
};

export const isConfigured = {
  db: () => env.databaseUrl.length > 10,
  stripe: () => env.stripeSecret.startsWith("sk_"),
  auth: () => env.authSecret.length >= 16,
};
