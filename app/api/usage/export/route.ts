import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getCurrentSession } from "@/lib/session";
import { getDb, user } from "@/lib/db";
import { isConfigured } from "@/lib/env";

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

async function loadUsage(): Promise<{ usage: Usage; userId: string } | null> {
  if (!isConfigured.db()) return null;
  const session = await getCurrentSession();
  if (!session?.user?.id) return null;
  const db = getDb();
  const [row] = await db
    .select({
      plan: user.plan,
      used: user.monthlyExportsUsed,
      resetAt: user.monthlyResetAt,
    })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);
  if (!row) return null;

  // Roll the monthly window if it has lapsed.
  let used = row.used;
  const now = Date.now();
  if (row.resetAt && now - new Date(row.resetAt).getTime() > MONTH_MS) {
    used = 0;
    await db
      .update(user)
      .set({ monthlyExportsUsed: 0, monthlyResetAt: new Date() })
      .where(eq(user.id, session.user.id));
  }

  const isFree = row.plan === "free";
  const limit = isFree ? FREE_MONTHLY_EXPORTS : null;
  return {
    userId: session.user.id,
    usage: {
      plan: row.plan,
      used,
      limit,
      watermark: isFree,
      remaining: limit === null ? null : Math.max(0, limit - used),
    },
  };
}

export async function GET() {
  const r = await loadUsage();
  // No DB / not signed in -> treat as free with watermark, no hard cap (the
  // editor still works locally; counting only matters when accounts exist).
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

// Consume one export. Returns allowed:false when a free user is out of exports.
export async function POST() {
  const r = await loadUsage();
  if (!r) return NextResponse.json({ allowed: true, watermark: true });

  if (r.usage.limit !== null && r.usage.used >= r.usage.limit) {
    return NextResponse.json(
      { allowed: false, watermark: true, used: r.usage.used, limit: r.usage.limit },
      { status: 402 },
    );
  }

  const db = getDb();
  await db
    .update(user)
    .set({ monthlyExportsUsed: r.usage.used + 1 })
    .where(eq(user.id, r.userId));

  return NextResponse.json({
    allowed: true,
    watermark: r.usage.watermark,
    used: r.usage.used + 1,
    limit: r.usage.limit,
  });
}
