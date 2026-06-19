import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, user as userTable, passwordReset } from "@/lib/db";
import { isConfigured } from "@/lib/env";
import { sendEmail, resetEmail } from "@/lib/email";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";

export const runtime = "nodejs";

function genCode(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1000000;
  return n.toString().padStart(6, "0");
}
async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function POST(req: Request) {
  if (!isConfigured.db() || !isConfigured.auth()) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }
  if (!isConfigured.email()) {
    return NextResponse.json({ error: "Password reset is temporarily unavailable." }, { status: 503 });
  }

  const { email } = (await req.json().catch(() => ({}))) as { email?: string };
  const addr = (email || "").toLowerCase().trim();
  if (!addr || !addr.includes("@")) {
    return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  }

  // Throttle by IP and by target email (don't reveal which).
  const byIp = await rateLimit(`resetsend:ip:${clientIp(req)}`, 6, 60 * 15);
  if (!byIp.ok) return tooMany(byIp.retryAfter);
  const byEmail = await rateLimit(`resetsend:em:${addr}`, 3, 60 * 15);
  if (!byEmail.ok) return tooMany(byEmail.retryAfter);

  const db = getDb();
  const [u] = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(eq(userTable.email, addr))
    .limit(1);

  // Only actually send when the account exists; always return ok so the
  // endpoint never reveals whether an email is registered.
  if (u) {
    const code = genCode();
    const codeHash = await sha256(code);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await db
      .insert(passwordReset)
      .values({ userId: u.id, codeHash, expiresAt, attempts: 0 })
      .onConflictDoUpdate({
        target: passwordReset.userId,
        set: { codeHash, expiresAt, attempts: 0, createdAt: new Date() },
      });
    const { subject, html } = resetEmail(code);
    await sendEmail({ to: addr, subject, html });
  }

  return NextResponse.json({ ok: true });
}
