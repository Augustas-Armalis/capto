import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, user as userTable, passwordReset, session as sessionTable } from "@/lib/db";
import { getAuth } from "@/lib/auth";
import { isConfigured } from "@/lib/env";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";

export const runtime = "nodejs";

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function POST(req: Request) {
  if (!isConfigured.db() || !isConfigured.auth()) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  const { email, code, password } = (await req.json().catch(() => ({}))) as {
    email?: string;
    code?: string;
    password?: string;
  };
  const addr = (email || "").toLowerCase().trim();
  const clean = (code || "").replace(/\D/g, "");
  if (!addr || clean.length !== 6) return NextResponse.json({ error: "Enter the 6-digit code." }, { status: 400 });
  if (!password || password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const byIp = await rateLimit(`resetconfirm:ip:${clientIp(req)}`, 15, 60 * 15);
  if (!byIp.ok) return tooMany(byIp.retryAfter);

  const db = getDb();
  const [u] = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(eq(userTable.email, addr))
    .limit(1);
  // Generic error so a wrong email looks the same as a wrong code.
  const bad = () => NextResponse.json({ error: "Invalid or expired code." }, { status: 400 });
  if (!u) return bad();

  const [row] = await db.select().from(passwordReset).where(eq(passwordReset.userId, u.id)).limit(1);
  if (!row || new Date(row.expiresAt).getTime() < Date.now() || row.attempts >= 6) return bad();

  if ((await sha256(clean)) !== row.codeHash) {
    await db.update(passwordReset).set({ attempts: row.attempts + 1 }).where(eq(passwordReset.userId, u.id));
    return bad();
  }

  // Set the new password the same way better-auth's own reset does.
  const auth = getAuth();
  const ctx = await auth.$context;
  const hashed = await ctx.password.hash(password);
  const accounts = await ctx.internalAdapter.findAccounts(u.id);
  const cred = accounts.find((a: { providerId: string }) => a.providerId === "credential");
  if (cred) {
    await ctx.internalAdapter.updatePassword(u.id, hashed);
  } else {
    await ctx.internalAdapter.createAccount({
      userId: u.id,
      providerId: "credential",
      accountId: u.id,
      password: hashed,
    });
  }

  await db.delete(passwordReset).where(eq(passwordReset.userId, u.id));
  // Invalidate existing sessions so a leaked session can't outlive the reset.
  await db.delete(sessionTable).where(eq(sessionTable.userId, u.id)).catch(() => {});

  return NextResponse.json({ ok: true });
}
