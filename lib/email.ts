import { env, isConfigured } from "./env";

// Resend over the REST API (fetch), so it works on Cloudflare Workers without
// the Node SDK. No-ops cleanly when RESEND_API_KEY isn't set.

type SendArgs = { to: string; subject: string; html: string };

export async function sendEmail({ to, subject, html }: SendArgs): Promise<boolean> {
  if (!isConfigured.email()) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.resendApiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ from: env.resendFrom, to, subject, html }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

const wrap = (inner: string) => `
  <div style="margin:0;padding:32px 0;background:#070709;font-family:'DM Sans',-apple-system,Segoe UI,Roboto,sans-serif;">
    <div style="max-width:460px;margin:0 auto;background:#0e0f14;border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:36px 32px;color:#e9eaf0;">
      <div style="font-size:20px;font-weight:600;letter-spacing:-0.02em;color:#fff;margin-bottom:20px;">Capto</div>
      ${inner}
      <div style="margin-top:28px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.07);font-size:12px;color:#7c7f8c;">
        Capto, the focused caption tool. Built and powered by Contles.
      </div>
    </div>
  </div>`;

export function verificationEmail(code: string): { subject: string; html: string } {
  return {
    subject: `${code} is your Capto verification code`,
    html: wrap(`
      <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#c7c9d4;">
        Enter this code to verify your email and finish setting up Capto.
      </p>
      <div style="margin:8px 0 18px;font-size:34px;font-weight:700;letter-spacing:8px;color:#fff;font-family:'DM Mono',ui-monospace,monospace;">
        ${code}
      </div>
      <p style="margin:0;font-size:13px;line-height:1.6;color:#7c7f8c;">
        This code expires in 10 minutes. If you didn't create a Capto account, you can ignore this email.
      </p>`),
  };
}
