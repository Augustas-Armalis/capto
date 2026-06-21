import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession } from "@/lib/session";
import { sendEmail } from "@/lib/email";
import { isConfigured } from "@/lib/env";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";
import { getDb, feedback as feedbackTable } from "@/lib/db";
import { ADMIN_EMAILS } from "@/lib/admin";

export const runtime = "nodejs";

const FOUNDER_EMAIL = ADMIN_EMAILS[0] || "augustas.armalis@aiacquisition.com";

const Body = z.object({
  kind: z.enum(["bug", "idea"]),
  message: z.string().trim().min(5).max(4000),
  email: z.string().trim().email().max(200).optional(),
  page: z.string().trim().max(500).optional(),
});

// Minimal HTML escaping so user-supplied text can't inject markup into the email.
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(req: Request) {
  // Light abuse guard. Failing open is fine — feedback is low-risk.
  const rl = await rateLimit(`feedback:${clientIp(req)}`, 12, 60 * 10);
  if (!rl.ok) return tooMany(rl.retryAfter);

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please write a bit more (5–4000 chars)." }, { status: 400 });
  }
  const { kind, message, email, page } = parsed.data;

  // Best-effort: attach the signed-in account, but the route works signed-out too.
  let accountEmail: string | undefined;
  let accountId: string | undefined;
  try {
    const session = await getCurrentSession();
    accountEmail = session?.user?.email || undefined;
    accountId = session?.user?.id || undefined;
  } catch {
    // ignore — anonymous submit
  }

  const reporter = accountEmail || email || "anonymous";
  const label = kind === "bug" ? "bug" : "idea";
  const subject = `[Capto feedback · ${label}] ${message.slice(0, 60).replace(/\s+/g, " ").trim()}`;
  const timestamp = new Date().toISOString();

  const html = `
    <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;font-size:14px;line-height:1.6;color:#1a1a1a;">
      <p style="margin:0 0 16px;"><strong>New Capto ${esc(label)}</strong></p>
      <table style="border-collapse:collapse;font-size:13px;">
        <tr><td style="padding:2px 12px 2px 0;color:#666;">Type</td><td>${esc(label)}</td></tr>
        <tr><td style="padding:2px 12px 2px 0;color:#666;">Reporter</td><td>${esc(reporter)}</td></tr>
        ${accountId ? `<tr><td style="padding:2px 12px 2px 0;color:#666;">Account id</td><td>${esc(accountId)}</td></tr>` : ""}
        ${email && email !== accountEmail ? `<tr><td style="padding:2px 12px 2px 0;color:#666;">Reply email</td><td>${esc(email)}</td></tr>` : ""}
        <tr><td style="padding:2px 12px 2px 0;color:#666;">Page</td><td>${esc(page || "—")}</td></tr>
        <tr><td style="padding:2px 12px 2px 0;color:#666;">Time</td><td>${esc(timestamp)}</td></tr>
      </table>
      <div style="margin-top:18px;padding:14px 16px;background:#f5f5f7;border-radius:10px;white-space:pre-wrap;">${esc(message)}</div>
    </div>`;

  // Persist so the founder can browse reports in the admin panel. Best-effort:
  // tolerate the table not being migrated yet so the email path still works.
  if (isConfigured.db()) {
    try {
      await getDb().insert(feedbackTable).values({
        id: crypto.randomUUID(),
        userId: accountId ?? null,
        email: accountEmail ?? email ?? null,
        kind,
        message,
        page: page ?? null,
      });
    } catch {
      /* feedback table not migrated yet — skip the DB write */
    }
  }

  if (isConfigured.email()) {
    // sendEmail no-ops/returns false on failure; never throw to the user.
    await sendEmail({ to: FOUNDER_EMAIL, subject, html }).catch(() => false);
  } else {
    // Email not wired up locally — log so it's not silently lost in dev.
    console.log("[feedback]", { kind, reporter, page, message });
  }

  // Always succeed on a valid submit so the UI can show its thank-you state.
  return NextResponse.json({ ok: true });
}
