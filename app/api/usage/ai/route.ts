import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { isConfigured } from "@/lib/env";
import { readTranscriptionUsage } from "@/lib/usage";

export const runtime = "nodejs";

// Current month's AI transcription usage for the signed-in user (for the UI).
export async function GET() {
  if (!isConfigured.db()) {
    return NextResponse.json({ plan: "free", used: 0, limit: null, remaining: null, unlimited: true });
  }
  const session = await getCurrentSession();
  if (!session?.user?.id) {
    return NextResponse.json({ plan: "free", used: 0, limit: null, remaining: null, unlimited: true });
  }
  const usage = await readTranscriptionUsage(session.user.id);
  return NextResponse.json(
    usage ?? { plan: "free", used: 0, limit: 5, remaining: 5, unlimited: false },
  );
}
