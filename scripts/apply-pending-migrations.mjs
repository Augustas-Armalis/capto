// Idempotent apply of the pending Drizzle migrations (0005 + 0006) using Neon's
// HTTP driver — the websocket/TCP driver that `drizzle-kit migrate` uses hangs
// in restricted networks, but the HTTP client (same one the app/Stripe use)
// works fine. Safe to run repeatedly: everything is guarded with IF NOT EXISTS
// / duplicate-object handling.
//
//   node scripts/apply-pending-migrations.mjs
//
// DATABASE_URL is read from the environment, falling back to the .env file.
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  try {
    const env = readFileSync(new URL("../.env", import.meta.url), "utf8");
    for (const line of env.split(/\r?\n/)) {
      const m = line.match(/^\s*DATABASE_URL\s*=\s*(.*)\s*$/);
      if (m) return m[1].replace(/^["']|["']$/g, "");
    }
  } catch {}
  return null;
}

const url = loadDatabaseUrl();
if (!url) {
  console.error("DATABASE_URL not set (env or .env).");
  process.exit(1);
}

const sql = neon(url);

// Run a parameterless DDL string via neon's tagged-template fn. No
// interpolation = no injection surface; these strings are hard-coded below.
function exec(stmt) {
  const ts = [stmt];
  ts.raw = [stmt];
  return sql(ts);
}

const statements = [
  // ── migration 0005: caption presets + correction telemetry ──
  `CREATE TABLE IF NOT EXISTS "caption_correction" (
     "id" text PRIMARY KEY NOT NULL,
     "user_id" text NOT NULL,
     "project_id" text,
     "created_at" timestamp DEFAULT now() NOT NULL,
     "engine" text,
     "language" text,
     "kind" text NOT NULL,
     "ai_text" text,
     "final_text" text,
     "payload" jsonb
   )`,
  `CREATE TABLE IF NOT EXISTS "user_caption_preset" (
     "id" text PRIMARY KEY NOT NULL,
     "user_id" text NOT NULL,
     "name" text NOT NULL,
     "config" jsonb NOT NULL,
     "is_default" boolean DEFAULT false NOT NULL,
     "created_at" timestamp DEFAULT now() NOT NULL
   )`,
  `DO $$ BEGIN
     ALTER TABLE "caption_correction"
       ADD CONSTRAINT "caption_correction_user_id_user_id_fk"
       FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
   EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN
     ALTER TABLE "user_caption_preset"
       ADD CONSTRAINT "user_caption_preset_user_id_user_id_fk"
       FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
   EXCEPTION WHEN duplicate_object THEN NULL; END $$`,

  // ── migration 0006: feedback table ──
  `CREATE TABLE IF NOT EXISTS "feedback" (
     "id" text PRIMARY KEY NOT NULL,
     "user_id" text,
     "email" text,
     "kind" text NOT NULL,
     "message" text NOT NULL,
     "page" text,
     "resolved" boolean DEFAULT false NOT NULL,
     "created_at" timestamp DEFAULT now() NOT NULL
   )`,
];

let ok = 0;
for (const stmt of statements) {
  const label = stmt.replace(/\s+/g, " ").slice(0, 70);
  try {
    await exec(stmt);
    ok++;
    console.log("  ✓", label);
  } catch (e) {
    console.error("  ✗", label, "\n    →", e?.message || e);
    process.exitCode = 1;
  }
}
console.log(`\nApplied ${ok}/${statements.length} statements.`);

// Quick verification that the three tables now exist.
try {
  const rows = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('caption_correction','user_caption_preset','feedback')
    ORDER BY table_name`;
  console.log("Tables present:", rows.map((r) => r.table_name).join(", ") || "(none)");
} catch (e) {
  console.error("verify failed:", e?.message || e);
}
