// Team (Ultra) helpers — shared workspace + seats. A user belongs to at most one
// team. The Ultra subscriber owns a team and invites up to SEAT_LIMIT-1 members
// who then share the team's projects.

import { and, asc, eq, isNull } from "drizzle-orm";
import { getDb, team, teamMember, teamInvite, user as userTable } from "@/lib/db";

export const SEAT_LIMIT = 5; // total people, owner included

export type TeamContext = {
  teamId: string;
  ownerId: string;
  name: string;
  role: "owner" | "member";
};

/**
 * The team this user belongs to, or null. Crucially this is gated on the team
 * OWNER still being on Ultra — so if the owner downgrades or lapses, the shared
 * workspace stops resolving for everyone immediately (defense-in-depth against a
 * missed billing webhook). Deterministic order so a (DB-prevented) duplicate
 * membership can't make the result flip between requests.
 */
export async function getUserTeam(userId: string): Promise<TeamContext | null> {
  const db = getDb();
  const [row] = await db
    .select({ teamId: teamMember.teamId, role: teamMember.role, ownerId: team.ownerId, name: team.name })
    .from(teamMember)
    .innerJoin(team, eq(teamMember.teamId, team.id))
    .innerJoin(userTable, eq(team.ownerId, userTable.id))
    .where(and(eq(teamMember.userId, userId), eq(userTable.plan, "ultra")))
    .orderBy(asc(teamMember.createdAt))
    .limit(1);
  return row ? { teamId: row.teamId, ownerId: row.ownerId, name: row.name, role: row.role } : null;
}

/** Get the Ultra owner's team, creating it (+ owner membership) on first use. */
export async function ensureOwnerTeam(userId: string): Promise<TeamContext> {
  const existing = await getUserTeam(userId);
  if (existing) return existing;
  const db = getDb();
  const id = crypto.randomUUID();
  await db.insert(team).values({ id, ownerId: userId, name: "My team" });
  await db.insert(teamMember).values({ teamId: id, userId, role: "owner" });
  return { teamId: id, ownerId: userId, name: "My team", role: "owner" };
}

export type TeamDetail = {
  team: TeamContext;
  members: { userId: string; role: string; name: string | null; email: string; image: string | null }[];
  invites: { id: string; email: string; token: string }[];
  seatsUsed: number;
  seatLimit: number;
};

export async function getTeamDetail(teamId: string, ctx: TeamContext): Promise<TeamDetail> {
  const db = getDb();
  const members = await db
    .select({
      userId: teamMember.userId,
      role: teamMember.role,
      name: userTable.name,
      email: userTable.email,
      image: userTable.image,
    })
    .from(teamMember)
    .innerJoin(userTable, eq(teamMember.userId, userTable.id))
    .where(eq(teamMember.teamId, teamId));
  const invites = await db
    .select({ id: teamInvite.id, email: teamInvite.email, token: teamInvite.token })
    .from(teamInvite)
    .where(and(eq(teamInvite.teamId, teamId), isNull(teamInvite.acceptedAt))); // pending only
  return {
    team: ctx,
    members,
    invites,
    seatsUsed: members.length + invites.length,
    seatLimit: SEAT_LIMIT,
  };
}
