"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Settings, CreditCard, FolderOpen, ChevronLeft, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "@/lib/auth-client";

// Minimal top bar for the whole app — no sidebar. Primary action ("New") +
// Projects up front; everything else lives in a compact avatar menu.
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
  const [menuOpen, setMenuOpen] = React.useState(false);
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

  const initial = (userName || userEmail || "?").trim().charAt(0).toUpperCase();
  const onDashboard = pathname === "/dashboard";

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-bg)]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/editor"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-fg-muted)] transition-colors hover:text-[var(--color-fg)]"
        >
          <ChevronLeft className="size-4" />
          Back to platform
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className={cn(
              "hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors sm:inline-flex",
              onDashboard
                ? "bg-[var(--color-bg-elev)] text-[var(--color-fg)]"
                : "text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]",
            )}
          >
            <FolderOpen className="size-4" />
            Projects
          </Link>

          <div className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-1 rounded-full p-0.5 text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
              aria-label="Account menu"
            >
              <span className="inline-flex size-8 items-center justify-center overflow-hidden rounded-full bg-[var(--color-brand)]/15 text-sm font-semibold text-[var(--color-brand)]">
                {userImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={userImage} alt="" className="size-full object-cover" />
                ) : (
                  initial
                )}
              </span>
              <ChevronDown className="size-3.5" />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-2 shadow-[var(--shadow-pop)]">
                  <div className="px-3 py-2">
                    <div className="truncate text-sm font-medium text-[var(--color-fg)]">{userName || "Your account"}</div>
                    <div className="truncate text-xs text-[var(--color-fg-subtle)]">{userEmail}</div>
                  </div>
                  <div className="my-1 h-px bg-[var(--color-border)]" />
                  {[
                    { href: "/dashboard", label: "Projects", icon: FolderOpen },
                    { href: "/billing", label: "Billing", icon: CreditCard },
                    { href: "/settings", label: "Settings", icon: Settings },
                  ].map((it) => (
                    <Link
                      key={it.href}
                      href={it.href}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-[var(--color-fg-muted)] transition-colors hover:bg-white/[0.05] hover:text-[var(--color-fg)]"
                    >
                      <it.icon className="size-4" />
                      {it.label}
                    </Link>
                  ))}
                  <div className="my-1 h-px bg-[var(--color-border)]" />
                  <button
                    onClick={handleSignOut}
                    disabled={signingOut}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-[var(--color-fg-muted)] transition-colors hover:bg-white/[0.05] hover:text-[var(--color-fg)]"
                  >
                    <LogOut className="size-4" />
                    {signingOut ? "Signing out…" : "Sign out"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
