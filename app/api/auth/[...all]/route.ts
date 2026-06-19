import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/auth";
import { isConfigured } from "@/lib/env";

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

export const { GET, POST } = handlers();
