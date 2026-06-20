# Capto — Security, Accounts & Payments Overview

Last verified: 2026-06-19. This is the single source of truth for "where do the
secrets live, how are accounts protected, and how do payments flow."

---

## TL;DR — are the keys safe?

**Yes.** No secret key is ever shipped to the browser or committed to git.

- Verified: `grep` for `sk_live_…`, `gsk_…`, `re_…_…`, `whsec_…` across the whole
  source tree returns **nothing** — there are no hardcoded secrets.
- The only values that reach the browser are `NEXT_PUBLIC_*`:
  `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SITE_NAME`, `NEXT_PUBLIC_GA_ID`, and
  `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`. A Stripe **publishable** key is *designed*
  to be public — it can only start checkouts, never move money.
- Every real secret (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
  `GROQ_API_KEY`, `RESEND_API_KEY`, `DATABASE_URL`, `BETTER_AUTH_SECRET`,
  `ENCRYPTION_KEY`) is read **server-side only** via `lib/env.ts` and is stored
  as a **Cloudflare Worker secret** (encrypted at rest by Cloudflare, never in
  the bundle).
- No `"use client"` file imports `lib/env`, `lib/crypto`, or `lib/stripe` — so
  there is no path for a secret to be tree-shaken into client JS.
- `.gitignore` covers `.env`, `.env*.local`, `.env.development`, `.env.production`.
  Only `.env.example` (placeholders) is tracked.

---

## Where every secret lives

All runtime secrets are **Cloudflare Worker secrets** (set with `wrangler secret put`).
They are injected into the server runtime only.

| Secret | Purpose | Exposed to browser? |
|---|---|---|
| `DATABASE_URL` | Neon Postgres connection | ❌ server only |
| `BETTER_AUTH_SECRET` | Session signing | ❌ server only |
| `BETTER_AUTH_URL` | Auth base URL | ❌ server only |
| `ENCRYPTION_KEY` | AES-256-GCM key for users' own API keys | ❌ server only |
| `GROQ_API_KEY` | House Whisper key (transcription) | ❌ server only |
| `RESEND_API_KEY` | Transactional email | ❌ server only |
| `RESEND_FROM` | From address | ❌ server only |
| `STRIPE_SECRET_KEY` | Stripe server API (**LIVE**) | ❌ server only |
| `STRIPE_WEBHOOK_SECRET` | Verifies webhook signatures | ❌ server only |
| `STRIPE_PRICE_*` (8) | Price IDs per plan/interval/currency | ❌ server only |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Start checkout | ✅ public by design |
| `NEXT_PUBLIC_GA_ID` | Analytics tag | ✅ public by design |

---

## Accounts

- **Auth**: better-auth (email + password) on Drizzle/Neon. Sessions are signed
  with `BETTER_AUTH_SECRET` and stored as httpOnly cookies.
- **Email verification**: 6-digit OTP via Resend (`email_code` table, expiring codes).
- **Password reset**: code-based, for logged-out users (`password_reset` table),
  delivered by email; codes are single-use and expire.
- **Rate limiting**: DB-backed atomic counters (`api_rate_limit`) guard auth,
  the transcription endpoint, checkout, and the waitlist — stops credential
  stuffing and cost-abuse.
- **Users' own API keys** (Groq BYOK) are encrypted with **AES-256-GCM** and a
  random 12-byte IV per record (`lib/crypto.ts`) before they ever touch the DB.
  They are decrypted only in the server transcription proxy, never returned to
  the client.
- **Account settings** (in `/settings`): change name, view plan/status, delete
  account (cancels the Stripe sub best-effort, cascades the row, clears session).

## Hardening

- **Production CSP** (`next.config.mjs`) with an explicit `script-src` /
  `connect-src` allowlist (self + Stripe + Google Analytics only). Dev is
  exempt so React's eval-based fast refresh still works.
- **HSTS** + secure headers on the edge.
- Primary domain locked to `capto.video` (`workers_dev = false`); the old
  `*.workers.dev` origin 404s, so there is one canonical origin.

---

## Payments (Stripe — LIVE keys)

Flow is **pay-first**:

