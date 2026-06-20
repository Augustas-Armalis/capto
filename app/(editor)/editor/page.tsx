import type { Metadata } from "next";
import { and, eq, or } from "drizzle-orm";
import { EditorShell, type InitialProject } from "./editor-shell";
import { getCurrentSession } from "@/lib/session";
import { getDb, project, user } from "@/lib/db";
import { isConfigured } from "@/lib/env";
import { getUserTeam } from "@/lib/team";

export const metadata: Metadata = {
  title: "Editor",
  description: "Drop a video, caption it, ship it.",
};

export const dynamic = "force-dynamic";

type Plan = "free" | "pro" | "ultra";

export default async function EditorRoute({
  searchParams,
}: {
  searchParams: Promise<{ project?: string; lang?: string }>;
}) {
  const { project: projectId, lang } = await searchParams;
  const initialLanguage = typeof lang === "string" && /^[a-z]{2}$/.test(lang) ? lang : undefined;

  let plan: Plan = "free";
  let initialProject: InitialProject | null = null;

  if (isConfigured.db()) {
    const session = await getCurrentSession();
    if (session?.user?.id) {
      const db = getDb();
      const [u] = await db
        .select({ plan: user.plan })
        .from(user)
        .where(eq(user.id, session.user.id))
        .limit(1);
      if (u?.plan) plan = u.plan;

      if (projectId) {
        const teamCtx = await getUserTeam(session.user.id);
        const scope = teamCtx
          ? or(eq(project.userId, session.user.id), eq(project.teamId, teamCtx.teamId))
          : eq(project.userId, session.user.id);
        const [row] = await db
          .select()
          .from(project)
          .where(and(eq(project.id, projectId), scope))
          .limit(1);
        if (row) {
          let state: InitialProject["state"] = null;
          try {
            state = row.state ? JSON.parse(row.state) : null;
          } catch {
            state = null;
          }
          initialProject = { id: row.id, name: row.name, state };
        }
      }
    }
  }

  return <EditorShell plan={plan} initialProject={initialProject} initialLanguage={initialLanguage} />;
}
