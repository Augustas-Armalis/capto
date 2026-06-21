"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Bug, Lightbulb, Check, Trash2, RotateCcw } from "lucide-react";

export type AdminFeedback = {
  id: string;
  userId: string | null;
  email: string | null;
  kind: string;
  message: string;
  page: string | null;
  resolved: boolean;
  createdAt: string;
};

export function AdminFeedbackList({ initialItems }: { initialItems: AdminFeedback[] }) {
  const router = useRouter();
  const [items, setItems] = React.useState(initialItems);
  const [filter, setFilter] = React.useState<"open" | "all">("open");
  const [busy, setBusy] = React.useState<string | null>(null);

  React.useEffect(() => setItems(initialItems), [initialItems]);

  const visible = filter === "open" ? items.filter((i) => !i.resolved) : items;

  async function toggleResolved(item: AdminFeedback) {
    setBusy(item.id);
    const next = !item.resolved;
    setItems((xs) => xs.map((x) => (x.id === item.id ? { ...x, resolved: next } : x)));
    try {
      const r = await fetch("/api/admin/feedback", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, resolved: next }),
      });
      if (!r.ok) throw new Error();
      router.refresh();
    } catch {
      setItems((xs) => xs.map((x) => (x.id === item.id ? { ...x, resolved: !next } : x)));
      alert("Couldn't update.");
    } finally {
      setBusy(null);
    }
  }

  async function remove(item: AdminFeedback) {
    if (!confirm("Delete this feedback?")) return;
    setBusy(item.id);
    try {
      const r = await fetch("/api/admin/feedback", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id }),
      });
      if (!r.ok) throw new Error();
      setItems((xs) => xs.filter((x) => x.id !== item.id));
      router.refresh();
    } catch {
      alert("Couldn't delete.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="mb-4 inline-flex rounded-[var(--radius-pill)] border border-[var(--color-border)] p-0.5 text-sm">
        {(["open", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-[var(--radius-pill)] px-3 py-1 capitalize transition-colors ${
              filter === f ? "bg-[var(--color-bg-elev)] text-[var(--color-fg)]" : "text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-[var(--radius-xl)] border border-dashed border-[var(--color-border)] p-10 text-center text-sm text-[var(--color-fg-subtle)]">
          {filter === "open" ? "No open feedback. 🎉" : "No feedback yet."}
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((item) => {
            const isBug = item.kind === "bug";
            return (
              <li
                key={item.id}
                className={`rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-4 ${
                  item.resolved ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-[var(--radius-pill)] px-2 py-0.5 text-xs font-medium ${
                        isBug
                          ? "bg-[var(--color-danger)]/15 text-[var(--color-danger)]"
                          : "bg-[var(--color-brand)]/15 text-[var(--color-brand)]"
                      }`}
                    >
                      {isBug ? <Bug className="size-3" /> : <Lightbulb className="size-3" />}
                      {isBug ? "Bug" : "Idea"}
                    </span>
                    <span className="truncate text-sm text-[var(--color-fg-muted)]">{item.email || "anonymous"}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => toggleResolved(item)}
                      disabled={busy === item.id}
                      title={item.resolved ? "Reopen" : "Mark resolved"}
                      className="inline-flex items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] p-1.5 text-[var(--color-fg-muted)] transition-colors hover:text-[var(--color-fg)] disabled:opacity-40"
                    >
                      {item.resolved ? <RotateCcw className="size-4" /> : <Check className="size-4" />}
                    </button>
                    <button
                      onClick={() => remove(item)}
                      disabled={busy === item.id}
                      title="Delete"
                      className="inline-flex items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] p-1.5 text-[var(--color-fg-muted)] transition-colors hover:border-[var(--color-danger)]/50 hover:text-[var(--color-danger)] disabled:opacity-40"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm text-[var(--color-fg)]">{item.message}</p>
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--color-fg-subtle)]">
                  <span>{new Date(item.createdAt).toLocaleString()}</span>
                  {item.page && <span className="truncate">· {item.page}</span>}
                  {item.resolved && <span className="text-[var(--color-brand)]">· resolved</span>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
