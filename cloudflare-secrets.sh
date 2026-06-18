#!/usr/bin/env bash
# Pushes Capto's secrets to the Cloudflare Worker.
# Reads values from your local .env (gitignored) — no secrets live in this file.
# Run AFTER `npx wrangler login` and a first `npm run cf:deploy`.
#
#   bash cloudflare-secrets.sh
#
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -f .env ]; then echo "No .env found. cp .env.example .env and fill it first."; exit 1; fi

put() {
  local key="$1" val="$2"
  if [ -z "$val" ]; then echo "skip $key (empty in .env, set it later)"; return; fi
  printf '%s' "$val" | npx wrangler secret put "$key"
}

fromenv() { grep -E "^$1=" .env | head -1 | cut -d= -f2-; }

# server secrets, read from .env
for K in \
  DATABASE_URL \
  BETTER_AUTH_SECRET \
  ENCRYPTION_KEY \
  STRIPE_SECRET_KEY \
  STRIPE_WEBHOOK_SECRET \
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY \
  STRIPE_PRICE_PRO_MONTHLY_EUR \
  STRIPE_PRICE_PRO_MONTHLY_USD \
  STRIPE_PRICE_PRO_ANNUAL_EUR \
  STRIPE_PRICE_PRO_ANNUAL_USD \
  STRIPE_PRICE_ULTRA_MONTHLY_EUR \
  STRIPE_PRICE_ULTRA_MONTHLY_USD \
  STRIPE_PRICE_ULTRA_ANNUAL_EUR \
  STRIPE_PRICE_ULTRA_ANNUAL_USD \
; do
  put "$K" "$(fromenv "$K")"
done

# production auth URL (your .env uses localhost for dev)
put BETTER_AUTH_URL "https://capto.video"

echo
echo "Done. Set STRIPE_WEBHOOK_SECRET after you create the webhook (step 7 in PUSH.md), then redeploy."
