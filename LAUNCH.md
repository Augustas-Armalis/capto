# Capto — launch checklist

Status as of this build: the app is feature-complete for a public beta and
deployed to Cloudflare Workers. This is what's done and what remains to be
fully production-grade.

## ✅ Done

- **Marketing site** — home, pricing, for-creators, for-brands, FAQ, contact,
  blog, compare, tools, styles, status. SEO: metadata, canonicals, sitemap with
  real dates, robots (private/auth pages blocked), JSON-LD (no fake ratings).
- **Auth** — better-auth email/password on Neon. Server-side route gating.
- **Editor** — fully client-side: upload (local, by reference), Groq Whisper
  transcription, editable cues, 9 styles, live canvas preview = export, MP4/WebM
  export with free-tier watermark, project save to Neon.
- **Billing** — pay-first Stripe Checkout (Get Pro/Ultra → pay → auto account →
  set password in onboarding). Webhook reconciles plans. Free export cap (3/mo)
  enforced atomically.
- **Security** — pay-first completion hardened (paid+guest+subscription gates,
  no unauthenticated account rebind, passwordless creation + session-gated
  setPassword). BYOK precedence. Edge-safe webhook signature. Secrets in Worker.
- **Perf** — public/ trimmed 29MB → ~0.9MB. Smooth-scroll scoped to marketing.
- **Deploy** — LIVE on Cloudflare Workers via OpenNext at
  **https://capto-web.trycapto.workers.dev** (verified: home/pricing/blog 200,
  signup writes to Neon, auth gate redirects, Stripe Checkout returns a real
  session, /status all-green). Stripe SDK uses the Workers fetch client.

## ⚠️ ONE manual step to finish the apex domain (capto.video)

I deployed and verified everything, but I could not attach the `capto.video`
apex automatically: the zone already has a pre-existing externally-managed DNS
record on the apex (and the local wrangler OAuth token lacks DNS-edit scope to
replace it). It's a ~30-second dashboard click:

1. Cloudflare dash → **Workers & Pages → capto-web → Settings → Domains & Routes**
   → **Add → Custom Domain** → enter `capto.video` → confirm **"replace the
   existing DNS record"**. (Optionally repeat for `www.capto.video`.)
2. In `wrangler.toml`, set `workers_dev = false` and uncomment the
   `routes = [{ pattern = "capto.video", custom_domain = true }]` line, then
   `npm run cf:deploy` so the canonical domain is the only public origin.

Everything else (DATABASE_URL, auth, Stripe keys + all 8 price IDs, encryption)
is already set as Worker secrets and the runtime `NEXT_PUBLIC_SITE_URL` is
`https://capto.video`, so the moment the domain points at the Worker the site is
fully branded on capto.video with no further changes.

## 🔜 Before / right after going public

1. **Create the Stripe webhook (REQUIRED for plan upgrades to stick).**
   Stripe Dashboard → Developers → Webhooks → add endpoint
   `https://capto.video/api/stripe/webhook`, events: `checkout.session.completed`,
   `customer.subscription.created|updated|deleted`. Copy the signing secret and
   set it: `printf '%s' whsec_xxx | npx wrangler secret put STRIPE_WEBHOOK_SECRET`,
   then redeploy (`npm run cf:deploy`). Until this exists, a paid checkout still
   creates the account (via /welcome) but webhook-driven plan changes/cancels
   won't sync.

2. **Run ONE real end-to-end purchase** (Stripe is LIVE). Buy Pro, confirm the
   account is created, you land in onboarding, set a password, sign out, sign
   back in. Refund yourself in the Stripe dashboard afterward. This is the only
   path not testable without a real card.

3. **Decide the "lossless" wording.** The browser export re-encodes at high
   bitrate (12 Mbps) — excellent quality, but not literally lossless. Either
   soften the marketing copy ("original-quality export, no recompression on
   import") or add an ffmpeg.wasm pipeline later.

4. **House Groq key.** `GROQ_API_KEY` is set as a fallback so the free tier works
   without the user adding their own. If you want strict BYOK (no house cost),
   unset that Worker secret.

## 🪧 Nice-to-have (post-launch, non-blocking)

- Server-side currency (cookie/CF country header) so prices render correct
  currency without a client flash; make billing page honor it (currently € on
  the billing screen).
- Webhook event de-duplication table (idempotency on `event.id`).
- Real testimonials/ratings before re-adding any `aggregateRating` JSON-LD.
- Optimize `og.png` (385KB → ~80KB) — crawler-only, low priority.
- Settings: inline name/email editing; a "set password" affordance for the rare
  account stuck without one.
- If you connect GitHub → Cloudflare CI builds, set `NEXT_PUBLIC_SITE_URL` and
  `BETTER_AUTH_URL` in the CI build env (locally they come from `.env.production`).

## Redeploy

```bash
npm run cf:deploy          # build + wrangler deploy
bash cloudflare-secrets.sh # (re)push secrets from .env
```
