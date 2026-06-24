import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { neon } from "@neondatabase/serverless";
import { getCurrentSession } from "@/lib/session";
import { getDb, user } from "@/lib/db";
import { env, isConfigured } from "@/lib/env";

export const runtime = "nodejs";

const FREE_MONTHLY_EXPORTS = 3;
const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

type Usage = {
  plan: "free" | "pro" | "ultra";
  used: number;
  limit: number | null; // null = unlimited
  watermark: boolean;
  remaining: number | null;
};

// Read-only view of the user's usage (no mutation — safe to call from renders).
async function readUsage(): Promise<{ usage: Usage; userId: string } | null> {
  if (!isConfigured.db()) return null;
  const session = await getCurrentSession();
  if (!session?.user?.id) return null;
  const db = getDb();
  const [row] = await db
    .select({ plan: user.plan, used: user.monthlyExportsUsed, resetAt: user.monthlyResetAt })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);
  if (!row) return null;

  // Effective used: 0 if the monthly window has lapsed (the actual reset happens
  // atomically on the next consume, not here).
  const lapsed = row.resetAt && Date.now() - new Date(row.resetAt).getTime() > MONTH_MS;
  const used = lapsed ? 0 : row.used;
  const isFree = row.plan === "free";
  const limit = isFree ? FREE_MONTHLY_EXPORTS : null;
  return {
    userId: session.user.id,
    usage: {
      plan: row.plan === "friend" ? "ultra" : row.plan, // friend = ultra-level limits
      used,
      limit,
      watermark: isFree,
      remaining: limit === null ? null : Math.max(0, limit - used),
    },
  };
}

export async function GET() {
  const r = await readUsage();
  if (!r)
    return NextResponse.json({
      plan: "free",
      used: 0,
      limit: null,
      watermark: true,
      remaining: null,
    } satisfies Usage);
  return NextResponse.json(r.usage);
}

// Consume one export. Single atomic statement handles month-rollover, the free
// cap, and the increment, so concurrent requests can't exceed the cap.
// Body { refund: true } gives back a reserved export when a render fails/cancels.
export async function POST(req: Request) {
  const session = await getCurrentSession();
  if (!isConfigured.db() || !session?.user?.id) {
    return NextResponse.json({ allowed: true, watermark: true });
  }

  const sql = neon(env.databaseUrl);

  const body = (await req.json().catch(() => null)) as { refund?: boolean } | null;
  if (body?.refund) {
    // Give back one export (floor 0). A failed/cancelled render must not burn quota.
    await sql`
      UPDATE "user" SET monthly_exports_used = GREATEST(0, monthly_exports_used - 1)
      WHERE id = ${session.user.id}
    `;
    return NextResponse.json({ refunded: true });
  }

  const months = `${MONTH_MS} milliseconds`;
  const cap = FREE_MONTHLY_EXPORTS;
  const rows = (await sql`
    UPDATE "user" u SET
      monthly_exports_used = (CASE WHEN now() - u.monthly_reset_at > ${months}::interval THEN 0 ELSE u.monthly_exports_used END) + 1,
      monthly_reset_at = CASE WHEN now() - u.monthly_reset_at > ${months}::interval THEN now() ELSE u.monthly_reset_at END
    WHERE u.id = ${session.user.id}
      AND (u.plan <> 'free' OR (CASE WHEN now() - u.monthly_reset_at > ${months}::interval THEN 0 ELSE u.monthly_exports_used END) < ${cap})
    RETURNING u.monthly_exports_used AS used, u.plan AS plan
  `) as { used: number; plan: "free" | "pro" | "ultra" }[];

  if (!rows.length) {
    return NextResponse.json(
      { allowed: false, watermark: true, used: cap, limit: cap },
      { status: 402 },
    );
  }
  const { used, plan } = rows[0];
  return NextResponse.json({
    allowed: true,
    watermark: plan === "free",
    used,
    limit: plan === "free" ? cap : null,
  });
}
