import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getCurrentSession } from "@/lib/session";
import { getDb, feedback as feedbackTable } from "@/lib/db";
import { isConfigured } from "@/lib/env";
import { isAdmin } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function guard() {
  if (!isConfigured.db()) {
    return { ok: false as const, res: NextResponse.json({ error: "Not configured." }, { status: 503 }) };
  }
  const session = await getCurrentSession();
  if (!session?.user?.id || !isAdmin(session.user.email)) {
    return { ok: false as const, res: NextResponse.json({ error: "Forbidden." }, { status: 403 }) };
  }
  return { ok: true as const, session };
}

const PatchSchema = z.object({ id: z.string().min(1), resolved: z.boolean() });

// PATCH /api/admin/feedback — toggle a report's resolved flag.
export async function PATCH(req: Request) {
  const g = await guard();
  if (!g.ok) return g.res;

  const body = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input." }, { status: 400 });

  await getDb().update(feedbackTable).set({ resolved: parsed.data.resolved }).where(eq(feedbackTable.id, parsed.data.id));
  return NextResponse.json({ ok: true });
}

const DeleteSchema = z.object({ id: z.string().min(1) });

// DELETE /api/admin/feedback — remove a report.
export async function DELETE(req: Request) {
  const g = await guard();
  if (!g.ok) return g.res;

  const body = await req.json().catch(() => null);
  const parsed = DeleteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input." }, { status: 400 });

  await getDb().delete(feedbackTable).where(eq(feedbackTable.id, parsed.data.id));
  return NextResponse.json({ ok: true });
}
