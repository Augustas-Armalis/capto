"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Home, Settings, CreditCard, Video, KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "@/lib/auth-client";
import { PoweredByContles } from "@/components/marketing/powered-by-contles";

const ITEMS = [
  { href: "/dashboard", label: "Projects", icon: Home },
  { href: "/editor", label: "Editor", icon: Video },
  { href: "/billing", label: "Billing", icon: CreditCard },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppNav({
  userName,
  userEmail,
  userImage,
}: {
  userName?: string;
  userEmail?: string;
  userImage?: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = React.useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      router.push("/");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-bg)]/60 backdrop-blur-xl">
      <div className="px-5 py-5 border-b border-[var(--color-border)]">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Image src="/logo.png" alt="Capto" width={26} height={26} />
          <span className="font-bold tracking-tight">Capto</span>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-[var(--color-bg-elev)] text-[var(--color-fg)]"
                  : "text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-elev)]/60 hover:text-[var(--color-fg)]",
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[var(--color-border)] p-3 space-y-3">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-3 py-2.5">
          <div className="flex items-center gap-2.5">
            <div className="size-8 overflow-hidden rounded-full bg-[var(--color-brand)]/15 text-[var(--color-brand)] inline-flex items-center justify-center text-sm font-semibold">
              {userImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={userImage} alt="" className="size-full object-cover" />
              ) : (
                (userName || userEmail || "?")[0]?.toUpperCase()
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium truncate">{userName || ","}</div>
              <div className="text-xs text-[var(--color-fg-subtle)] truncate">{userEmail}</div>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-transparent px-2.5 py-1.5 text-xs text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:border-[var(--color-border-strong)] transition-colors"
          >
            <LogOut className="size-3" />
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
        <div className="flex items-center justify-center">
          <PoweredByContles variant="chip" />
        </div>
      </div>
    </aside>
  );
}

export function MobileTopBar({ userName }: { userName?: string }) {
  return (
    <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg)]/80 backdrop-blur-xl px-4 py-3">
      <Link href="/dashboard" className="flex items-center gap-2">
        <Image src="/logo.png" alt="Capto" width={22} height={22} />
        <span className="text-sm font-bold tracking-tight">Capto</span>
      </Link>
      <div className="size-8 rounded-full bg-[var(--color-brand)]/15 text-[var(--color-brand)] inline-flex items-center justify-center text-xs font-semibold">
        {(userName || "?")[0]?.toUpperCase()}
      </div>
    </div>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-[var(--color-border)] bg-[var(--color-bg)]/95 backdrop-blur-xl">
      <div className="flex items-stretch">
        {ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[10px]",
                active ? "text-[var(--color-brand)]" : "text-[var(--color-fg-muted)]",
              )}
            >
              <item.icon className="size-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
