import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getCurrentSession } from "@/lib/session";
import { getDb, user as userTable } from "@/lib/db";
import { isConfigured } from "@/lib/env";

export const runtime = "nodejs";

export async function PUT(req: Request) {
  if (!isConfigured.db()) return NextResponse.json({ error: "Not configured." }, { status: 503 });
  const session = await getCurrentSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { name } = (await req.json().catch(() => ({}))) as { name?: string };
  const clean = (name || "").trim();
  if (clean.length < 1 || clean.length > 120) {
    return NextResponse.json({ error: "Name must be 1–120 characters." }, { status: 400 });
  }

  const db = getDb();
  await db.update(userTable).set({ name: clean, updatedAt: new Date() }).where(eq(userTable.id, session.user.id));
  return NextResponse.json({ ok: true, name: clean });
}
