import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAuth } from "@/lib/auth";
import { decrypt } from "@/lib/crypto";
import { isConfigured } from "@/lib/env";

export const runtime = "nodejs";

const SETUP_COOKIE = "capto_setup";

/**
 * Set the real password for an account that was created during a pay-first
 * checkout. The account currently has a temporary password (encrypted into a
 * short-lived cookie); we swap it for the user's chosen one via better-auth's
 * changePassword, which keeps the session valid.
 */
export async function POST(req: Request) {
  if (!isConfigured.auth() || !isConfigured.db()) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  const { password } = (await req.json().catch(() => ({}))) as { password?: string };
  if (!password || password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const jar = await cookies();
  const enc = jar.get(SETUP_COOKIE)?.value;
  if (!enc) {
    return NextResponse.json({ error: "Setup link expired. Set your password from Settings." }, { status: 400 });
  }

  let tempPwd: string;
  try {
    tempPwd = decrypt(enc);
  } catch {
    return NextResponse.json({ error: "Setup token invalid." }, { status: 400 });
  }

  const auth = getAuth();
  try {
    await auth.api.changePassword({
      body: { currentPassword: tempPwd, newPassword: password, revokeOtherSessions: false },
      headers: req.headers,
    });
  } catch {
    return NextResponse.json({ error: "Could not set your password. Please sign in." }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SETUP_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
