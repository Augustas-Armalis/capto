import type { Metadata } from "next";
import { desc } from "drizzle-orm";
import { getDb, feedback as feedbackTable } from "@/lib/db";
import { isConfigured } from "@/lib/env";
import { AdminFeedbackList, type AdminFeedback } from "@/components/app/admin-feedback-list";

export const metadata: Metadata = { title: "Feedback · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminFeedbackPage() {
  let items: AdminFeedback[] = [];
  let tableReady = true;

  if (isConfigured.db()) {
    try {
      const rows = await getDb()
        .select()
        .from(feedbackTable)
        .orderBy(desc(feedbackTable.createdAt))
        .limit(1000);
      items = rows.map((r) => ({
        id: r.id,
        userId: r.userId,
        email: r.email,
        kind: r.kind,
        message: r.message,
        page: r.page,
        resolved: r.resolved,
        createdAt: (r.createdAt instanceof Date ? r.createdAt : new Date(r.createdAt)).toISOString(),
      }));
    } catch {
      tableReady = false; // migration 0006 not applied yet
    }
  }

  return (
    <div className="px-6 py-8 lg:px-10">
      <p className="mb-5 text-sm text-[var(--color-fg-muted)]">
        Bug reports and ideas from the &ldquo;Leave feedback&rdquo; box across the app. Also emailed to you live.
      </p>
      {tableReady ? (
        <AdminFeedbackList initialItems={items} />
      ) : (
        <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-6 text-sm text-[var(--color-warning)]">
          The feedback table isn&rsquo;t created yet — run{" "}
          <code className="rounded bg-[var(--color-bg)] px-1.5 py-0.5">npm run db:migrate</code> to start collecting reports
          here. (They&rsquo;re still emailed to you in the meantime.)
        </div>
      )}
    </div>
  );
}
