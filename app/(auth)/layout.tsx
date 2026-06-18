import * as React from "react";
import Link from "next/link";
import { Aurora } from "@/components/marketing/aurora";
import { StyleRotator } from "@/components/auth/style-rotator";
import { PoweredByContles } from "@/components/marketing/powered-by-contles";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.05fr]">
      {/* form side */}
      <div className="relative flex min-h-screen flex-col">
        <main className="relative flex flex-1 items-center justify-center px-6 py-14">{children}</main>
        <footer className="relative flex items-center justify-between px-8 py-6 text-xs text-[var(--color-fg-subtle)]">
          <span>
            © {new Date().getFullYear()}{" "}
            <Link href="/" className="hover:text-[var(--color-fg-muted)]">
              Capto
            </Link>
          </span>
          <PoweredByContles variant="inline" />
        </footer>
      </div>

      {/* visual side, desktop only */}
      <aside className="relative hidden flex-col justify-between overflow-hidden border-l border-white/[0.06] bg-[var(--color-bg-elev)] p-12 lg:flex">
        <Aurora preset="cta" />
        <div className="relative z-10 eyebrow">Made with Capto</div>

        <div className="relative z-10 flex flex-1 items-center justify-center">
          <StyleRotator />
        </div>

        <figure className="relative z-10 max-w-sm">
          <blockquote className="text-[15px] leading-relaxed text-white">
            &ldquo;Replaced Submagic and Descript. Captions that look designed, at a price that
            doesn&rsquo;t sting.&rdquo;
          </blockquote>
          <figcaption className="mt-3 text-xs text-[var(--color-fg-subtle)]">Pieter V., Head of Content</figcaption>
        </figure>
      </aside>
    </div>
  );
}
