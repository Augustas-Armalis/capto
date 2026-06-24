// One-shot: create the admin account via the LIVE better-auth signup endpoint.
// Runs the real sign-up flow (correct password hashing), and lib/auth.ts's
// databaseHooks auto-promotes the admin email (lib/admin.ts allowlist) to plan
// "ultra" — so the moment this finishes, trycapto@gmail.com is a full Ultra
// admin with everything unlocked.
//
//   node scripts/seed-admin.mjs
//
// Optional overrides:
//   SEED_URL=https://capto.video  SEED_EMAIL=trycapto@gmail.com  SEED_PASSWORD=12345678  node scripts/seed-admin.mjs

const BASE = (process.env.SEED_URL || "https://capto.video").replace(/\/$/, "");
const email = process.env.SEED_EMAIL || "trycapto@gmail.com";
const password = process.env.SEED_PASSWORD || "12345678";
const name = process.env.SEED_NAME || "Capto Admin";

const res = await fetch(`${BASE}/api/auth/sign-up/email`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ email, password, name }),
});

const text = await res.text();
let body;
try { body = JSON.parse(text); } catch { body = text; }

if (res.ok) {
  console.log(`✓ Admin account created: ${email}`);
  console.log(`  Auto-promoted to Ultra admin (lib/admin.ts allowlist).`);
  console.log(`  Sign in at ${BASE}/signin  →  ${email} / ${password}`);
  console.log(`  Admin panel: ${BASE}/admin`);
} else if (res.status === 422 || /exist|already/i.test(text)) {
  console.log(`• ${email} already exists — nothing to do.`);
  console.log(`  If it isn't admin yet, it will be on next login (allowlist gate).`);
  console.log(`  Sign in at ${BASE}/signin  →  ${email} / ${password}`);
} else {
  console.error(`✗ Sign-up failed (${res.status}).`);
  console.error(typeof body === "string" ? body.slice(0, 400) : JSON.stringify(body, null, 2));
  process.exitCode = 1;
}
