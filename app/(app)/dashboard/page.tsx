import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { ArrowRight, Plus, Video, Sparkles, Clock, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/ui/money";
import { getCurrentSession } from "@/lib/session";
import { getDb, project, user } from "@/lib/db";
import { isConfigured } from "@/lib/env";
import { fmtTime } from "@/lib/cues";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

type Row = { id: string; name: string; durationSec: number | null; updatedAt: Date };

export default async function DashboardPage() {
  const session = await getCurrentSession();
  const u = session?.user;
  const firstName = u?.name?.split(" ")[0] || "there";

  let projects: Row[] = [];
  let plan: "free" | "pro" | "ultra" = "free";
  if (isConfigured.db() && u?.id) {
    const db = getDb();
    const [meRow] = await db.select({ plan: user.plan }).from(user).where(eq(user.id, u.id)).limit(1);
    if (meRow?.plan) plan = meRow.plan;
    projects = await db
      .select({
        id: project.id,
        name: project.name,
        durationSec: project.durationSec,
        updatedAt: project.updatedAt,
      })
      .from(project)
      .where(eq(project.userId, u.id))
      .orderBy(desc(project.updatedAt))
      .limit(24);
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10 lg:px-10">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="brand">Welcome back</Badge>
          <h1 className="heading mt-3 text-4xl sm:text-5xl">Hey {firstName} 👋</h1>
          <p className="mt-2 text-[var(--color-fg-muted)]">
            Drop a new clip in the editor or pick up where you left off.
          </p>
        </div>
        <Button href="/editor" size="lg">
          <Plus className="size-4" />
          New project
        </Button>
      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-3">
        <Link
          href="/editor"
          className="group relative overflow-hidden rounded-3xl border border-[var(--color-border)] bg-gradient-to-br from-[var(--color-brand)]/10 via-[var(--color-bg-elev)] to-[var(--color-bg-elev)] p-7 transition-all hover:-translate-y-0.5 hover:border-[var(--color-brand)]/40"
        >
          <div className="inline-flex size-11 items-center justify-center rounded-2xl bg-[var(--color-brand)]/15 text-[var(--color-brand)]">
            <Video className="size-5" />
          </div>
          <h3 className="mt-5 text-lg font-semibold">Open the editor</h3>
          <p className="mt-2 text-sm text-[var(--color-fg-muted)]">
            Drop a video, get word-perfect captions, ship it.
          </p>
          <ArrowRight className="absolute bottom-6 right-6 size-5 text-[var(--color-fg-muted)] transition-all group-hover:translate-x-1 group-hover:text-[var(--color-brand)]" />
        </Link>

        <Link
          href="/settings#api-keys"
          className="group relative overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-7 transition-all hover:-translate-y-0.5 hover:border-[var(--color-brand)]/40"
        >
          <div className="inline-flex size-11 items-center justify-center rounded-2xl bg-[var(--color-bg-soft)] text-[var(--color-fg)]">
            <KeyRound className="size-5" />
          </div>
          <h3 className="mt-5 text-lg font-semibold">API keys</h3>
          <p className="mt-2 text-sm text-[var(--color-fg-muted)]">
            Bring your Groq key for transcription. We encrypt and store it for you.
          </p>
          <ArrowRight className="absolute bottom-6 right-6 size-5 text-[var(--color-fg-muted)] transition-all group-hover:translate-x-1 group-hover:text-[var(--color-fg)]" />
        </Link>

        {plan === "free" ? (
          <Link
            href="/billing"
            className="group relative overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-7 transition-all hover:-translate-y-0.5 hover:border-[var(--color-brand)]/40"
          >
            <div className="inline-flex size-11 items-center justify-center rounded-2xl bg-[var(--color-bg-soft)] text-[var(--color-fg)]">
              <Sparkles className="size-5" />
            </div>
            <h3 className="mt-5 text-lg font-semibold">Upgrade to Pro</h3>
            <p className="mt-2 text-sm text-[var(--color-fg-muted)]">
              Unlimited exports, no watermark, lossless quality. <Money eur="6.99" usd="7.99" />/mo.
            </p>
            <ArrowRight className="absolute bottom-6 right-6 size-5 text-[var(--color-fg-muted)] transition-all group-hover:translate-x-1 group-hover:text-[var(--color-fg)]" />
          </Link>
        ) : (
          <div className="relative overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-7">
            <div className="inline-flex size-11 items-center justify-center rounded-2xl bg-[var(--color-brand)]/15 text-[var(--color-brand)]">
              <Sparkles className="size-5" />
            </div>
            <h3 className="mt-5 text-lg font-semibold capitalize">{plan} plan</h3>
            <p className="mt-2 text-sm text-[var(--color-fg-muted)]">
              Unlimited, watermark-free, lossless exports are on. Manage it in billing.
            </p>
            <Link href="/billing" className="mt-3 inline-flex items-center gap-1 text-sm text-[var(--color-brand)] hover:underline">
              Manage billing <ArrowRight className="size-3.5" />
            </Link>
          </div>
        )}
      </div>

      <div className="mt-10">
        <h2 className="text-base font-semibold tracking-tight">Recent projects</h2>
        {projects.length === 0 ? (
          <div className="mt-5 rounded-3xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg-elev)]/40 p-12 text-center">
            <p className="text-sm text-[var(--color-fg-muted)]">
              Your captioned reels will appear here. Open the editor to start your first one.
            </p>
            <Button href="/editor" variant="secondary" className="mt-5" size="md">
              Open editor →
            </Button>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <Link
                key={p.id}
                href={`/editor?project=${p.id}`}
                className="group rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-5 transition-all hover:-translate-y-0.5 hover:border-[var(--color-brand)]/40"
              >
                <div className="flex items-center justify-between">
                  <div className="inline-flex size-9 items-center justify-center rounded-xl bg-[var(--color-bg-soft)] text-[var(--color-fg-muted)] group-hover:text-[var(--color-brand)]">
                    <Video className="size-4" />
                  </div>
                  <ArrowRight className="size-4 text-[var(--color-fg-subtle)] transition-all group-hover:translate-x-1 group-hover:text-[var(--color-brand)]" />
                </div>
                <h3 className="mt-4 truncate font-medium text-white">{p.name}</h3>
                <div className="mt-1 flex items-center gap-1.5 text-xs text-[var(--color-fg-subtle)]">
                  <Clock className="size-3" />
                  {p.durationSec ? fmtTime(p.durationSec) : "—"} · saved{" "}
                  {new Date(p.updatedAt).toLocaleDateString()}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
