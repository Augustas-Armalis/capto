import { NextResponse } from "next/server";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { getCurrentSession } from "@/lib/session";
import { getDb, userCaptionPreset } from "@/lib/db";
import { isConfigured } from "@/lib/env";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ error: "Not signed in." }, { status: 401 });
}

function notConfigured() {
  return NextResponse.json(
    { error: "Server not configured (DATABASE_URL required)." },
    { status: 503 },
  );
}

export async function GET() {
  if (!isConfigured.db()) return notConfigured();
  const session = await getCurrentSession();
  if (!session?.user?.id) return unauthorized();

  const db = getDb();
  const rows = await db
    .select({
      id: userCaptionPreset.id,
      name: userCaptionPreset.name,
      config: userCaptionPreset.config,
      isDefault: userCaptionPreset.isDefault,
      createdAt: userCaptionPreset.createdAt,
    })
    .from(userCaptionPreset)
    .where(eq(userCaptionPreset.userId, session.user.id))
    .orderBy(desc(userCaptionPreset.createdAt));

  return NextResponse.json({ presets: rows });
}

const PostSchema = z.object({
  name: z.string().min(1).max(80),
  config: z.record(z.any()),
  isDefault: z.boolean().optional(),
});

export async function POST(req: Request) {
  if (!isConfigured.db()) return notConfigured();
  const session = await getCurrentSession();
  if (!session?.user?.id) return unauthorized();

  const body = await req.json().catch(() => null);
  const parsed = PostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }
  const { name, config, isDefault } = parsed.data;

  const db = getDb();
  // Only one default per user: clear the flag on all existing presets first.
  if (isDefault) {
    await db
      .update(userCaptionPreset)
      .set({ isDefault: false })
      .where(eq(userCaptionPreset.userId, session.user.id));
  }

  const id = crypto.randomUUID();
  await db.insert(userCaptionPreset).values({
    id,
    userId: session.user.id,
    name,
    config,
    isDefault: isDefault ?? false,
  });

  return NextResponse.json({ ok: true, id });
}

export async function DELETE(req: Request) {
  if (!isConfigured.db()) return notConfigured();
  const session = await getCurrentSession();
  if (!session?.user?.id) return unauthorized();

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "missing id" }, { status: 400 });
  }

  const db = getDb();
  await db
    .delete(userCaptionPreset)
    .where(
      and(
        eq(userCaptionPreset.userId, session.user.id),
        eq(userCaptionPreset.id, id),
      ),
    );

  return NextResponse.json({ ok: true });
}
