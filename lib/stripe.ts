import Stripe from "stripe";
import { env, isConfigured } from "./env";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  if (!isConfigured.stripe()) {
    throw new Error("Stripe not configured. Set STRIPE_SECRET_KEY in .env.");
  }
  _stripe = new Stripe(env.stripeSecret, {
    apiVersion: "2025-02-24.acacia",
    typescript: true,
    // Cloudflare Workers has no Node http stack — use the Fetch client so the
    // SDK's outbound calls work (otherwise every Stripe call hangs).
    httpClient: Stripe.createFetchHttpClient(),
  });
  return _stripe;
}
