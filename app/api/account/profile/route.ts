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

  const body = (await req.json().catch(() => ({}))) as { name?: string; image?: string | null };
  const patch: Record<string, unknown> = { updatedAt: new Date() };

  if (body.name !== undefined) {
    const clean = (body.name || "").trim();
    if (clean.length < 1 || clean.length > 120) {
      return NextResponse.json({ error: "Name must be 1–120 characters." }, { status: 400 });
    }
    patch.name = clean;
  }

  // Avatar: a small client-resized data-URL (≤ ~190KB), or null to clear it.
  // Stored inline in the user row — same approach as project thumbnails, no
  // extra blob storage needed.
  if (body.image !== undefined) {
    if (body.image === null || body.image === "") {
      patch.image = null;
    } else if (
      typeof body.image === "string" &&
      body.image.startsWith("data:image/") &&
      body.image.length < 200_000
    ) {
      patch.image = body.image;
    } else {
      return NextResponse.json({ error: "Image must be a small (<190KB) data URL." }, { status: 400 });
    }
  }

  if (Object.keys(patch).length === 1) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const db = getDb();
  await db.update(userTable).set(patch).where(eq(userTable.id, session.user.id));
  return NextResponse.json({ ok: true, name: patch.name, image: patch.image ?? null });
}
