import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/auth";
import { isConfigured } from "@/lib/env";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";

export const runtime = "nodejs";

function handlers() {
  if (!isConfigured.db() || !isConfigured.auth()) {
    const stub = () =>
      new Response(
        JSON.stringify({
          error: "Auth not configured. Set DATABASE_URL and BETTER_AUTH_SECRET in .env.",
        }),
        { status: 503, headers: { "content-type": "application/json" } },
      );
    return { GET: stub, POST: stub };
  }
  return toNextJsHandler(getAuth());
}

const h = handlers();

export const GET = h.GET;

// Rate-limit auth POSTs by IP, tighter on the brute-forceable endpoints.
export async function POST(req: Request) {
  const ip = clientIp(req);
  const path = new URL(req.url).pathname;
  const sensitive = /sign-in|sign-up|reset-password|change-password|forget-password/.test(path);
  const rl = await rateLimit(`auth:${sensitive ? "s" : "g"}:${ip}`, sensitive ? 12 : 40, 60);
  if (!rl.ok) return tooMany(rl.retryAfter);
  return h.POST(req);
}
