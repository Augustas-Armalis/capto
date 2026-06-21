import type { Metadata } from "next";
import { desc } from "drizzle-orm";
import { getDb, user as userTable } from "@/lib/db";
import { isConfigured } from "@/lib/env";
import { isAdmin } from "@/lib/admin";
import { AdminUsersTable, type AdminUser } from "@/components/app/admin-users-table";

export const metadata: Metadata = { title: "Users · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  let users: AdminUser[] = [];

  if (isConfigured.db()) {
    try {
      const rows = await getDb()
        .select({
          id: userTable.id,
          name: userTable.name,
          email: userTable.email,
          plan: userTable.plan,
          createdAt: userTable.createdAt,
          emailVerified: userTable.emailVerified,
          subscriptionStatus: userTable.subscriptionStatus,
        })
        .from(userTable)
        .orderBy(desc(userTable.createdAt))
        .limit(500);
      users = rows.map((u) => ({
        ...u,
        createdAt: (u.createdAt instanceof Date ? u.createdAt : new Date(u.createdAt)).toISOString(),
        isAdmin: isAdmin(u.email),
      }));
    } catch {}
  }

  return (
    <div className="px-6 py-8 lg:px-10">
      <p className="mb-5 text-sm text-[var(--color-fg-muted)]">
        Every account. Change a plan to unlock features instantly, or remove an account entirely.
      </p>
      <AdminUsersTable initialUsers={users} />
    </div>
  );
}
