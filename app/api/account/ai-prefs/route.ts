import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getCurrentSession } from "@/lib/session";
import { getDb, user as userTable } from "@/lib/db";
import { isConfigured } from "@/lib/env";
import { getModel, PLAN_RANK } from "@/lib/ai/models";

export const runtime = "nodejs";

// Save the user's AI engine preference: "auto" (Capto picks the best engine) or
// a specific model id, plus whether to force their own BYOK key.
export async function PUT(req: Request) {
  if (!isConfigured.db()) return NextResponse.json({ error: "Not configured." }, { status: 503 });
  const session = await getCurrentSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    aiProvider?: string;
    aiUseOwnKey?: boolean;
  };

  const db = getDb();
  const [u] = await db
    .select({ plan: userTable.plan, aiUseOwnKey: userTable.aiUseOwnKey })
    .from(userTable)
    .where(eq(userTable.id, session.user.id))
    .limit(1);
  const plan = u?.plan ?? "free";
  const effectiveOwnKey = typeof body.aiUseOwnKey === "boolean" ? body.aiUseOwnKey : (u?.aiUseOwnKey ?? false);

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof body.aiProvider === "string") {
    if (body.aiProvider !== "auto") {
      const model = getModel(body.aiProvider);
      if (!model) return NextResponse.json({ error: "Unknown engine." }, { status: 400 });
      // A managed (non-BYOK) gated model can't be set below its plan tier.
      if (!effectiveOwnKey && PLAN_RANK[model.minPlan] > PLAN_RANK[plan]) {
        return NextResponse.json(
          { error: `${model.label} needs ${model.minPlan === "pro" ? "Pro" : "Ultra"} (or use your own key).` },
          { status: 400 },
        );
      }
    }
    patch.aiProvider = body.aiProvider;
  }
  if (typeof body.aiUseOwnKey === "boolean") patch.aiUseOwnKey = body.aiUseOwnKey;

  if (Object.keys(patch).length === 1) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }
  await db.update(userTable).set(patch).where(eq(userTable.id, session.user.id));
  return NextResponse.json({ ok: true });
}
