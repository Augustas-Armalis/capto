import type { Metadata } from "next";
import { and, eq } from "drizzle-orm";
import { EditorShell, type InitialProject } from "./editor-shell";
import { getCurrentSession } from "@/lib/session";
import { getDb, project, user } from "@/lib/db";
import { isConfigured } from "@/lib/env";

export const metadata: Metadata = {
  title: "Editor",
  description: "Drop a video, caption it, ship it.",
};

export const dynamic = "force-dynamic";

type Plan = "free" | "pro" | "ultra";

export default async function EditorRoute({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const { project: projectId } = await searchParams;

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
        const [row] = await db
          .select()
          .from(project)
          .where(and(eq(project.id, projectId), eq(project.userId, session.user.id)))
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

  return <EditorShell plan={plan} initialProject={initialProject} />;
}
