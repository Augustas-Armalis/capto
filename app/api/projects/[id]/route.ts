import { NextResponse } from "next/server";
import { and, eq, or, type SQL } from "drizzle-orm";
import { getCurrentSession } from "@/lib/session";
import { getDb, project } from "@/lib/db";
import { isConfigured } from "@/lib/env";
import { getUserTeam } from "@/lib/team";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

// Access condition: the project is the user's own OR lives in their shared team
// workspace. Used for every read/write so the rule is enforced in one place.
async function projectAccess(id: string): Promise<{ db: ReturnType<typeof getDb>; where: SQL } | null> {
  const session = await getCurrentSession();
  if (!session?.user?.id) return null;
  const teamCtx = await getUserTeam(session.user.id);
  const owns = eq(project.userId, session.user.id);
  const scope = teamCtx ? or(owns, eq(project.teamId, teamCtx.teamId))! : owns;
  return { db: getDb(), where: and(eq(project.id, id), scope)! };
}

export async function GET(_req: Request, ctx: Ctx) {
  if (!isConfigured.db()) return NextResponse.json({ error: "Not configured." }, { status: 503 });
  const { id } = await ctx.params;
  const ctxv = await projectAccess(id);
  if (!ctxv) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [row] = await ctxv.db.select().from(project).where(ctxv.where).limit(1);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ project: row });
}

export async function PUT(req: Request, ctx: Ctx) {
  if (!isConfigured.db()) return NextResponse.json({ error: "Not configured." }, { status: 503 });
  const { id } = await ctx.params;
  const ctxv = await projectAccess(id);
  if (!ctxv) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as
    | { name?: string; durationSec?: number; state?: unknown; thumbnail?: string }
    | null;
  if (!body) return NextResponse.json({ error: "Invalid body." }, { status: 400 });

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof body.name === "string") patch.name = body.name.slice(0, 120);
  if (typeof body.durationSec === "number") patch.durationSec = Math.round(body.durationSec);
  if (body.state !== undefined) patch.state = body.state ? JSON.stringify(body.state) : null;
  if (
    typeof body.thumbnail === "string" &&
    body.thumbnail.startsWith("data:image") &&
    body.thumbnail.length < 200_000
  )
    patch.thumbnailUrl = body.thumbnail;

  await ctxv.db.update(project).set(patch).where(ctxv.where);

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  if (!isConfigured.db()) return NextResponse.json({ error: "Not configured." }, { status: 503 });
  const { id } = await ctx.params;
  const ctxv = await projectAccess(id);
  if (!ctxv) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await ctxv.db.delete(project).where(ctxv.where);

  return NextResponse.json({ ok: true });
}
