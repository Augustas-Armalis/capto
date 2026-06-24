import type { Metadata } from "next";
import Link from "next/link";
import { sql } from "drizzle-orm";
import { getDb, user as userTable, project as projectTable, feedback as feedbackTable, aiMetric } from "@/lib/db";
import { isConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  let users = 0;
  let byPlan: Record<string, number> = { free: 0, pro: 0, ultra: 0, friend: 0 };
  let projects = 0;
  let openFeedback = 0;
  let totalFeedback = 0;
  let transcriptions = 0;
  let words = 0;
  let feedbackTable_ok = true;
  // Revenue (estimated from active paid subscriptions at the monthly list price).
  const PRICE: Record<string, number> = { pro: 6.99, ultra: 17.99 };
  let mrr = 0;
  let payingCustomers = 0;
  const activePaid: Record<string, number> = { pro: 0, ultra: 0 };

  if (isConfigured.db()) {
    const db = getDb();
    try {
      const [u] = await db.select({ n: sql<number>`count(*)` }).from(userTable);
      users = Number(u?.n ?? 0);
      const plans = await db
        .select({ plan: userTable.plan, n: sql<number>`count(*)` })
        .from(userTable)
        .groupBy(userTable.plan);
      byPlan = { free: 0, pro: 0, ultra: 0, friend: 0 };
      for (const p of plans) byPlan[p.plan] = Number(p.n);
    } catch {}
    try {
      const subs = await db
        .select({ plan: userTable.plan, n: sql<number>`count(*)` })
        .from(userTable)
        .where(sql`${userTable.plan} in ('pro','ultra') and ${userTable.subscriptionStatus} in ('active','trialing') and ${userTable.stripeSubscriptionId} is not null`)
        .groupBy(userTable.plan);
      for (const s of subs) activePaid[s.plan] = Number(s.n);
      mrr = activePaid.pro * PRICE.pro + activePaid.ultra * PRICE.ultra;
      payingCustomers = activePaid.pro + activePaid.ultra;
    } catch {}
    try {
      const [p] = await db.select({ n: sql<number>`count(*)` }).from(projectTable);
      projects = Number(p?.n ?? 0);
    } catch {}
    try {
      const [f] = await db.select({ n: sql<number>`count(*)` }).from(feedbackTable);
      totalFeedback = Number(f?.n ?? 0);
      const [o] = await db
        .select({ n: sql<number>`count(*)` })
        .from(feedbackTable)
        .where(sql`${feedbackTable.resolved} = false`);
      openFeedback = Number(o?.n ?? 0);
    } catch {
      feedbackTable_ok = false;
    }
    try {
      const rows = await db.select().from(aiMetric);
      for (const r of rows) {
        transcriptions += r.runs;
        words += r.words;
      }
    } catch {}
  }

  const cards = [
    { label: "Users", value: users.toLocaleString(), href: "/admin/users" },
    { label: "Projects", value: projects.toLocaleString(), href: null },
    {
      label: "Open feedback",
      value: feedbackTable_ok ? openFeedback.toLocaleString() : "—",
      href: "/admin/feedback",
    },
    { label: "Transcriptions", value: transcriptions.toLocaleString(), href: "/admin/learning" },
  ];

  return (
    <div className="px-6 py-8 lg:px-10">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => {
          const inner = (
            <>
              <div className="text-xs uppercase tracking-wide text-[var(--color-fg-subtle)]">{c.label}</div>
              <div className="display mt-1 text-3xl tnum text-white">{c.value}</div>
            </>
          );
          return c.href ? (
            <Link
              key={c.label}
              href={c.href}
              className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-5 transition-colors hover:border-[var(--color-brand)]/50"
            >
              {inner}
            </Link>
          ) : (
            <div key={c.label} className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-5">
              {inner}
            </div>
          );
        })}
      </div>

      {/* revenue */}
      <h2 className="heading mt-10 mb-3 text-lg">Revenue</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-[var(--radius-xl)] border border-[var(--color-brand)]/30 bg-[var(--color-brand-soft)] p-5">
          <div className="text-xs uppercase tracking-wide text-[var(--color-fg-subtle)]">Est. MRR</div>
          <div className="display mt-1 text-3xl tnum text-white">€{mrr.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className="mt-1 text-xs text-[var(--color-fg-subtle)]">≈ €{(mrr * 12).toLocaleString(undefined, { maximumFractionDigits: 0 })} ARR</div>
        </div>
        <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-5">
          <div className="text-xs uppercase tracking-wide text-[var(--color-fg-subtle)]">Paying customers</div>
          <div className="display mt-1 text-3xl tnum text-white">{payingCustomers.toLocaleString()}</div>
          <div className="mt-1 text-xs text-[var(--color-fg-subtle)]">{activePaid.pro} Pro · {activePaid.ultra} Ultra</div>
        </div>
        <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-5">
          <div className="text-xs uppercase tracking-wide text-[var(--color-fg-subtle)]">Conversion</div>
          <div className="display mt-1 text-3xl tnum text-white">{users > 0 ? ((payingCustomers / users) * 100).toFixed(1) : "0.0"}%</div>
          <div className="mt-1 text-xs text-[var(--color-fg-subtle)]">of {users.toLocaleString()} accounts</div>
        </div>
      </div>
      <p className="mt-2 text-xs text-[var(--color-fg-subtle)]">
        From <strong>live Stripe subscriptions only</strong> at list price (Pro €{PRICE.pro} · Ultra €{PRICE.ultra}/mo). Comped friends 💛 and admin/Ultra accounts without a real subscription aren&rsquo;t counted.
      </p>

      {/* plan breakdown */}
      <h2 className="heading mt-10 mb-3 text-lg">Plans</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Free", value: byPlan.free, tone: "text-[var(--color-fg-muted)]" },
          { label: "Pro", value: byPlan.pro, tone: "text-[var(--color-brand)]" },
          { label: "Ultra", value: byPlan.ultra, tone: "text-white" },
          { label: "Friends 💛", value: byPlan.friend, tone: "text-[var(--color-warning,#facc15)]" },
        ].map((p) => (
          <div key={p.label} className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-5">
            <div className={`text-sm font-medium ${p.tone}`}>{p.label}</div>
            <div className="display mt-1 text-2xl tnum text-white">{p.value.toLocaleString()}</div>
          </div>
        ))}
      </div>

      <h2 className="heading mt-10 mb-3 text-lg">Volume</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-5">
          <div className="text-xs uppercase tracking-wide text-[var(--color-fg-subtle)]">Words transcribed</div>
          <div className="display mt-1 text-2xl tnum text-white">{words.toLocaleString()}</div>
        </div>
        <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-5">
          <div className="text-xs uppercase tracking-wide text-[var(--color-fg-subtle)]">Total feedback</div>
          <div className="display mt-1 text-2xl tnum text-white">{feedbackTable_ok ? totalFeedback.toLocaleString() : "—"}</div>
        </div>
      </div>

      {!feedbackTable_ok && (
        <p className="mt-6 text-sm text-[var(--color-warning)]">
          The feedback table isn&rsquo;t created yet — run{" "}
          <code className="rounded bg-[var(--color-bg-elev)] px-1.5 py-0.5">npm run db:migrate</code> to start collecting reports.
        </p>
      )}
    </div>
  );
}
