import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getCurrentSession } from "@/lib/session";
import { getDb, project } from "@/lib/db";
import { isConfigured } from "@/lib/env";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

async function ownedProjectId(id: string) {
  const session = await getCurrentSession();
  if (!session?.user?.id) return null;
  return { db: getDb(), userId: session.user.id, id };
}

export async function GET(_req: Request, ctx: Ctx) {
  if (!isConfigured.db()) return NextResponse.json({ error: "Not configured." }, { status: 503 });
  const { id } = await ctx.params;
  const ctxv = await ownedProjectId(id);
  if (!ctxv) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [row] = await ctxv.db
    .select()
    .from(project)
    .where(and(eq(project.id, id), eq(project.userId, ctxv.userId)))
    .limit(1);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ project: row });
}

export async function PUT(req: Request, ctx: Ctx) {
  if (!isConfigured.db()) return NextResponse.json({ error: "Not configured." }, { status: 503 });
  const { id } = await ctx.params;
  const ctxv = await ownedProjectId(id);
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

  await ctxv.db
    .update(project)
    .set(patch)
    .where(and(eq(project.id, id), eq(project.userId, ctxv.userId)));

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  if (!isConfigured.db()) return NextResponse.json({ error: "Not configured." }, { status: 503 });
  const { id } = await ctx.params;
  const ctxv = await ownedProjectId(id);
  if (!ctxv) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await ctxv.db
    .delete(project)
    .where(and(eq(project.id, id), eq(project.userId, ctxv.userId)));

  return NextResponse.json({ ok: true });
}
