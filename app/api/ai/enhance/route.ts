import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getCurrentSession } from "@/lib/session";
import { getDb, user as userTable, userApiKey } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { env, isConfigured } from "@/lib/env";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";
import { translateLines, emojiLines, cleanupLines, type EnhanceEngine } from "@/lib/ai/enhance";
import { retimeCue, type Cue } from "@/lib/cues";

export const runtime = "nodejs";
export const maxDuration = 60;

// Caption enhancement (cleanup / translate / emoji). Claude (house Anthropic key)
// is the brain for EVERYONE; if it isn't configured we fall back to the user's own
// Gemini key, then to the house Gemini key (paid only).
export async function POST(req: Request) {
  const rl = await rateLimit(`enhance:${clientIp(req)}`, 30, 60 * 10);
  if (!rl.ok) return tooMany(rl.retryAfter);

  if (!isConfigured.db()) return NextResponse.json({ error: "Not configured." }, { status: 503 });
  const session = await getCurrentSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    action?: "translate" | "emoji" | "cleanup";
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
  const paid = plan === "pro" || plan === "ultra";

  // Key resolution priority:
  //   1) house Anthropic (Claude) — available to ALL signed-in users
  //   2) the user's own Gemini key
  //   3) house Gemini key — paid only
  let engine: EnhanceEngine | null = null;
  if (env.houseAnthropicKey.length > 10) {
    engine = { anthropicKey: env.houseAnthropicKey };
  } else {
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
    if (!geminiKey && paid) geminiKey = env.houseGeminiKey;
    if (geminiKey) engine = { geminiKey };
  }

  if (!engine) {
    // Distinguish "feature locked" (free, no own key → upsell) from "server not
    // configured" (paid, but no house key set → not their fault).
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
      next = await translateLines(engine, lines, body.targetLang || "en");
    } else if (body.action === "cleanup") {
      next = await cleanupLines(engine, lines);
    } else {
      next = await emojiLines(engine, lines);
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
