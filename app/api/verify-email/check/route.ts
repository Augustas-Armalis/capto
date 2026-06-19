import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getCurrentSession } from "@/lib/session";
import { getDb, user as userTable, emailCode } from "@/lib/db";
import { isConfigured } from "@/lib/env";
import { rateLimit, tooMany } from "@/lib/rate-limit";

export const runtime = "nodejs";

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function POST(req: Request) {
  if (!isConfigured.db() || !isConfigured.auth()) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }
  const session = await getCurrentSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { code } = (await req.json().catch(() => ({}))) as { code?: string };
  const clean = (code || "").replace(/\D/g, "");
  if (clean.length !== 6) return NextResponse.json({ error: "Enter the 6-digit code." }, { status: 400 });

  // Cap verification attempts per user to stop code guessing.
  const guard = await rateLimit(`verifycheck:${session.user.id}`, 10, 60 * 10);
  if (!guard.ok) return tooMany(guard.retryAfter);

  const db = getDb();
  const [u] = await db
    .select({ verified: userTable.emailVerified })
    .from(userTable)
    .where(eq(userTable.id, session.user.id))
    .limit(1);
  if (u?.verified) return NextResponse.json({ verified: true });

  const [row] = await db.select().from(emailCode).where(eq(emailCode.userId, session.user.id)).limit(1);
  if (!row) return NextResponse.json({ error: "No code found. Send a new one." }, { status: 400 });
  if (new Date(row.expiresAt).getTime() < Date.now()) {
    return NextResponse.json({ error: "That code expired. Send a new one." }, { status: 400 });
  }
  if (row.attempts >= 6) {
    return NextResponse.json({ error: "Too many tries. Send a new code." }, { status: 429 });
  }

  if ((await sha256(clean)) !== row.codeHash) {
    await db
      .update(emailCode)
      .set({ attempts: row.attempts + 1 })
      .where(eq(emailCode.userId, session.user.id));
    return NextResponse.json({ error: "Wrong code. Try again." }, { status: 400 });
  }

  await db.update(userTable).set({ emailVerified: true }).where(eq(userTable.id, session.user.id));
  await db.delete(emailCode).where(eq(emailCode.userId, session.user.id));
  return NextResponse.json({ verified: true });
}
