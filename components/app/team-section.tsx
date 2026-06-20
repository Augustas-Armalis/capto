"use client";

import * as React from "react";
import { Users, Crown, Trash2, Mail, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type Member = { userId: string; role: string; name: string | null; email: string; image: string | null };
type Invite = { id: string; email: string; token: string };
type TeamData = {
  team?: { teamId: string; ownerId: string; name: string; role: "owner" | "member" };
  members?: Member[];
  invites?: Invite[];
  seatsUsed?: number;
  seatLimit?: number;
  plan?: string;
} | null;

// Ultra team workspace: invite up to 5 people who share the same projects.
// Renders an upgrade teaser for non-Ultra plans (a quiet, on-brand upsell).
export function TeamSection() {
  const [data, setData] = React.useState<TeamData>(undefined as unknown as TeamData);
  const [email, setEmail] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [sent, setSent] = React.useState(false);

  const load = React.useCallback(() => {
    fetch("/api/team").then((r) => r.json()).then(setData).catch(() => setData(null));
  }, []);
  React.useEffect(() => load(), [load]);

  if (data === undefined) return null; // initial load

  const team = data?.team;
  const isOwner = team?.role === "owner";
  const members = data?.members ?? [];
  const invites = data?.invites ?? [];
  const seatLimit = data?.seatLimit ?? 5;
  const seatsUsed = data?.seatsUsed ?? members.length + invites.length;

  // Non-Ultra (and no team): quiet upsell.
  if (!team) {
    return (
      <section className="mt-6 rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-[var(--color-brand)]/15 text-[var(--color-brand)]">
              <Users className="size-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold">Team workspace</h2>
              <p className="text-sm text-[var(--color-fg-muted)]">
                Ultra includes 5 seats — invite your team and share one workspace of projects.
              </p>
            </div>
          </div>
          <Button href="/billing" variant="primary" size="md">
            <Crown className="size-4" />
            Get Ultra
          </Button>
        </div>
      </section>
    );
  }

  async function invite() {
    const e = email.trim();
    if (!e) return;
    setBusy(true);
    setErr(null);
    setSent(false);
    try {
      const r = await fetch("/api/team", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "invite", email: e }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Could not send the invite.");
      setEmail("");
      setSent(true);
      setTimeout(() => setSent(false), 2500);
      load();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Could not send the invite.");
    } finally {
      setBusy(false);
    }
  }

  async function removeInvite(id: string) {
    await fetch(`/api/team?invite=${id}`, { method: "DELETE" });
    load();
  }
  async function removeMember(userId: string) {
    if (!confirm("Remove this member from the team?")) return;
    await fetch(`/api/team?member=${userId}`, { method: "DELETE" });
    load();
  }
  async function leaveTeam() {
    if (!confirm("Leave this team? Your shared projects become personal again.")) return;
    await fetch(`/api/team?leave=1`, { method: "DELETE" });
    load();
  }

  return (
    <section className="mt-6 rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-7">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-[var(--color-brand)]/15 text-[var(--color-brand)]">
            <Users className="size-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold">Team workspace</h2>
            <p className="text-sm text-[var(--color-fg-muted)]">Everyone here shares the same projects.</p>
          </div>
        </div>
        <Badge variant="outline">{seatsUsed} / {seatLimit} seats</Badge>
      </div>

      {/* Members */}
      <div className="mt-5 space-y-2">
        {members.map((m) => (
          <div key={m.userId} className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]/40 px-4 py-2.5">
            <span className="inline-flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--color-brand)]/15 text-xs font-semibold text-[var(--color-brand)]">
              {m.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.image} alt="" className="size-full object-cover" />
              ) : (
                (m.name || m.email || "?").charAt(0).toUpperCase()
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-[var(--color-fg)]">{m.name || m.email}</div>
              <div className="truncate text-xs text-[var(--color-fg-subtle)]">{m.email}</div>
            </div>
            {m.role === "owner" ? (
              <Badge variant="brand"><Crown className="size-3" /> Owner</Badge>
            ) : (
              isOwner && (
                <button
                  onClick={() => removeMember(m.userId)}
                  aria-label="Remove member"
                  className="inline-flex size-7 items-center justify-center rounded-md text-[var(--color-fg-subtle)] hover:bg-[var(--color-bg-elev)] hover:text-[var(--color-danger)]"
                >
                  <Trash2 className="size-3.5" />
                </button>
              )
            )}
          </div>
        ))}

        {/* Pending invites */}
        {invites.map((inv) => (
          <div key={inv.id} className="flex items-center gap-3 rounded-xl border border-dashed border-[var(--color-border)] px-4 py-2.5">
            <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-white/5 text-[var(--color-fg-subtle)]">
              <Mail className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm text-[var(--color-fg-muted)]">{inv.email}</div>
              <div className="text-xs text-[var(--color-fg-subtle)]">Invite pending</div>
            </div>
            {isOwner && (
              <button
                onClick={() => removeInvite(inv.id)}
                aria-label="Revoke invite"
                className="inline-flex size-7 items-center justify-center rounded-md text-[var(--color-fg-subtle)] hover:bg-[var(--color-bg-elev)] hover:text-[var(--color-danger)]"
              >
                <Trash2 className="size-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Invite form (owner only) */}
      {isOwner && (
        <div className="mt-4">
          {seatsUsed < seatLimit ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                type="email"
                placeholder="teammate@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && invite()}
              />
              <Button onClick={invite} loading={busy} disabled={!email.trim()}>
                {sent ? <Check className="size-4 text-[var(--color-success)]" /> : <Mail className="size-4" />}
                Invite
              </Button>
            </div>
          ) : (
            <p className="text-sm text-[var(--color-fg-subtle)]">All {seatLimit} seats are in use.</p>
          )}
          {err && <p className="mt-2 text-xs text-[var(--color-danger)]">{err}</p>}
          <p className="mt-2 text-xs text-[var(--color-fg-subtle)]">
            Invited people get an email link to sign in and join your shared workspace.
          </p>
        </div>
      )}

      {/* Members can leave the team themselves. */}
      {!isOwner && (
        <div className="mt-4 border-t border-[var(--color-border)] pt-4">
          <Button onClick={leaveTeam} variant="ghost" size="sm">
            Leave team
          </Button>
        </div>
      )}
    </section>
  );
}
