"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Clock, Video, Trash2, Loader2 } from "lucide-react";
import { fmtTime } from "@/lib/cues";

export type ProjectRow = {
  id: string;
  name: string;
  durationSec: number | null;
  updatedAt: string;
  thumbnail?: string | null;
};

export function ProjectsGrid({ initial }: { initial: ProjectRow[] }) {
  const [projects, setProjects] = React.useState(initial);
  const [deleting, setDeleting] = React.useState<string | null>(null);

  async function remove(id: string, name: string) {
    if (!confirm(`Delete "${name}"? The saved captions and project are removed for good (your local video file is untouched).`)) return;
    setDeleting(id);
    try {
      const r = await fetch(`/api/projects/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error();
      setProjects((p) => p.filter((x) => x.id !== id));
    } catch {
      alert("Could not delete. Try again.");
    } finally {
      setDeleting(null);
    }
  }

  if (!projects.length) {
    return (
      <div className="mt-5 rounded-3xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg-elev)]/40 p-12 text-center">
        <p className="text-sm text-[var(--color-fg-muted)]">
          Your captioned projects show up here. Drop a clip above to start your first one.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((p) => (
        <div
          key={p.id}
          className="group relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] transition-all hover:-translate-y-0.5 hover:border-[var(--color-brand)]/40"
        >
          <Link href={`/editor?project=${p.id}`} className="block">
            <div className="relative flex aspect-video items-center justify-center overflow-hidden bg-[var(--color-bg)]">
              {p.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.thumbnail} alt="" className="size-full object-cover" />
              ) : (
                <Video className="size-7 text-[var(--color-fg-subtle)]" />
              )}
            </div>
            <div className="p-4">
              <h3 className="truncate font-medium text-white">{p.name}</h3>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-[var(--color-fg-subtle)]">
                <Clock className="size-3" />
                {p.durationSec ? fmtTime(p.durationSec) : "—"} · {new Date(p.updatedAt).toLocaleDateString()}
              </div>
            </div>
          </Link>
          <div className="pointer-events-none absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              onClick={() => remove(p.id, p.name)}
              aria-label={`Delete ${p.name}`}
              className="pointer-events-auto inline-flex size-8 items-center justify-center rounded-lg bg-black/60 text-white/80 backdrop-blur-md transition-colors hover:bg-[var(--color-danger)] hover:text-white"
            >
              {deleting === p.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            </button>
          </div>
          <Link
            href={`/editor?project=${p.id}`}
            aria-hidden
            tabIndex={-1}
            className="pointer-events-none absolute bottom-4 right-4 text-[var(--color-fg-subtle)] opacity-0 transition-all group-hover:translate-x-0.5 group-hover:text-[var(--color-brand)] group-hover:opacity-100"
          >
            <ArrowRight className="size-4" />
          </Link>
        </div>
      ))}
    </div>
  );
}
