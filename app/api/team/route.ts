import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getCurrentSession } from "@/lib/session";
import { getDb, user as userTable, teamMember, teamInvite, project } from "@/lib/db";
import { isConfigured, env } from "@/lib/env";
import { sendEmail } from "@/lib/email";
import { getUserTeam, ensureOwnerTeam, getTeamDetail, SEAT_LIMIT } from "@/lib/team";

export const runtime = "nodejs";

async function me() {
  const session = await getCurrentSession();
  return session?.user?.id ?? null;
}

// GET: the caller's team context (members + pending invites). Ultra owners get
// their team auto-created; members see the team they belong to.
export async function GET() {
  if (!isConfigured.db()) return NextResponse.json({ team: null });
  const userId = await me();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const db = getDb();
  const [u] = await db.select({ plan: userTable.plan }).from(userTable).where(eq(userTable.id, userId)).limit(1);

  let ctx = await getUserTeam(userId);
  // Auto-provision a team for Ultra owners on first visit.
  if (!ctx && u?.plan === "ultra") ctx = await ensureOwnerTeam(userId);
  if (!ctx) return NextResponse.json({ team: null, plan: u?.plan ?? "free" });

  const detail = await getTeamDetail(ctx.teamId, ctx);
  return NextResponse.json({ ...detail, plan: u?.plan ?? "free" });
}

// POST { action: "invite", email }: owner invites a member (seat-capped + emailed).
export async function POST(req: Request) {
  if (!isConfigured.db()) return NextResponse.json({ error: "Not configured." }, { status: 503 });
  const userId = await me();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { action?: string; email?: string };
  const db = getDb();

  if (body.action === "invite") {
    // Team workspaces are an Ultra feature — gate BEFORE creating any team.
    const [u] = await db.select({ plan: userTable.plan }).from(userTable).where(eq(userTable.id, userId)).limit(1);
    if (u?.plan !== "ultra") {
      return NextResponse.json({ error: "Team seats are an Ultra feature.", code: "upgrade" }, { status: 403 });
    }
    const ctx = await ensureOwnerTeam(userId);
    if (ctx.role !== "owner")
      return NextResponse.json({ error: "Only the team owner can invite." }, { status: 403 });

    const email = (body.email || "").toLowerCase().trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
      return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });

    const detail = await getTeamDetail(ctx.teamId, ctx);
    if (detail.seatsUsed >= SEAT_LIMIT)
      return NextResponse.json({ error: `Your plan includes ${SEAT_LIMIT} seats.` }, { status: 400 });
    if (detail.members.some((m) => m.email.toLowerCase() === email))
      return NextResponse.json({ error: "They're already on your team." }, { status: 400 });

    const id = crypto.randomUUID();
    const token = `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, "");
    await db.insert(teamInvite).values({ id, teamId: ctx.teamId, email, token });

    const link = `${env.siteUrl}/join?token=${token}`;
    if (isConfigured.email()) {
      await sendEmail({
        to: email,
        subject: `You're invited to a Capto team`,
        html: `<p>You've been invited to join a team on Capto — shared projects, captions and exports.</p>
               <p><a href="${link}">Accept the invite</a> (sign in or create an account with this email).</p>
               <p style="color:#888;font-size:12px">${link}</p>`,
      }).catch(() => {});
    }
    return NextResponse.json({ ok: true, link });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}

// DELETE ?leave=1  → caller leaves their team (members only)
//        ?invite=<id> / ?member=<userId>  → owner revokes invite / removes member
export async function DELETE(req: Request) {
  if (!isConfigured.db()) return NextResponse.json({ error: "Not configured." }, { status: 503 });
  const userId = await me();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const ctx = await getUserTeam(userId);
  if (!ctx) return NextResponse.json({ error: "You're not on a team." }, { status: 400 });

  const url = new URL(req.url);
  const db = getDb();

  // Self-leave: a member detaches; their shared projects revert to personal so
  // no project stays matchable by both their userId and the team.
  if (url.searchParams.get("leave")) {
    if (ctx.role === "owner")
      return NextResponse.json({ error: "Cancel Ultra to dissolve the team." }, { status: 400 });
    await db
      .update(project)
      .set({ teamId: null })
      .where(and(eq(project.teamId, ctx.teamId), eq(project.userId, userId)));
    await db.delete(teamMember).where(and(eq(teamMember.teamId, ctx.teamId), eq(teamMember.userId, userId)));
    return NextResponse.json({ ok: true });
  }

  // Everything below is owner-only.
  if (ctx.role !== "owner")
    return NextResponse.json({ error: "Only the team owner can manage members." }, { status: 403 });

  const inviteId = url.searchParams.get("invite");
  const memberId = url.searchParams.get("member");

  if (inviteId) {
    await db.delete(teamInvite).where(and(eq(teamInvite.id, inviteId), eq(teamInvite.teamId, ctx.teamId)));
    return NextResponse.json({ ok: true });
  }
  if (memberId) {
    if (memberId === ctx.ownerId)
      return NextResponse.json({ error: "The owner can't be removed." }, { status: 400 });
    // Transfer the removed member's shared projects to the owner: the workspace
    // keeps them and the departed member loses their own-branch access.
    await db
      .update(project)
      .set({ userId: ctx.ownerId })
      .where(and(eq(project.teamId, ctx.teamId), eq(project.userId, memberId)));
    await db
      .delete(teamMember)
      .where(and(eq(teamMember.teamId, ctx.teamId), eq(teamMember.userId, memberId)));
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Nothing to remove." }, { status: 400 });
}
