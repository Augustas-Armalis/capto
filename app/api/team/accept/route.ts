import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { neon } from "@neondatabase/serverless";
import { getCurrentSession } from "@/lib/session";
import { getDb, user as userTable, teamInvite } from "@/lib/db";
import { env, isConfigured } from "@/lib/env";
import { getUserTeam, SEAT_LIMIT } from "@/lib/team";

export const runtime = "nodejs";

// Accept a team invite. Hardened: the signed-in user must have a VERIFIED email
// of record matching the invited email (so an attacker can't self-register the
// invited address unverified and steal the seat), and the seat cap is enforced
// with a single conditional INSERT (no count-then-insert race).
export async function POST(req: Request) {
  if (!isConfigured.db()) return NextResponse.json({ error: "Not configured." }, { status: 503 });
  const session = await getCurrentSession();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Please sign in first.", code: "auth" }, { status: 401 });
  const userId = session.user.id;

  const { token } = (await req.json().catch(() => ({}))) as { token?: string };
  if (!token) return NextResponse.json({ error: "Missing invite." }, { status: 400 });

  const db = getDb();

  // Email of record (verified) — never trust the session's email field alone.
  const [u] = await db
    .select({ email: userTable.email, verified: userTable.emailVerified })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);
  if (!u) return NextResponse.json({ error: "Account not found." }, { status: 401 });
  if (!u.verified) {
    return NextResponse.json(
      { error: "Verify your email before joining a team.", code: "verify" },
      { status: 403 },
    );
  }
  const userEmail = u.email.toLowerCase().trim();

  const [invite] = await db
    .select({ id: teamInvite.id, teamId: teamInvite.teamId, email: teamInvite.email })
    .from(teamInvite)
    .where(and(eq(teamInvite.token, token), isNull(teamInvite.acceptedAt)))
    .limit(1);
  if (!invite) return NextResponse.json({ error: "This invite is invalid or already used." }, { status: 404 });

  if (invite.email.toLowerCase().trim() !== userEmail) {
    return NextResponse.json(
      { error: `This invite was sent to ${invite.email}. Sign in with that email to accept.` },
      { status: 403 },
    );
  }

  // One team per user (also enforced by a unique index — this is the friendly error).
  const current = await getUserTeam(userId);
  if (current && current.teamId !== invite.teamId) {
    return NextResponse.json({ error: "You're already on a team. Leave it first." }, { status: 400 });
  }

  // Atomic seat-capped insert: only writes if the team has < SEAT_LIMIT members.
  // Single statement, so concurrent accepts can't push past the cap. The unique
  // index on (user_id) makes a double-accept fail safely.
  const sql = neon(env.databaseUrl);
  let inserted: { team_id: string }[] = [];
  try {
    inserted = (await sql`
      INSERT INTO team_member (team_id, user_id, role, created_at)
      SELECT ${invite.teamId}, ${userId}, 'member', now()
      WHERE (SELECT count(*) FROM team_member WHERE team_id = ${invite.teamId}) < ${SEAT_LIMIT}
      ON CONFLICT DO NOTHING
      RETURNING team_id
    `) as { team_id: string }[];
  } catch {
    // Unique-index violation (already on another team) or race — treat as full/blocked.
    return NextResponse.json({ error: "Could not join this team." }, { status: 400 });
  }

  const alreadyMember = !!current && current.teamId === invite.teamId;
  if (!inserted.length && !alreadyMember) {
    return NextResponse.json({ error: "This team is full." }, { status: 400 });
  }

  await db.update(teamInvite).set({ acceptedAt: new Date() }).where(eq(teamInvite.id, invite.id));
  // Clear any other pending invites for this email on this team.
  await db
    .delete(teamInvite)
    .where(and(eq(teamInvite.teamId, invite.teamId), eq(teamInvite.email, invite.email), isNull(teamInvite.acceptedAt)));

  return NextResponse.json({ ok: true });
}
