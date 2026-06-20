"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/pricing", label: "Pricing" },
  { href: "/styles", label: "Styles" },
  { href: "/tools", label: "Tools" },
  { href: "/compare", label: "Compare" },
  { href: "/blog", label: "Blog" },
];

export function SiteNav() {
  const [scrolled, setScrolled] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const { data: session } = useSession();
  const authed = !!session?.user;

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
    <header className={cn("fixed inset-x-0 top-0 z-50 transition-all duration-[var(--dur-base)]", scrolled ? "py-2" : "py-4")}>
      <div className="mx-auto w-full max-w-6xl px-4">
        <nav
          className={cn(
            "relative flex items-center justify-between gap-4 rounded-[var(--radius-lg)] py-2 pl-3 pr-2 transition-all duration-[var(--dur-base)]",
            scrolled ? "glass-strong" : "border border-transparent",
          )}
        >
          <Link href="/" className="flex items-center px-1">
            <Image src="/wordmark.png" alt="Capto" width={108} height={32} priority className="h-7 w-auto" />
          </Link>

          {/* Links centered independently of the logo / actions */}
          <div className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-0.5 md:flex">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-[var(--radius-md)] px-3 py-1.5 text-sm font-medium text-[var(--color-fg-muted)] transition-colors hover:text-white"
              >
                {l.label}
              </Link>
            ))}
          </div>

          <div className="hidden items-center gap-2 md:flex">
            {authed ? (
              <Button href="/dashboard" size="sm">
                Open app
              </Button>
            ) : (
              <>
                <Button href="/signin" variant="ghost" size="sm">
                  Sign in
                </Button>
                <Button href="/signup" size="sm">
                  Start free
                </Button>
              </>
            )}
          </div>

          {/* mobile toggle, no border box */}
          <button
            className="-mr-1 inline-flex size-9 items-center justify-center text-white md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </nav>

        {open && (
          <div className="glass-strong mt-2 rounded-[var(--radius-lg)] p-3 md:hidden">
            <div className="flex flex-col gap-0.5">
              {NAV_LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="rounded-[var(--radius-md)] px-3 py-2.5 text-[15px] font-medium text-white hover:bg-white/[0.05]"
                >
                  {l.label}
                </Link>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {authed ? (
                <Button href="/dashboard" className="col-span-2">Open app</Button>
              ) : (
                <>
                  <Button href="/signin" variant="secondary">Sign in</Button>
                  <Button href="/signup">Start free</Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
    </>
  );
}
