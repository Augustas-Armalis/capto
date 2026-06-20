import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { isConfigured } from "@/lib/env";
import { readTranscriptionUsage } from "@/lib/usage";

export const runtime = "nodejs";

// Current month's AI transcription usage for the signed-in user (for the UI).
export async function GET() {
  const fallback = {
    plan: "free",
    usedMinutes: 0,
    limitMinutes: 15,
    remainingMinutes: 15,
    unlimited: false,
  };
  if (!isConfigured.db()) return NextResponse.json(fallback);
  const session = await getCurrentSession();
  if (!session?.user?.id) return NextResponse.json(fallback);
  const usage = await readTranscriptionUsage(session.user.id);
  return NextResponse.json(usage ?? fallback);
}
