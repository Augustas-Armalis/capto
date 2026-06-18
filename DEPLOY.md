# Capto — deploy playbook (Cloudflare + Neon + Stripe)

Domain: **capto.video**
Repo: **github.com/Augustas-Armalis/capto**
Hosting: Cloudflare Workers (via `@opennextjs/cloudflare`)
Database: Neon Postgres (Frankfurt)
Payments: Stripe
Email: Cloudflare Email Routing → forwards `hello@capto.video` to your inbox

Follow phases in order. Each has a ✅ check. Total: ~75 min first time.
Legend: 🟢 required to go live · 🔵 can defer

---

## Phase 0 — Sanity check locally (5 min) 🟢

```bash
cd /Users/augustas/Documents/GitHub/Subby/subby
npm install
npm run build
```

✅ Build prints the route list and exits 0.

---

## Phase 1 — Push to your new GitHub repo (5 min) 🟢

The local remote is already pointed at `github.com/Augustas-Armalis/capto`. You need credentials on this machine — pick one:

```bash
# Easiest:
brew install gh && gh auth login
git push -u origin main

# Or PAT (create at github.com/settings/tokens, scope: repo):
git push -u origin main          # user = your GH username, pwd = the PAT

# Or SSH (key at github.com/settings/keys):
git remote set-url origin git@github.com:Augustas-Armalis/capto.git
git push -u origin main
```

✅ Code visible at github.com/Augustas-Armalis/capto. `node_modules`, `.env`, `uploads/`, `outputs/`, `.open-next/` are NOT there.

---

## Phase 2 — Finish Neon setup (5 min) 🟢

You're at the project-creation screen. Settings:

| Field | Value |
|---|---|
| Project name | `Capto` |
| Postgres version | 18 (default) |
| Region | **AWS Europe Central 1 (Frankfurt)** ← your nearest |
| **Neon Auth toggle** | **OFF** ← we use better-auth, not Neon Auth |

Hit **Create project**.

On the next screen: **Dashboard → Connection Details → Pooled connection** → copy the string. Looks like:
```
postgresql://neondb_owner:xxx@ep-xxx-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require
```

Locally:
```bash
cp .env.example .env
# open .env, paste the connection string into DATABASE_URL
```

✅ `DATABASE_URL` is in `.env`.

---

## Phase 3 — Generate secrets, create tables (3 min) 🟢

```bash
openssl rand -base64 32   # → paste as BETTER_AUTH_SECRET in .env
openssl rand -hex 32      # → paste as ENCRYPTION_KEY in .env  (must be exactly 64 hex chars)
```

