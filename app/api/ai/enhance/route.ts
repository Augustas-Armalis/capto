import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getCurrentSession } from "@/lib/session";
import { getDb, user as userTable, userApiKey } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { env, isConfigured } from "@/lib/env";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";
import { translateLines, emojiLines } from "@/lib/ai/enhance";
import { retimeCue, type Cue } from "@/lib/cues";

export const runtime = "nodejs";
export const maxDuration = 60;

// Premium caption enhancement (translate / emoji). Runs on the house Gemini key
// for Pro & Ultra, or on the user's own Gemini key for any plan.
export async function POST(req: Request) {
  const rl = await rateLimit(`enhance:${clientIp(req)}`, 30, 60 * 10);
  if (!rl.ok) return tooMany(rl.retryAfter);

  if (!isConfigured.db()) return NextResponse.json({ error: "Not configured." }, { status: 503 });
  const session = await getCurrentSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    action?: "translate" | "emoji";
    targetLang?: string;
    cues?: Cue[];
  } | null;
  if (!body?.action || !Array.isArray(body.cues) || !body.cues.length) {
    return NextResponse.json({ error: "Nothing to enhance." }, { status: 400 });
  }
  if (body.cues.length > 400) {
    return NextResponse.json({ error: "Too many captions for one pass." }, { status: 400 });
  }

  const db = getDb();
  const [u] = await db
    .select({ plan: userTable.plan })
    .from(userTable)
    .where(eq(userTable.id, session.user.id))
    .limit(1);
  const plan = u?.plan ?? "free";

  // Resolve a Gemini key: the user's own first, else house (paid only).
  let geminiKey = "";
  const [own] = await db
    .select({ enc: userApiKey.encryptedKey })
    .from(userApiKey)
    .where(and(eq(userApiKey.userId, session.user.id), eq(userApiKey.provider, "gemini")))
    .limit(1);
  if (own) {
    try {
      geminiKey = decrypt(own.enc) || "";
    } catch {
      /* ignore */
    }
  }
  const paid = plan === "pro" || plan === "ultra";
  if (!geminiKey && paid) geminiKey = env.houseGeminiKey;

  if (!geminiKey) {
    // Distinguish "feature locked" (free, no own key → upsell) from "server not
    // configured" (paid, but no house Gemini key set → not their fault).
    if (paid) {
      return NextResponse.json(
        { error: "AI caption enhancement is temporarily unavailable." },
        { status: 503 },
      );
    }
    return NextResponse.json(
      {
        error:
          "AI caption enhancement is a Pro feature. Upgrade, or add your own Gemini key in Settings.",
        code: "upgrade",
      },
      { status: 402 },
    );
  }

  const lines = body.cues.map((c) => c.text || "");
  try {
    let next: string[];
    if (body.action === "translate") {
      next = await translateLines(geminiKey, lines, body.targetLang || "en");
    } else {
      next = await emojiLines(geminiKey, lines);
    }
    const cues = body.cues.map((c, i) => retimeCue(c, next[i] ?? c.text));
    return NextResponse.json({ cues });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Enhancement failed." },
      { status: 502 },
    );
  }
}
