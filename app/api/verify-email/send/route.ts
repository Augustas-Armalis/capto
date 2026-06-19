import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getCurrentSession } from "@/lib/session";
import { getDb, user as userTable, emailCode } from "@/lib/db";
import { isConfigured } from "@/lib/env";
import { sendEmail, verificationEmail } from "@/lib/email";
import { rateLimit, tooMany } from "@/lib/rate-limit";

export const runtime = "nodejs";

function genCode(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1000000;
  return n.toString().padStart(6, "0");
}
async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function POST() {
  if (!isConfigured.db() || !isConfigured.auth()) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }
  const session = await getCurrentSession();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  // No email provider wired -> tell the client to skip verification.
  if (!isConfigured.email()) return NextResponse.json({ skipped: true });

  const db = getDb();
  const [u] = await db
    .select({ verified: userTable.emailVerified })
    .from(userTable)
    .where(eq(userTable.id, session.user.id))
    .limit(1);
  if (u?.verified) return NextResponse.json({ verified: true });

  // 30s resend cooldown + a generous daily ceiling.
  const cool = await rateLimit(`verifysend:${session.user.id}`, 1, 30);
  if (!cool.ok) return tooMany(cool.retryAfter);
  const daily = await rateLimit(`verifysendday:${session.user.id}`, 12, 60 * 60 * 24);
  if (!daily.ok) return tooMany(daily.retryAfter);

  const code = genCode();
  const codeHash = await sha256(code);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await db
    .insert(emailCode)
    .values({ userId: session.user.id, codeHash, expiresAt, attempts: 0 })
    .onConflictDoUpdate({
      target: emailCode.userId,
      set: { codeHash, expiresAt, attempts: 0, createdAt: new Date() },
    });

  const { subject, html } = verificationEmail(code);
  const ok = await sendEmail({ to: session.user.email, subject, html });
  if (!ok) return NextResponse.json({ error: "Could not send the email. Try again." }, { status: 502 });

  return NextResponse.json({ sent: true });
}
