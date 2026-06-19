import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { Plus, Sparkles, ArrowRight, Upload, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/ui/money";
import { PoweredByContles } from "@/components/marketing/powered-by-contles";
import { ProjectsGrid, type ProjectRow } from "@/components/app/projects-grid";
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
    <div className="mx-auto w-full max-w-5xl px-6 py-10 lg:px-10">
      <div className="flex flex-col gap-1">
        <h1 className="heading text-3xl text-white sm:text-4xl">Hey {firstName} 👋</h1>
        <p className="text-[var(--color-fg-muted)]">Drop a clip, get word-perfect captions, ship it.</p>
      </div>

      {/* Free-tier upsell */}
      {isFree && (
        <div className="glow-border-always mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/15 bg-white/[0.04] p-5">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-[var(--color-brand)]/15 text-[var(--color-brand)]">
              <Sparkles className="size-5" />
            </span>
            <div>
              <p className="font-semibold text-white">You&rsquo;re on Free</p>
              <p className="text-sm text-[var(--color-fg-muted)]">
                One project, watermark, 1080p. Go Pro for unlimited lossless exports, no watermark, every style. From{" "}
                <Money eur="5.00" usd="5.83" />/mo.
              </p>
            </div>
          </div>
          <Button href="/billing" variant="primary" size="md">
            Upgrade to Pro
            <ArrowRight className="size-4" />
          </Button>
        </div>
      )}

      {/* Drop / new project */}
      <Link
        href="/editor"
        className="group mt-6 flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-white/12 bg-gradient-to-b from-white/[0.04] to-transparent p-12 text-center transition-colors hover:border-[var(--color-brand)]/50 hover:from-white/[0.06]"
      >
        <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-[var(--color-brand)]/15 text-[var(--color-brand)] transition-transform group-hover:scale-105">
          <Upload className="size-7" />
        </span>
        <span className="heading mt-5 text-xl text-white">Start a new project</span>
        <span className="mt-2 max-w-sm text-sm text-[var(--color-fg-muted)]">
          Drop an MP4, MOV or WebM. It stays on your device, we just add the captions.
        </span>
        <span className="mt-5 inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-white px-4 py-2 text-sm font-medium text-black">
          <Plus className="size-4" />
          Open the editor
        </span>
      </Link>

      {/* Secondary: connect a key (until BYOK is removed) */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
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

      {/* Recent projects */}
      <div className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold tracking-tight">Recent projects</h2>
          {projects.length > 0 && <Badge variant="outline">{projects.length}</Badge>}
        </div>
        <ProjectsGrid initial={projects} />
      </div>
    </div>
  );
}
