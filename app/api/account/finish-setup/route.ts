import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { isConfigured } from "@/lib/env";

export const runtime = "nodejs";

/**
 * Set the initial password for a pay-first account. The account was created
 * without a credential password (see /api/checkout/complete), so better-auth's
 * session-gated setPassword links a fresh one. No password is ever transported
 * in a cookie; this relies purely on the logged-in session.
 */
export async function POST(req: Request) {
  if (!isConfigured.auth() || !isConfigured.db()) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  const { password } = (await req.json().catch(() => ({}))) as { password?: string };
  if (!password || password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const auth = getAuth();
  try {
    await auth.api.setPassword({
      body: { newPassword: password },
      headers: req.headers,
    });
  } catch {
    // Already has a password, or no valid session.
    return NextResponse.json(
      { error: "Could not set your password. Try signing in, or reset it." },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
