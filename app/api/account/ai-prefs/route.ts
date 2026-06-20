import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getCurrentSession } from "@/lib/session";
import { getDb, user as userTable } from "@/lib/db";
import { isConfigured } from "@/lib/env";
import { getModel } from "@/lib/ai/models";

export const runtime = "nodejs";

// Save the user's AI engine preference: "auto" (Capto picks the best engine) or
// a specific model id, plus whether to force their own BYOK key.
export async function PUT(req: Request) {
  if (!isConfigured.db()) return NextResponse.json({ error: "Not configured." }, { status: 503 });
  const session = await getCurrentSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    aiProvider?: string;
    aiUseOwnKey?: boolean;
  };
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof body.aiProvider === "string") {
    const valid = body.aiProvider === "auto" || !!getModel(body.aiProvider);
    if (!valid) return NextResponse.json({ error: "Unknown engine." }, { status: 400 });
    patch.aiProvider = body.aiProvider;
  }
  if (typeof body.aiUseOwnKey === "boolean") patch.aiUseOwnKey = body.aiUseOwnKey;

  if (Object.keys(patch).length === 1) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }
  const db = getDb();
  await db.update(userTable).set(patch).where(eq(userTable.id, session.user.id));
  return NextResponse.json({ ok: true });
}
