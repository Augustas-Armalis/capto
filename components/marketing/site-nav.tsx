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
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b transition-[background-color,border-color] duration-[var(--dur-base)]",
        scrolled || open
          ? "border-[var(--color-border)] bg-[var(--color-bg)]/80 backdrop-blur-xl backdrop-saturate-150"
          : "border-transparent",
      )}
    >
      <nav className="mx-auto flex h-16 w-full max-w-6xl items-center gap-8 px-5 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center" aria-label="Capto home">
          <Image src="/wordmark.png" alt="Capto" width={108} height={32} priority className="h-[26px] w-auto" />
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-[var(--radius-sm)] px-2.5 py-1.5 text-[13px] text-[var(--color-fg-muted)] transition-colors hover:text-white"
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="ml-auto hidden items-center gap-1.5 md:flex">
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

        <button
          className="-mr-1 ml-auto inline-flex size-9 items-center justify-center text-white md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-[var(--color-border)] px-5 pb-5 pt-2 md:hidden">
          <div className="flex flex-col">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="border-b border-[var(--color-border)] py-3.5 text-[15px] text-white"
              >
                {l.label}
              </Link>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
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
    </header>
  );
}
