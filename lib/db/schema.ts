import {
  boolean,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ─── better-auth core tables ─────────────────────────────────────────
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),

  // Capto app fields
  plan: text("plan", { enum: ["free", "pro", "ultra"] }).notNull().default("free"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionStatus: text("subscription_status"),
  monthlyExportsUsed: integer("monthly_exports_used").notNull().default(0),
  monthlyResetAt: timestamp("monthly_reset_at").notNull().defaultNow(),
  // Monthly AI transcription budget (separate window from exports).
  monthlyTranscriptionsUsed: integer("monthly_transcriptions_used").notNull().default(0),
  transcriptionsResetAt: timestamp("transcriptions_reset_at").notNull().defaultNow(),
  // AI engine preference. "auto" = Capto picks the best-performing available
  // engine. aiUseOwnKey forces the user's own BYOK key/provider when set.
  aiProvider: text("ai_provider").notNull().default("auto"),
  aiUseOwnKey: boolean("ai_use_own_key").notNull().default(false),
  onboardedAt: timestamp("onboarded_at"),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── User-supplied API keys (encrypted) ──────────────────────────────
export const userApiKey = pgTable(
  "user_api_key",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    provider: text("provider", { enum: ["groq", "openai", "deepgram", "gemini"] }).notNull(),
    encryptedKey: text("encrypted_key").notNull(),
    label: text("label"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    lastUsedAt: timestamp("last_used_at"),
  },
  (t) => ({
    userProviderIdx: uniqueIndex("user_provider_idx").on(t.userId, t.provider),
  }),
);

// ─── Project metadata (the videos a user has worked on) ──────────────
export const project = pgTable("project", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  durationSec: integer("duration_sec"),
  state: text("state"), // serialized editor state JSON
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── Email verification codes (OTP), one active per user ─────────────
export const emailCode = pgTable("email_code", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  codeHash: text("code_hash").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  attempts: integer("attempts").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Password reset codes (OTP), one active per user ─────────────────
export const passwordReset = pgTable("password_reset", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  codeHash: text("code_hash").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  attempts: integer("attempts").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Waitlist signups ────────────────────────────────────────────────
export const waitlist = pgTable("waitlist", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  source: text("source"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Generic DB-backed rate-limit buckets ────────────────────────────
export const apiRateLimit = pgTable("api_rate_limit", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(0),
  resetAt: timestamp("reset_at").notNull(),
});

// ─── AI learning: per-engine quality metrics ─────────────────────────
// The always-on feedback loop. Every transcription bumps `runs`/`words`; when a
// user edits the AI output we bump `editedWords`. accuracy = 1 - edited/words,
// which lets the "auto" engine prefer whichever model people correct the least.
export const aiMetric = pgTable(
  "ai_metric",
  {
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    runs: integer("runs").notNull().default(0),
    words: integer("words").notNull().default(0),
    editedWords: integer("edited_words").notNull().default(0),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.provider, t.model] }) }),
);

// ─── AI learning: per-user custom vocabulary ─────────────────────────
// Proper nouns / brand terms the user repeatedly fixes by hand. Fed back into
// the transcription prompt so the SAME user's future clips get them right.
export const userVocabulary = pgTable(
  "user_vocabulary",
  {
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    term: text("term").notNull(),
    weight: integer("weight").notNull().default(1),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.userId, t.term] }) }),
);

export type User = typeof user.$inferSelect;
export type Project = typeof project.$inferSelect;
