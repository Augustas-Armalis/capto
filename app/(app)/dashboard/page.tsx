import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { Sparkles, ArrowRight, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/ui/money";
import { Aurora } from "@/components/marketing/aurora";
import { Reveal } from "@/components/marketing/reveal";
import { PoweredByContles } from "@/components/marketing/powered-by-contles";
import { ProjectsGrid, type ProjectRow } from "@/components/app/projects-grid";
import { StartPanel } from "@/components/app/start-panel";
import { getCurrentSession } from "@/lib/session";
import { getDb, project, user } from "@/lib/db";
import { isConfigured } from "@/lib/env";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getCurrentSession();
  const u = session?.user;
  const firstName = u?.name?.split(" ")[0] || "there";

  let projects: ProjectRow[] = [];
  let plan: "free" | "pro" | "ultra" = "free";
  if (isConfigured.db() && u?.id) {
    const db = getDb();
    const [meRow] = await db.select({ plan: user.plan }).from(user).where(eq(user.id, u.id)).limit(1);
    if (meRow?.plan) plan = meRow.plan;
    const rows = await db
      .select({
        id: project.id,
        name: project.name,
        durationSec: project.durationSec,
        updatedAt: project.updatedAt,
        thumbnail: project.thumbnailUrl,
      })
      .from(project)
      .where(eq(project.userId, u.id))
      .orderBy(desc(project.updatedAt))
      .limit(24);
    projects = rows.map((r) => ({ ...r, updatedAt: new Date(r.updatedAt).toISOString() }));
  }
  const isFree = plan === "free";

  return (
    <div className="relative">
      <Aurora preset="hero" />
      <div className="relative mx-auto w-full max-w-4xl px-5 py-10 sm:px-6 lg:py-14">
        <Reveal variant="up">
          <div className="flex flex-col gap-1">
            <h1 className="display text-3xl text-white sm:text-4xl">Hey {firstName} 👋</h1>
            <p className="text-[var(--color-fg-muted)]">Drop a clip, get word-perfect captions, ship it.</p>
          </div>
        </Reveal>

        {/* Free-tier upsell */}
        {isFree && (
          <Reveal variant="fade" delay={60}>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--color-brand)]/25 bg-[var(--color-brand-soft)] p-5">
              <div className="flex items-center gap-3">
                <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-[var(--color-brand)]/15 text-[var(--color-brand)]">
                  <Sparkles className="size-5" />
                </span>
                <div>
                  <p className="font-semibold text-white">You&rsquo;re on Free</p>
                  <p className="text-sm text-[var(--color-fg-muted)]">
                    One project, watermark, 1080p. Go Pro for unlimited lossless exports, no watermark,
                    every style. From <Money eur="5.00" usd="5.83" />/mo.
                  </p>
                </div>
              </div>
              <Button href="/billing" variant="primary" size="md">
                Upgrade to Pro
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </Reveal>
        )}

        {/* Start a project */}
        <Reveal variant="up" delay={100}>
          <div className="mt-6">
            <StartPanel />
          </div>
        </Reveal>

        {/* Recent projects */}
        <Reveal variant="up" delay={140}>
          <div className="mt-12">
            <div className="flex items-center justify-between">
              <h2 className="heading text-lg tracking-tight">Recent projects</h2>
              {projects.length > 0 && <Badge variant="outline">{projects.length}</Badge>}
            </div>
            <ProjectsGrid initial={projects} />
          </div>
        </Reveal>

        {/* Secondary: API keys + Contles */}
        <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-[var(--color-border)] pt-6">
          <Link
            href="/settings#api-keys"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] px-3.5 py-1.5 text-sm text-[var(--color-fg-muted)] transition-colors hover:border-[var(--color-brand)]/40 hover:text-white"
          >
            <KeyRound className="size-3.5" />
            API keys
          </Link>
          <span className="ml-auto">
            <PoweredByContles variant="inline" />
          </span>
        </div>
      </div>
    </div>
  );
}
