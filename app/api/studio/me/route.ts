import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { readTranscriptionUsage } from "@/lib/usage";
import { isConfigured } from "@/lib/env";
import { isAdmin } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Lightweight "who am I + how much is left" for the studio editor (iframe).
// The bridge calls this to show the minutes indicator, the free-tier watermark,
// and the profile chip — same cookies, same origin.
export async function GET() {
  const anon = { signedIn: false, plan: "free", watermark: true, minutes: null as unknown };
  if (!isConfigured.db()) return NextResponse.json(anon);

  const session = await getCurrentSession();
  if (!session?.user?.id) return NextResponse.json(anon);

  // Admins get everything unlocked — Ultra, no watermark, unlimited.
  if (isAdmin(session.user.email)) {
    return NextResponse.json({
      signedIn: true,
      name: session.user.name ?? null,
      email: session.user.email ?? null,
      plan: "ultra",
      watermark: false,
      minutes: { used: 0, limit: null, remaining: null, unlimited: true },
    });
  }

  const usage = await readTranscriptionUsage(session.user.id).catch(() => null);
  const plan = usage?.plan ?? "free";
  return NextResponse.json({
    signedIn: true,
    name: session.user.name ?? null,
    email: session.user.email ?? null,
    plan,
    watermark: plan === "free",
    minutes: usage
      ? {
          used: usage.usedMinutes,
          limit: usage.limitMinutes,
          remaining: usage.remainingMinutes,
          unlimited: usage.unlimited,
        }
      : null,
  });
}