Also in `.env`, for local dev temporarily:
```
NEXT_PUBLIC_SITE_URL=http://localhost:3000
BETTER_AUTH_URL=http://localhost:3000
```
(Production values stay `https://capto.video` — we'll set them in Cloudflare later.)

Create the tables:
```bash
npm run db:push
```

✅ Drizzle reports tables created. In Neon's SQL editor: `user`, `session`, `account`, `verification`, `user_api_key`, `project`.

---

## Phase 4 — Stripe (15 min) 🟢

1. dashboard.stripe.com — **Test mode** (top right toggle).
2. **Products** → Add product, create both:
   - **Capto Pro** — recurring, `EUR 6.99 / month` price + `EUR 69.90 / year` price
   - **Capto Ultra** — recurring, `EUR 17.99 / month` price + `EUR 179.90 / year` price
   Copy all 4 **Price IDs** (`price_...`).
3. **Developers → API keys**: copy `sk_test_...` and `pk_test_...`.
4. Paste into `.env`:
   ```
   STRIPE_SECRET_KEY=sk_test_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_PRICE_ID_PRO_MONTHLY=price_...
   STRIPE_PRICE_ID_PRO_ANNUAL=price_...
   STRIPE_PRICE_ID_ULTRA_MONTHLY=price_...
   STRIPE_PRICE_ID_ULTRA_ANNUAL=price_...
   ```
5. Local webhook forwarding:
   ```bash
   brew install stripe/stripe-cli/stripe
   stripe login
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   # copy the whsec_... into .env as STRIPE_WEBHOOK_SECRET, restart dev
   ```

6. Test: `npm run dev` → /signup → /billing → "Upgrade" → card `4242 4242 4242 4242`, any future expiry, any CVC. `/billing` flips to Pro.

✅ The Neon `user.plan` column is `pro` for that row.

---

## Phase 5 — Cloudflare DNS for capto.video (5 min) 🟢

1. dash.cloudflare.com → **Add a site** → `capto.video`.
2. Pick the **Free plan**.
3. Cloudflare scans existing DNS records — keep them.
4. Cloudflare shows you 2 nameservers (e.g. `lara.ns.cloudflare.com`, `noel.ns.cloudflare.com`). Go to your registrar (where you bought capto.video) and **replace the nameservers** with those two. Propagation: minutes to a couple hours.

✅ Cloudflare dashboard shows the site as "Active".

---

## Phase 6 — Cloudflare Email Routing for hello@capto.video (3 min) 🟢

Free, no inbox needed — forwards to your personal email.

1. Cloudflare → your `capto.video` site → **Email** → **Email Routing** → enable.
2. Cloudflare auto-adds the required MX + SPF records (click "Add records").
3. **Routing rules** → Create address → `hello@capto.video` → destination: your personal email (e.g. `augustas.armalis@aiacquisition.com`). Verify your personal email via the link Cloudflare sends.
4. Optional: add a **catch-all** rule so `anything@capto.video` forwards to you.

✅ Send a test email to `hello@capto.video` from another inbox — it lands in yours.

For **sending FROM** `hello@capto.video` (you'll want this for password resets later): use **Resend** (free tier 100 emails/day, very Cloudflare-friendly) and verify capto.video as a sending domain. We'll wire this when we turn on email verification — not required to go live.

---

## Phase 7 — Deploy to Cloudflare Workers (15 min) 🟢

Capto deploys via Cloudflare Workers using the official Next.js adapter (`@opennextjs/cloudflare`). The repo already has `wrangler.toml`, `open-next.config.ts`, and the build scripts.

```bash
# Login once
npx wrangler login

# First deploy — adapts the build for Workers, then ships it
npm run cf:deploy
```

Wrangler prints a `*.workers.dev` URL — open it to verify the site renders. Now add secrets (never commit these):

```bash
npx wrangler secret put DATABASE_URL                # paste pooled Neon string
npx wrangler secret put BETTER_AUTH_SECRET          # the base64
npx wrangler secret put ENCRYPTION_KEY              # the 64-hex
npx wrangler secret put STRIPE_SECRET_KEY           # sk_test_... (live later)
npx wrangler secret put STRIPE_WEBHOOK_SECRET       # will fill in step 9
npx wrangler secret put STRIPE_PRICE_ID_PRO_MONTHLY
npx wrangler secret put STRIPE_PRICE_ID_PRO_ANNUAL
npx wrangler secret put STRIPE_PRICE_ID_ULTRA_MONTHLY
npx wrangler secret put STRIPE_PRICE_ID_ULTRA_ANNUAL
npx wrangler secret put NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
```

Public env vars (`NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SITE_NAME`) are already in `wrangler.toml`'s `[vars]` block — already wired to `https://capto.video` / `Capto`. Also set `BETTER_AUTH_URL` (it isn't `NEXT_PUBLIC_*` because it's only read server-side):
```bash
npx wrangler secret put BETTER_AUTH_URL    # https://capto.video
```

Redeploy:
```bash
npm run cf:deploy
```

✅ The `*.workers.dev` URL loads, signup works, /billing 503s on Stripe checkout (expected — webhook secret comes in step 9).

---

## Phase 8 — Attach the capto.video domain to the Worker (3 min) 🟢

1. dash.cloudflare.com → **Workers & Pages** → `capto-web` → **Settings → Triggers → Add Custom Domain** → `capto.video` (and `www.capto.video` if you want www to also work).
2. Cloudflare auto-creates the routing — DNS propagates in a minute.

✅ `https://capto.video` loads the site over HTTPS.

---

## Phase 9 — Production Stripe webhook (3 min) 🟢

1. Stripe → Developers → Webhooks → **Add endpoint** → URL `https://capto.video/api/stripe/webhook`
2. Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`.
3. Copy the new signing secret (`whsec_...`).
4. ```bash
   npx wrangler secret put STRIPE_WEBHOOK_SECRET   # paste the live whsec_
   npm run cf:deploy
   ```

✅ Run a test checkout in production with test card `4242…`. `/billing` flips to Pro.

---

## Phase 10 — Cloudflare R2 (when wiring the editor backend) 🔵

R2 is Cloudflare's S3-compatible object storage — for storing user video uploads when we port the editor backend.

When ready:
1. dash.cloudflare.com → **R2 → Create bucket** → `capto-videos`.
2. Uncomment the `r2_buckets` block in `wrangler.toml`:
   ```toml
   [[r2_buckets]]
   binding = "VIDEO_BUCKET"
   bucket_name = "capto-videos"
   ```
3. Redeploy. The Worker accesses it via `env.VIDEO_BUCKET.put(...)`, no S3 SDK needed.

---

## Phase 11 — Flip to Stripe Live mode (when ready to take real money) 🔵

1. Stripe → toggle to **Live mode** (separate from test).
2. Recreate the 4 products/prices in live mode, copy new IDs.
3. Add the live webhook for `https://capto.video/api/stripe/webhook`, get the live `whsec_`.
4. Swap test→live values via `wrangler secret put` for `STRIPE_SECRET_KEY`, all 4 price IDs, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (this one isn't a secret per se but goes in the same way for Workers).
5. Redeploy. Buy your own Pro plan for €6.99 to confirm, then refund from Stripe.

---

## Useful Cloudflare commands

```bash
npm run cf:build         # adapt Next build for Workers (.open-next/)
npm run cf:preview       # run locally on Workers runtime (closer to prod than next dev)
npm run cf:deploy        # build + ship
npx wrangler tail        # stream production logs (great for debugging)
npx wrangler secret list # see which secrets are set
```

---

## Quick reference — what connects to what

```
                           capto.video
                                │
                   ┌────────────┴────────────┐
                   │  Cloudflare DNS         │
                   │  Cloudflare Workers     │ ← @opennextjs/cloudflare
                   │  Cloudflare Email       │ → hello@capto.video → your inbox
                   │  Cloudflare R2 (later)  │
                   └────────────┬────────────┘
                                │ HTTPS
              ┌─────────────────┼─────────────────┐
              ▼                 ▼                 ▼
       Neon (Frankfurt)     Stripe API        Groq API (per-user
       users · sessions     checkout +        encrypted keys —
       projects · keys      webhook           never seen by us)

         Powered by Contles → https://contles.com?ref=subby (in footer + brand)
```

---

## Known gaps (set expectations)

1. **Editor backend isn't wired on the web yet.** Upload / transcribe / export endpoints live only in `legacy/server.js`. The editor UI runs but those actions show "preview — backend not connected" until we port them. #1 roadmap item; R2 + a transcription Worker proxy is the architecture.
2. **Email verification + password reset** are not enabled. Wire later via better-auth + Resend.
3. **Free-plan export quota** columns exist but aren't enforced. Wire when the export backend lands.
4. **OAuth (Google/GitHub login)** not added. Email+password only for v1.
