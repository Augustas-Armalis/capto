import * as React from "react";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/session";
import { isConfigured } from "@/lib/env";
import { isAdmin } from "@/lib/admin";
import { AdminNav } from "@/components/app/admin-nav";

export const dynamic = "force-dynamic";

// Admin-only shell: gate every /admin/* route, then render the sub-nav.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Mirror the (app) gate, but only allow admins. When auth isn't configured
  // (local dev with no DB) leave it open so the panel is still reachable.
  if (isConfigured.auth() && isConfigured.db()) {
    const session = await getCurrentSession();
    if (!session?.user) redirect("/signin");
    if (!isAdmin(session.user.email)) redirect("/dashboard");
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="px-6 pt-10 lg:px-10">
        <div className="inline-flex items-center gap-2 rounded-[var(--radius-pill)] border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-3 py-1 text-xs font-medium text-[var(--color-fg-muted)]">
          <span className="size-1.5 rounded-full bg-[var(--color-brand)]" />
          Admin
        </div>
        <h1 className="heading mt-3 text-4xl text-[var(--color-fg)]">Control room</h1>
      </div>
      <div className="mt-6">
        <AdminNav />
      </div>
      <div className="pb-16">{children}</div>
    </div>
  );
}
