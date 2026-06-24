import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { getCurrentSession } from "@/lib/session";
import { getDb, userApiKey, user } from "@/lib/db";
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
  validate: z.boolean().optional(),
});

// Lightweight "is this key real?" check — a cheap authenticated GET that returns
// 200 on a good key and 401/403 on a bad one. Network failures pass (fail-open)
// so a flaky provider never blocks onboarding. Returns null when valid, or a
// human error string when the provider actively rejected the key.
async function verifyKey(provider: string, key: string): Promise<string | null> {
  try {
    if (provider === "groq" || provider === "openai") {
      const base = provider === "groq" ? "https://api.groq.com/openai/v1" : "https://api.openai.com/v1";
      const res = await fetch(`${base}/models`, { headers: { Authorization: `Bearer ${key}` } });
      if (res.status === 401 || res.status === 403) {
        return `That ${provider === "groq" ? "Groq" : "OpenAI"} key was rejected. Double-check you copied the whole key.`;
      }
      return null;
    }
    if (provider === "deepgram") {
      const res = await fetch("https://api.deepgram.com/v1/projects", { headers: { Authorization: `Token ${key}` } });
      if (res.status === 401 || res.status === 403) return "That Deepgram key was rejected. Double-check it and try again.";
      return null;
    }
    if (provider === "gemini") {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`);
      if (res.status === 400 || res.status === 401 || res.status === 403) return "That Gemini key was rejected. Double-check it and try again.";
      return null;
    }
  } catch {
    /* network hiccup — don't block on it */
  }
  return null;
}

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

  // Free users may only bring a Groq key (everything else needs a paid plan).
  // The Settings UI hides these too, but enforce it here so the API can't be
  // driven directly to stash an unusable key.
  if (provider !== "groq") {
    const db0 = getDb();
    const prow = await db0
      .select({ plan: user.plan })
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1);
    if ((prow[0]?.plan ?? "free") === "free") {
      return NextResponse.json(
        { error: "Other providers require a paid plan. Upgrade to add this key." },
        { status: 403 },
      );
    }
  }

  if (provider === "groq" && !key.startsWith("gsk_")) {
    return NextResponse.json({ error: "Groq keys start with gsk_." }, { status: 400 });
  }
  if (provider === "openai" && !key.startsWith("sk-")) {
    return NextResponse.json({ error: "OpenAI keys start with sk-." }, { status: 400 });
  }
  // Deepgram and Gemini keys have no stable public prefix — accept as-is.

  // Opt-in live validation (onboarding sends this) — catch a typo'd/revoked key
  // up front instead of letting the first transcription fail mysteriously.
  if (parsed.data.validate) {
    const verifyErr = await verifyKey(provider, key);
    if (verifyErr) return NextResponse.json({ error: verifyErr, code: "key_invalid" }, { status: 400 });
  }

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
