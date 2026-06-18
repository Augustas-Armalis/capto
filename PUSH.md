# Capto, push and go live

Exact commands, in order. Your local `.env` already holds the working values
(Neon DB, auth secret, encryption key, all 8 Stripe price IDs). After you roll
the Stripe keys, paste the new ones into `.env` and the rest flows through.

Run everything from the project folder:
`/Users/augustas/Documents/GitHub/Subby/subby`

---

## 1. Push to GitHub (one time auth)

```bash
brew install gh && gh auth login        # pick GitHub.com, HTTPS, login in browser
git push -u origin main
```

(`origin` already points at github.com/Augustas-Armalis/capto.)

✅ Code shows up on GitHub. `.env` is gitignored, so no secrets leave your machine.

## 2. Roll the Stripe key, then update .env

You said you would roll the live secret key. After you do:

1. Stripe, Developers, API keys, reveal the new `sk_live_...`.
2. Open `.env`, replace `STRIPE_SECRET_KEY=` with the new value.
   (Publishable key and the 8 price IDs are already correct.)

## 3. Log in to Cloudflare and deploy

```bash
npx wrangler login
npm run cf:deploy
```

This builds the Next app for Workers and ships it. You get a `*.workers.dev`
URL. Open it, it should load.

## 4. Push your secrets to the Worker

```bash
bash cloudflare-secrets.sh
```

This reads `.env` and sets every server secret on Cloudflare (DATABASE_URL,
auth secret, encryption key, Stripe keys, the 8 price IDs, and BETTER_AUTH_URL
set to https://capto.video). `STRIPE_WEBHOOK_SECRET` is skipped for now, you
add it in step 7.

Then redeploy so the Worker picks them up:

```bash
npm run cf:deploy
```

## 5. Point capto.video at Cloudflare

1. dash.cloudflare.com, Add a site, `capto.video`, Free plan.
2. It gives you two nameservers. Set those at your domain registrar.
3. Wait until Cloudflare shows the site as Active (minutes to a couple hours).

## 6. Attach the domain to the Worker

Cloudflare dashboard, Workers and Pages, `capto-web`, Settings, Triggers,
Add Custom Domain, `capto.video`. DNS routes in about a minute.

✅ https://capto.video now serves the site.

## 7. Production Stripe webhook

1. Stripe, Developers, Webhooks, Add endpoint:
   `https://capto.video/api/stripe/webhook`
2. Events: `checkout.session.completed`, `customer.subscription.created`,
   `customer.subscription.updated`, `customer.subscription.deleted`.
3. Copy the signing secret (`whsec_...`).
4. Set it and redeploy:
   ```bash
   printf '%s' 'whsec_xxx' | npx wrangler secret put STRIPE_WEBHOOK_SECRET
   npm run cf:deploy
   ```

## 8. Email for hello@capto.video

Cloudflare, your capto.video site, Email, Email Routing, Enable. It adds the
MX records. Then create address `hello@capto.video` routing to your inbox.

---

## What already works right now (verified)

- Sign up, sign in, sign out against your live Neon database. Wrong password is
  rejected, correct one issues a session.
- Pricing shows EUR or USD by visitor location. Checkout sends the matching
  price ID to Stripe.
- All marketing, blog, compare, tools, and style pages render statically.

## What is not wired yet (on purpose, for later)

- The in-app editor backend (upload, transcribe, export). The editor UI loads
  but processing is a later phase, you said you just want it on the web first.
- Email verification and password reset (sign-up is immediate for now).
- Cloudflare R2 for video storage (needed when the editor backend lands).

## Useful

```bash
npx wrangler tail          # live production logs
npx wrangler secret list   # which secrets are set
npm run cf:preview         # run the Workers build locally
```
