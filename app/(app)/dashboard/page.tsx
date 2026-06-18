import Link from "next/link";
import { ArrowRight, Plus, Video, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/ui/money";
import { getCurrentSession } from "@/lib/session";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await getCurrentSession();
  const user = session?.user;
  const firstName = user?.name?.split(" ")[0] || "there";

  // In v1 projects live in the editor's localStorage; the dashboard surfaces
  // a launch tile + recent-projects placeholder we'll wire to the DB next.
  return (
    <div className="px-6 lg:px-10 py-10 max-w-6xl mx-auto w-full">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="brand">Welcome back</Badge>
          <h1 className="heading mt-3 text-4xl sm:text-5xl ">
            Hey {firstName} 👋
          </h1>
          <p className="mt-2 text-[var(--color-fg-muted)]">
            Drop a new clip in the editor or pick up where you left off.
          </p>
        </div>
        <Button href="/editor" size="lg">
          <Plus className="size-4" />
          New project
        </Button>
      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-3">
        <Link
          href="/editor"
          className="group relative overflow-hidden rounded-3xl border border-[var(--color-border)] bg-gradient-to-br from-[var(--color-brand)]/10 via-[var(--color-bg-elev)] to-[var(--color-bg-elev)] p-7 hover:border-[var(--color-brand)]/40 transition-all hover:-translate-y-0.5"
        >
          <div className="inline-flex size-11 items-center justify-center rounded-2xl bg-[var(--color-brand)]/15 text-[var(--color-brand)]">
            <Video className="size-5" />
          </div>
          <h3 className="mt-5 text-lg font-semibold">Open the editor</h3>
          <p className="mt-2 text-sm text-[var(--color-fg-muted)]">
            Drop a video, get word-perfect captions, ship it.
          </p>
          <ArrowRight className="absolute right-6 bottom-6 size-5 text-[var(--color-fg-muted)] group-hover:text-[var(--color-brand)] group-hover:translate-x-1 transition-all" />
        </Link>

        <Link
          href="/settings#api-keys"
          className="group relative overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-7 hover:border-[var(--color-brand)]/40 transition-all hover:-translate-y-0.5"
        >
          <div className="inline-flex size-11 items-center justify-center rounded-2xl bg-[var(--color-bg-soft)] text-[var(--color-fg)]">
            <Sparkles className="size-5" />
          </div>
          <h3 className="mt-5 text-lg font-semibold">API keys</h3>
          <p className="mt-2 text-sm text-[var(--color-fg-muted)]">
            Bring your Groq or OpenAI key. We encrypt and store it for you.
          </p>
          <ArrowRight className="absolute right-6 bottom-6 size-5 text-[var(--color-fg-muted)] group-hover:text-[var(--color-fg)] group-hover:translate-x-1 transition-all" />
        </Link>

        <Link
          href="/billing"
          className="group relative overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-7 hover:border-[var(--color-brand)]/40 transition-all hover:-translate-y-0.5"
        >
          <div className="inline-flex size-11 items-center justify-center rounded-2xl bg-[var(--color-bg-soft)] text-[var(--color-fg)]">
            <Sparkles className="size-5" />
          </div>
          <h3 className="mt-5 text-lg font-semibold">Upgrade to Pro</h3>
          <p className="mt-2 text-sm text-[var(--color-fg-muted)]">
            Unlimited exports, no watermark, priority queue. <Money eur="6.99" usd="7.99" />/mo.
          </p>
          <ArrowRight className="absolute right-6 bottom-6 size-5 text-[var(--color-fg-muted)] group-hover:text-[var(--color-fg)] group-hover:translate-x-1 transition-all" />
        </Link>
      </div>

      <div className="mt-10">
        <h2 className="text-base font-semibold tracking-tight">Recent projects</h2>
        <div className="mt-5 rounded-3xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg-elev)]/40 p-12 text-center">
          <p className="text-sm text-[var(--color-fg-muted)]">
            Your captioned reels will appear here. Open the editor to start your first one.
          </p>
          <Button href="/editor" variant="secondary" className="mt-5" size="md">
            Open editor →
          </Button>
        </div>
      </div>
    </div>
  );
}
