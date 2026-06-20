// One-off, idempotent migration for the AI engine + learning loop.
// Run: DATABASE_URL=... node scripts/apply-ai-migration.mjs
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}
const sql = neon(url);

// Run a parameterless DDL string through neon's tagged-template function by
// handing it a one-element TemplateStringsArray (no interpolations = no
// injection surface; these strings are hard-coded below).
function exec(stmt) {
  const ts = [stmt];
  ts.raw = [stmt];
  return sql(ts);
}

const statements = [
  `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "monthly_transcriptions_used" integer NOT NULL DEFAULT 0`,
  `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "monthly_transcribe_seconds" integer NOT NULL DEFAULT 0`,
  `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "transcriptions_reset_at" timestamp NOT NULL DEFAULT now()`,
  `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "ai_provider" text NOT NULL DEFAULT 'auto'`,
  `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "ai_use_own_key" boolean NOT NULL DEFAULT false`,
  `CREATE TABLE IF NOT EXISTS "ai_metric" (
     "provider" text NOT NULL,
     "model" text NOT NULL,
     "runs" integer NOT NULL DEFAULT 0,
     "words" integer NOT NULL DEFAULT 0,
     "edited_words" integer NOT NULL DEFAULT 0,
     "updated_at" timestamp NOT NULL DEFAULT now(),
     CONSTRAINT "ai_metric_provider_model_pk" PRIMARY KEY ("provider","model")
   )`,
  `CREATE TABLE IF NOT EXISTS "user_vocabulary" (
     "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
     "term" text NOT NULL,
     "weight" integer NOT NULL DEFAULT 1,
     "updated_at" timestamp NOT NULL DEFAULT now(),
     CONSTRAINT "user_vocabulary_user_id_term_pk" PRIMARY KEY ("user_id","term")
   )`,
];

for (const stmt of statements) {
  const label = stmt.slice(0, 60).replace(/\s+/g, " ");
  try {
    await exec(stmt);
    console.log("OK  ", label);
  } catch (e) {
    console.error("FAIL", label, "→", e.message);
    process.exit(1);
  }
}
console.log("\nAI migration applied.");
