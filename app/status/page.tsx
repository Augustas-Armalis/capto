import type { Metadata } from "next";
import { neon } from "@neondatabase/serverless";
import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { Container } from "@/components/ui/container";
import { env, isConfigured } from "@/lib/env";
import { getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "Status",
  description: "Live status of Capto's services.",
  robots: { index: false },
};

type State = "ok" | "warn" | "down";
type Check = { name: string; state: State; detail: string };

async function checkDb(): Promise<Check> {
  if (!isConfigured.db()) return { name: "Database (Neon)", state: "down", detail: "DATABASE_URL not set" };
  try {
    const sql = neon(env.databaseUrl);
    const rows = await sql`select count(*)::int as n from "user"`;
    return { name: "Database (Neon)", state: "ok", detail: `connected · ${rows[0]?.n ?? 0} users` };
  } catch (e) {
    return { name: "Database (Neon)", state: "down", detail: e instanceof Error ? e.message.slice(0, 80) : "query failed" };
  }
}

async function checkStripe(): Promise<Check[]> {
  const out: Check[] = [];
  if (!isConfigured.stripe()) {
    out.push({ name: "Stripe", state: "down", detail: "STRIPE_SECRET_KEY not set" });
    return out;
  }
  const live = env.stripeSecret.startsWith("sk_live_");
  out.push({ name: "Stripe API key", state: "ok", detail: live ? "live mode" : "test mode" });

  // webhook: is an endpoint registered pointing at our URL?
  try {
    const stripe = getStripe();
    const eps = await stripe.webhookEndpoints.list({ limit: 20 });
    const mine = eps.data.find((e) => e.url.includes("/api/stripe/webhook"));
    if (!env.stripeWebhookSecret) {
      out.push({ name: "Stripe webhook", state: "warn", detail: "secret not set yet (set after deploy)" });
    } else if (mine) {
      out.push({ name: "Stripe webhook", state: "ok", detail: `endpoint live · ${mine.status}` });
    } else {
      out.push({ name: "Stripe webhook", state: "warn", detail: "secret set, no endpoint found at this domain" });
    }
  } catch (e) {
    out.push({ name: "Stripe webhook", state: "warn", detail: e instanceof Error ? e.message.slice(0, 70) : "check failed" });
  }

  const prices = [
    "STRIPE_PRICE_PRO_MONTHLY_EUR", "STRIPE_PRICE_PRO_MONTHLY_USD",
    "STRIPE_PRICE_PRO_ANNUAL_EUR", "STRIPE_PRICE_PRO_ANNUAL_USD",
    "STRIPE_PRICE_ULTRA_MONTHLY_EUR", "STRIPE_PRICE_ULTRA_MONTHLY_USD",
    "STRIPE_PRICE_ULTRA_ANNUAL_EUR", "STRIPE_PRICE_ULTRA_ANNUAL_USD",
  ];
  const set = prices.filter((k) => (process.env[k] || "").startsWith("price_")).length;
  out.push({
    name: "Stripe prices",
    state: set === 8 ? "ok" : set === 0 ? "down" : "warn",
    detail: `${set} / 8 configured`,
  });
  return out;
}

export default async function StatusPage() {
  const checks: Check[] = [
    await checkDb(),
    { name: "Authentication", state: isConfigured.auth() ? "ok" : "down", detail: isConfigured.auth() ? "configured" : "BETTER_AUTH_SECRET missing" },
    ...(await checkStripe()),
    { name: "Transcription (Groq)", state: env.houseGroqKey ? "ok" : "warn", detail: env.houseGroqKey ? "house key set" : "users bring their own key" },
    { name: "Site URL", state: env.siteUrl.startsWith("http") ? "ok" : "warn", detail: env.siteUrl },
  ];

  const dot = { ok: "bg-[var(--color-success)]", warn: "bg-[var(--color-warning)]", down: "bg-[var(--color-danger)]" };
  const label = { ok: "Operational", warn: "Attention", down: "Down" };
  const allOk = checks.every((c) => c.state === "ok");

  return (
    <>
      <SiteNav />
      <main className="pt-32 pb-24">
        <Container size="narrow">
          <div className="flex items-center gap-3">
            <span className={`size-2.5 rounded-full ${allOk ? dot.ok : dot.warn}`} />
            <h1 className="display text-4xl text-white">System status</h1>
          </div>
          <p className="mt-3 text-[var(--color-fg-muted)]">
            {allOk ? "All systems operational." : "Some services need attention."} Live check, refreshed on load.
          </p>

          <div className="mt-10 divide-y divide-white/[0.07] overflow-hidden rounded-[var(--radius-xl)] border border-white/[0.08] bg-white/[0.02]">
            {checks.map((c) => (
              <div key={c.name} className="flex items-center justify-between gap-4 px-6 py-4">
                <div className="flex items-center gap-3">
                  <span className={`size-2 rounded-full ${dot[c.state]}`} />
                  <span className="text-sm font-medium text-white">{c.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="mono text-xs text-[var(--color-fg-subtle)]">{c.detail}</span>
                  <span className="text-xs text-[var(--color-fg-muted)]">{label[c.state]}</span>
                </div>
              </div>
            ))}
          </div>

          <p className="mono mt-6 text-xs text-[var(--color-fg-subtle)]">
            Powered by Contles · {env.siteName}
          </p>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
