import { NextResponse } from "next/server";
import { getDb, waitlist } from "@/lib/db";
import { isConfigured } from "@/lib/env";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!isConfigured.db()) return NextResponse.json({ ok: true }); // soft no-op

  const rl = await rateLimit(`waitlist:${clientIp(req)}`, 8, 60 * 10);
  if (!rl.ok) return tooMany(rl.retryAfter);

  const body = (await req.json().catch(() => ({}))) as { email?: string; name?: string; source?: string };
  const email = (body.email || "").toLowerCase().trim();
  if (!email || !email.includes("@") || email.length > 200) {
    return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  }
  const name = (body.name || "").trim().slice(0, 120) || null;
  const source = (body.source || "waitlist").slice(0, 40);

  const db = getDb();
  await db
    .insert(waitlist)
    .values({ id: crypto.randomUUID(), email, name, source })
    .onConflictDoNothing({ target: waitlist.email });

  return NextResponse.json({ ok: true });
}