1. Visitor clicks a plan → `POST /api/stripe/checkout` (or the public guest
   route) creates a Checkout Session with the right **price ID** for plan +
   interval + currency. No charge happens until the card is submitted on
   Stripe's hosted page.
2. On success Stripe fires `checkout.session.completed`. The webhook
   (`/api/stripe/webhook`) **verifies the signature** with
   `STRIPE_WEBHOOK_SECRET` via `constructEventAsync` — forged POSTs are rejected
   with 400 — then sets `plan`, `stripeSubscriptionId`, `subscriptionStatus`.
3. `customer.subscription.created/updated` re-derives the **authoritative plan
   from the subscribed price** (`planFromPriceId`), so the DB can't drift from
   Stripe. `customer.subscription.deleted` downgrades to `free`.
4. Guest checkouts (no account yet) are matched to the user later by
   `stripeCustomerId`; `/welcome` finishes account creation + password set.
5. **Manage / cancel**: `/billing` opens the Stripe billing portal, or cancels
   at period end. On cancel we offer a **one-time 50%-off coupon**
   (`/api/stripe/retention`, coupon `capto-stay-50`) to retain.

> ⚠️ The Stripe key is **LIVE**. Creating Checkout Sessions is safe (no charge
> until a real card is entered). Never complete a real checkout while testing.

---

## Key rotation runbook

Rotate by (1) generating a NEW key in the provider dashboard, (2) pushing it as
a Worker secret, (3) redeploying, (4) revoking the OLD key. Replace the
`<NEW_…>` placeholders — never paste a key into chat or commit it.

```bash
# Resend — create a new key at resend.com/api-keys, then:
printf '%s' '<NEW_RESEND_KEY>' | npx wrangler secret put RESEND_API_KEY

# Groq — create a new key at console.groq.com/keys, then:
printf '%s' '<NEW_GROQ_KEY>' | npx wrangler secret put GROQ_API_KEY

# Stripe webhook signing secret — Stripe Dashboard → Developers → Webhooks →
# your capto.video endpoint → "Roll secret" (or recreate), then:
printf '%s' '<NEW_STRIPE_WHSEC>' | npx wrangler secret put STRIPE_WEBHOOK_SECRET

# Stripe secret key (only if rotating it) — Dashboard → Developers → API keys →
# roll the live secret key, then:
printf '%s' '<NEW_STRIPE_SECRET_KEY>' | npx wrangler secret put STRIPE_SECRET_KEY
```

After any secret change, redeploy so the running Worker picks it up:

```bash
npm run cf:deploy
```

### Enabling the premium AI engines (optional)

Capto runs on the house **Groq** key today (Whisper). The other engines are
optional — set their key as a Worker secret and they light up automatically as
managed (paid-tier) options; the "Auto" engine starts load-balancing toward
whichever scores best. Until then, users can always plug in their own key in
Settings.

```bash
# Deepgram Nova-3 (premium STT) — console.deepgram.com
printf '%s' '<DEEPGRAM_KEY>' | npx wrangler secret put DEEPGRAM_API_KEY

# OpenAI Whisper (alt STT) — platform.openai.com/api-keys
printf '%s' '<OPENAI_KEY>' | npx wrangler secret put OPENAI_API_KEY

# Gemini 2.5 Flash — powers Translate + Emoji for Pro/Ultra — aistudio.google.com/apikey
printf '%s' '<GEMINI_KEY>' | npx wrangler secret put GEMINI_API_KEY

npm run cf:deploy   # redeploy to pick them up
```

> Operating cost note: Groq Whisper is ~$0.0001–0.0004 / audio-minute, so even a
> heavy free user costs a fraction of a cent. The cost lever is **volume**, which
> is why Free is hard-capped (5 AI runs/mo) and Pro soft-capped (300/mo). Deepgram
> and Gemini are pay-as-you-go; they only bill when those engines actually run.

Then **revoke the old keys** in each provider dashboard. For the Cloudflare API
token: delete it from the Cloudflare dashboard (My Profile → API Tokens) — do
this together, last, since it's the token used to manage the Worker itself.

### Verify after rotation

```bash
npx wrangler secret list                       # names present (values never shown)
curl -s -o /dev/null -w "%{http_code}\n" https://capto.video         # 200
# Send a Stripe test event from the Dashboard → it should 200, not 400.
```
