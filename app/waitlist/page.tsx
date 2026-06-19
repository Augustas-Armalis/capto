import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Aurora } from "@/components/marketing/aurora";
import { PoweredByContles } from "@/components/marketing/powered-by-contles";
import { WaitlistForm } from "./waitlist-form";

export const metadata: Metadata = {
  title: "Join the waitlist",
  description: "Be first to caption with Capto. Join the waitlist for early access and launch pricing.",
  alternates: { canonical: "/waitlist" },
};

export default function WaitlistPage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-16">
      <Aurora preset="hero" className="-z-10" />
      <div className="relative w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <Link href="/" className="mb-6">
            <Image src="/wordmark.png" alt="Capto" width={120} height={36} className="h-8 w-auto" priority />
          </Link>
          <span className="eyebrow rounded-[var(--radius-pill)] border border-white/10 bg-white/[0.04] px-3 py-1 backdrop-blur-md">
            Early access
          </span>
          <h1 className="display mt-5 text-balance text-4xl text-white sm:text-5xl">
            Caption first. <span className="text-magic">Get in early.</span>
          </h1>
          <p className="mt-4 max-w-sm text-[var(--color-fg-muted)]">
            Capto is rolling out to creators in waves. Drop your name and email to claim a spot and
            lock in launch pricing.
          </p>
        </div>

        <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-7 sm:p-8">
          <WaitlistForm />
        </div>

        <div className="mt-6 flex items-center justify-center gap-4 text-sm text-[var(--color-fg-subtle)]">
          <Link href="/" className="hover:text-[var(--color-fg-muted)]">Back home</Link>
          <span className="opacity-40">·</span>
          <PoweredByContles variant="inline" />
        </div>
      </div>
    </main>
  );
}
