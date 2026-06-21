"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, MessageSquare, Brain } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/feedback", label: "Feedback", icon: MessageSquare },
  { href: "/admin/learning", label: "Learning", icon: Brain },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap items-center gap-1 border-b border-[var(--color-border)] px-6 lg:px-10">
      {TABS.map((t) => {
        const active = t.href === "/admin" ? pathname === "/admin" : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition-colors",
              active
                ? "border-[var(--color-brand)] text-[var(--color-fg)]"
                : "border-transparent text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]",
            )}
          >
            <t.icon className="size-4" />
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
