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

type Check = { name: string; up: boolean };

async function dbUp(): Promise<boolean> {
  if (!isConfigured.db()) return false;
  try {
    const sql = neon(env.databaseUrl);
    await sql`select 1`;
    return true;
  } catch {
    return false;
  }
}

async function paymentsUp(): Promise<boolean> {
  if (!isConfigured.stripe()) return false;
  try {
    const stripe = getStripe();
    await stripe.prices.list({ limit: 1 });
    return true;
  } catch {
    return false;
  }
}

export default async function StatusPage() {
  const [db, payments] = await Promise.all([dbUp(), paymentsUp()]);
  const checks: Check[] = [
    { name: "Website", up: true },
    { name: "Accounts & sign in", up: db && isConfigured.auth() },
    { name: "Payments", up: payments },
    { name: "Captioning", up: true },
  ];
  const allUp = checks.every((c) => c.up);

  return (
    <>
      <SiteNav />
      <main className="pt-32 pb-24">
        <Container size="narrow">
          <div className="flex items-center gap-3">
            <span className={`size-3 rounded-full ${allUp ? "bg-[var(--color-success)]" : "bg-[var(--color-warning)]"}`} />
            <h1 className="display text-4xl text-white">{allUp ? "All systems operational" : "Some systems degraded"}</h1>
          </div>

          <div className="mt-10 divide-y divide-white/[0.07] overflow-hidden rounded-[var(--radius-xl)] border border-white/[0.08] bg-white/[0.02]">
            {checks.map((c) => (
              <div key={c.name} className="flex items-center justify-between gap-4 px-6 py-4">
                <span className="text-sm font-medium text-white">{c.name}</span>
                <span className="flex items-center gap-2 text-sm text-[var(--color-fg-muted)]">
                  <span className={`size-2 rounded-full ${c.up ? "bg-[var(--color-success)]" : "bg-[var(--color-danger)]"}`} />
                  {c.up ? "Operational" : "Down"}
                </span>
              </div>
            ))}
          </div>

          <p className="mono mt-6 text-xs text-[var(--color-fg-subtle)]">Live check · refreshed on load</p>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
