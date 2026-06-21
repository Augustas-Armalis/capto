"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2, Search } from "lucide-react";

type Plan = "free" | "pro" | "ultra";

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  plan: Plan;
  createdAt: string;
  emailVerified: boolean;
  subscriptionStatus: string | null;
  isAdmin: boolean;
};

const PLANS: Plan[] = ["free", "pro", "ultra"];

export function AdminUsersTable({ initialUsers }: { initialUsers: AdminUser[] }) {
  const router = useRouter();
  const [users, setUsers] = React.useState(initialUsers);
  const [query, setQuery] = React.useState("");
  const [busy, setBusy] = React.useState<string | null>(null);

  React.useEffect(() => setUsers(initialUsers), [initialUsers]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => u.email.toLowerCase().includes(q) || (u.name || "").toLowerCase().includes(q));
  }, [users, query]);

  async function setPlan(id: string, plan: Plan) {
    const prev = users;
    setUsers((us) => us.map((u) => (u.id === id ? { ...u, plan } : u)));
    setBusy(id);
    try {
      const r = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, plan }),
      });
      if (!r.ok) throw new Error();
      router.refresh();
    } catch {
      setUsers(prev); // revert on failure
      alert("Couldn't update plan.");
    } finally {
      setBusy(null);
    }
  }

  async function remove(u: AdminUser) {
    if (!confirm(`Delete ${u.email}? This removes their account, projects and sessions. This cannot be undone.`)) return;
    setBusy(u.id);
    try {
      const r = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: u.id }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => null);
        throw new Error(j?.error || "Failed");
      }
      setUsers((us) => us.filter((x) => x.id !== u.id));
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Couldn't delete user.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-3 py-2">
        <Search className="size-4 text-[var(--color-fg-subtle)]" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or email…"
          className="w-full bg-transparent text-sm text-[var(--color-fg)] outline-none placeholder:text-[var(--color-fg-subtle)]"
        />
        <span className="tnum text-xs text-[var(--color-fg-subtle)]">{filtered.length}</span>
      </div>

      <div className="overflow-x-auto rounded-[var(--radius-xl)] border border-[var(--color-border)]">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-[var(--color-bg-elev)] text-left text-[var(--color-fg-muted)]">
            <tr>
              <th className="px-4 py-2.5 font-medium">User</th>
              <th className="px-4 py-2.5 font-medium">Joined</th>
              <th className="px-4 py-2.5 font-medium">Plan</th>
              <th className="px-4 py-2.5 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-[var(--color-fg-subtle)]">
                  No users.
                </td>
              </tr>
            ) : (
              filtered.map((u) => (
                <tr key={u.id} className="border-t border-[var(--color-border)]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 font-medium text-white">
                      {u.name || "—"}
                      {u.isAdmin && (
                        <span className="rounded-[var(--radius-pill)] border border-[var(--color-brand)]/40 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[var(--color-brand)]">
                          admin
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[var(--color-fg-subtle)]">{u.email}</div>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-fg-muted)]">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={u.plan}
                      disabled={busy === u.id || u.isAdmin}
                      onChange={(e) => setPlan(u.id, e.target.value as Plan)}
                      className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-sm text-[var(--color-fg)] outline-none disabled:opacity-50"
                    >
                      {PLANS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => remove(u)}
                      disabled={busy === u.id || u.isAdmin}
                      title={u.isAdmin ? "Admins can't be deleted" : "Delete user"}
                      className="inline-flex items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] p-1.5 text-[var(--color-fg-muted)] transition-colors hover:border-[var(--color-danger)]/50 hover:text-[var(--color-danger)] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
