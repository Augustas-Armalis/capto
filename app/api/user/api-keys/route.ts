import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { getCurrentSession } from "@/lib/session";
import { getDb, userApiKey } from "@/lib/db";
import { encrypt } from "@/lib/crypto";
import { isConfigured } from "@/lib/env";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ error: "Not signed in." }, { status: 401 });
}

function notConfigured() {
  return NextResponse.json(
    { error: "Server not configured (DATABASE_URL + ENCRYPTION_KEY required)." },
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
      provider: userApiKey.provider,
      label: userApiKey.label,
      lastUsedAt: userApiKey.lastUsedAt,
    })
    .from(userApiKey)
    .where(eq(userApiKey.userId, session.user.id));

  return NextResponse.json({ keys: rows });
}

const PostSchema = z.object({
  provider: z.enum(["groq", "openai", "deepgram", "gemini"]),
  key: z.string().min(10).max(512),
  label: z.string().max(80).optional(),
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
  const { provider, key, label } = parsed.data;

  if (provider === "groq" && !key.startsWith("gsk_")) {
    return NextResponse.json({ error: "Groq keys start with gsk_." }, { status: 400 });
  }
  if (provider === "openai" && !key.startsWith("sk-")) {
    return NextResponse.json({ error: "OpenAI keys start with sk-." }, { status: 400 });
  }
  // Deepgram and Gemini keys have no stable public prefix — accept as-is.

  const encrypted = encrypt(key);
  const db = getDb();
  const id = crypto.randomUUID();
  await db
    .insert(userApiKey)
    .values({
      id,
      userId: session.user.id,
      provider,
      encryptedKey: encrypted,
      label: label || null,
    })
    .onConflictDoUpdate({
      target: [userApiKey.userId, userApiKey.provider],
      set: { encryptedKey: encrypted, label: label || null },
    });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!isConfigured.db()) return notConfigured();
  const session = await getCurrentSession();
  if (!session?.user?.id) return unauthorized();

  const url = new URL(req.url);
  const provider = url.searchParams.get("provider");
  if (!provider || !["groq", "openai", "deepgram", "gemini"].includes(provider)) {
    return NextResponse.json({ error: "unknown provider" }, { status: 400 });
  }

  const db = getDb();
  await db
    .delete(userApiKey)
    .where(
      and(
        eq(userApiKey.userId, session.user.id),
        eq(userApiKey.provider, provider as "groq" | "openai" | "deepgram" | "gemini"),
      ),
    );

  return NextResponse.json({ ok: true });
}
