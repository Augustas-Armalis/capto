import { neon } from "@neondatabase/serverless";
import { env, isConfigured } from "./env";

export type RateResult = { ok: boolean; remaining: number; retryAfter: number };

/**
 * Fixed-window rate limiter backed by a single atomic SQL upsert, so it works
 * correctly across Cloudflare's distributed isolates (in-memory limiters don't).
 * Fails OPEN if the DB is unreachable, so a limiter outage never locks users out.
 */
export async function rateLimit(key: string, limit: number, windowSec: number): Promise<RateResult> {
  if (!isConfigured.db()) return { ok: true, remaining: limit, retryAfter: 0 };
  try {
    const sql = neon(env.databaseUrl);
    const interval = `${windowSec} seconds`;
    const rows = (await sql`
      INSERT INTO api_rate_limit (key, count, reset_at)
      VALUES (${key}, 1, now() + ${interval}::interval)
      ON CONFLICT (key) DO UPDATE SET
        count = CASE WHEN api_rate_limit.reset_at < now() THEN 1 ELSE api_rate_limit.count + 1 END,
        reset_at = CASE WHEN api_rate_limit.reset_at < now() THEN now() + ${interval}::interval ELSE api_rate_limit.reset_at END
      RETURNING count, GREATEST(0, EXTRACT(epoch FROM (reset_at - now()))::int) AS retry_after
    `) as { count: number; retry_after: number }[];
    const count = rows[0]?.count ?? 1;
    const retryAfter = rows[0]?.retry_after ?? windowSec;
    return { ok: count <= limit, remaining: Math.max(0, limit - count), retryAfter: count <= limit ? 0 : retryAfter };
  } catch {
    return { ok: true, remaining: limit, retryAfter: 0 };
  }
}

/** Best-effort client IP on Cloudflare. */
export function clientIp(req: Request): string {
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

export function tooMany(retryAfter: number) {
  return new Response(JSON.stringify({ error: "Too many requests. Slow down." }), {
    status: 429,
    headers: { "content-type": "application/json", "retry-after": String(retryAfter || 60) },
  });
}
