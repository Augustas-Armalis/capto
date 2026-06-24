import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, desc, ilike, or } from "drizzle-orm";
import { getCurrentSession } from "@/lib/session";
import { getDb, user as userTable } from "@/lib/db";
import { isConfigured } from "@/lib/env";
import { isAdmin } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function guard() {
  if (!isConfigured.db()) {
    return { ok: false as const, res: NextResponse.json({ error: "Not configured." }, { status: 503 }) };
  }
  const session = await getCurrentSession();
  if (!session?.user?.id || !isAdmin(session.user.email)) {
    return { ok: false as const, res: NextResponse.json({ error: "Forbidden." }, { status: 403 }) };
  }
  return { ok: true as const, session };
}

// GET /api/admin/users?q=search — list users (admin only).
export async function GET(req: Request) {
  const g = await guard();
  if (!g.ok) return g.res;

  const q = new URL(req.url).searchParams.get("q")?.trim();
  const db = getDb();
  const base = db
    .select({
      id: userTable.id,
      name: userTable.name,
      email: userTable.email,
      plan: userTable.plan,
      createdAt: userTable.createdAt,
      emailVerified: userTable.emailVerified,
      subscriptionStatus: userTable.subscriptionStatus,
    })
    .from(userTable);

  const rows = q
    ? await base.where(or(ilike(userTable.email, `%${q}%`), ilike(userTable.name, `%${q}%`))).orderBy(desc(userTable.createdAt)).limit(500)
    : await base.orderBy(desc(userTable.createdAt)).limit(500);

  return NextResponse.json({ users: rows });
}

const PatchSchema = z.object({
  id: z.string().min(1),
  plan: z.enum(["free", "pro", "ultra", "friend"]),
});

// PATCH /api/admin/users — change a user's plan.
export async function PATCH(req: Request) {
  const g = await guard();
  if (!g.ok) return g.res;

  const body = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input." }, { status: 400 });

  const db = getDb();
  await db.update(userTable).set({ plan: parsed.data.plan }).where(eq(userTable.id, parsed.data.id));
  return NextResponse.json({ ok: true });
}

const DeleteSchema = z.object({ id: z.string().min(1) });

// DELETE /api/admin/users — remove a user (cascades sessions/accounts/projects).
export async function DELETE(req: Request) {
  const g = await guard();
  if (!g.ok) return g.res;

  const body = await req.json().catch(() => null);
  const parsed = DeleteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input." }, { status: 400 });

  // Don't let an admin delete their own account from the panel.
  if (parsed.data.id === g.session.user.id) {
    return NextResponse.json({ error: "You can't delete your own admin account here." }, { status: 400 });
  }
  // Don't allow deleting another admin account.
  const db = getDb();
  const [target] = await db.select({ email: userTable.email }).from(userTable).where(eq(userTable.id, parsed.data.id)).limit(1);
  if (target && isAdmin(target.email)) {
    return NextResponse.json({ error: "Can't delete an admin account." }, { status: 400 });
  }

  await db.delete(userTable).where(eq(userTable.id, parsed.data.id));
  return NextResponse.json({ ok: true });
}
