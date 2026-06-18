# Capto — AI captions, web edition

The web SaaS for Capto — AI captions that actually look good. Built on Next.js 15, better-auth,
Drizzle/Neon Postgres, and Stripe. Powered by [Contles](https://contles.com?ref=subby-readme).

> The original Capto was a local desktop app. That code is preserved under [`/legacy`](./legacy)
> if you want the offline build with bundled ffmpeg and local Whisper.

---

## What's in here

```
/app                  Next.js App Router pages
  /(marketing)        landing, pricing, faq, for-creators, for-brands, privacy, terms, contact
  /(auth)             signin, signup
  /(app)              dashboard, onboarding, editor, settings, billing
  /api                better-auth, stripe checkout/portal/webhook, user api-keys
/components           UI primitives + marketing/app sections
/lib                  auth, db (drizzle + neon), stripe, crypto, pricing, env
/public               static assets (logo, fonts, editor under /_editor/)
/legacy               original local-app source (Express + ffmpeg + Whisper)
/drizzle.config.ts    migrations
/middleware.ts        protects /dashboard /onboarding /editor /settings /billing
```

The editor itself (`public/_editor/`) is loaded inside the authenticated `/editor` route as an
iframe. v1 ships the existing client-side editor untouched; we'll port it deeper into Next.js
over the next iterations.

---

## Local setup

```bash
npm install
cp .env.example .env
# fill in DATABASE_URL, BETTER_AUTH_SECRET, ENCRYPTION_KEY, Stripe keys
npm run db:push        # creates tables in your Neon database
npm run dev
```

Open http://localhost:3000

The site works without filled-in env vars — you'll see the marketing pages, but auth/checkout
return 503 until configured.

### Generating secrets

```bash
openssl rand -base64 32   # → BETTER_AUTH_SECRET
openssl rand -hex 32      # → ENCRYPTION_KEY
```

---

## Required services

| Service     | What it's for                       | Where                      |
| ----------- | ----------------------------------- | -------------------------- |
| **Neon**    | Postgres database (users, sessions) | https://console.neon.tech  |
| **Stripe** | Payments + customer portal           | https://dashboard.stripe.com |
| **Groq**   | Transcription (user brings own key)  | https://console.groq.com   |

1. **Neon** — create a project, copy the pooled connection string into `DATABASE_URL`.
2. **Stripe** —
   - Create a product "Capto Pro" with a €6.99 / month recurring price.
   - Copy the price ID into `STRIPE_PRICE_ID_PRO_MONTHLY`.
   - Set the webhook endpoint to `https://<your-domain>/api/stripe/webhook` and copy the signing
     secret into `STRIPE_WEBHOOK_SECRET`.
3. **Groq** — users add their own key in the onboarding flow. Optional: set a house `GROQ_API_KEY`
   to power the free plan for users who skip onboarding.

---

## Hosting

### Vercel (recommended for first deploy)

Push to GitHub, import the repo into Vercel, paste env vars from `.env.example`, hit deploy. Done.

### Cloudflare Pages (later)

Install `@opennextjs/cloudflare` and follow [their Next.js guide](https://opennext.js.org/cloudflare).
You'll also want a Cloudflare Worker route for the Stripe webhook and the Neon connection.

---

## Pricing

- **Free** — 3 captioned exports per month, watermark, BYOK Groq
- **Pro** — €6.99/mo, unlimited, no watermark, priority queue

Defined in [`lib/pricing.ts`](./lib/pricing.ts). Edit there and tweak the Stripe product to match.

---

## Roadmap

- [ ] Port the editor's `app.js` into a first-class Next.js client component (drop the iframe)
- [ ] Move per-project state from `localStorage` into Neon (so projects sync between devices)
- [ ] Serverless transcription proxy using the user's encrypted Groq key
- [ ] Cloud render queue for the export step
- [ ] Brand-locked preset library for agencies
- [ ] OAuth: Google + GitHub sign-in

---

## License

Proprietary. © Contles. See `/legacy/README.md` for the original local-app's terms.
