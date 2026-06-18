import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { getCurrentSession } from "@/lib/session";
import { getDb, project } from "@/lib/db";
import { isConfigured } from "@/lib/env";

export const runtime = "nodejs";

// The video file never leaves the user's device. We persist only the project
// metadata + editor state (cues, style, position) so it can be reopened and the
// local file re-linked, the way a desktop editor references media by path.

export async function GET() {
  if (!isConfigured.db()) return NextResponse.json({ projects: [] });
  const session = await getCurrentSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const rows = await db
    .select({
      id: project.id,
      name: project.name,
      durationSec: project.durationSec,
      updatedAt: project.updatedAt,
      state: project.state,
    })
    .from(project)
    .where(eq(project.userId, session.user.id))
    .orderBy(desc(project.updatedAt))
    .limit(60);

  return NextResponse.json({ projects: rows });
}

export async function POST(req: Request) {
  if (!isConfigured.db())
    return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  const session = await getCurrentSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as
    | { name?: string; durationSec?: number; state?: unknown }
    | null;
  if (!body) return NextResponse.json({ error: "Invalid body." }, { status: 400 });

  const db = getDb();
  const id = crypto.randomUUID();
  const name = (body.name || "Untitled project").slice(0, 120);
  const state = body.state ? JSON.stringify(body.state) : null;
  const durationSec = typeof body.durationSec === "number" ? Math.round(body.durationSec) : null;

  await db.insert(project).values({ id, userId: session.user.id, name, durationSec, state });

  return NextResponse.json({ id, name });
}
