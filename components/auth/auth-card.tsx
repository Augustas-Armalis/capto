import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

/** Clean, borderless auth column, no heavy box. */
export function AuthCard({
  title,
  subtitle,
  footer,
  children,
  className,
}: {
  title: string;
  subtitle: React.ReactNode;
  footer: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("w-full max-w-[380px]", className)}>
      <Link href="/" className="inline-flex items-center">
        <Image src="/wordmark.png" alt="Capto" width={122} height={36} className="h-8 w-auto" />
      </Link>
      <h1 className="display mt-8 text-3xl text-white">{title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-[var(--color-fg-muted)]">{subtitle}</p>
      <div className="mt-8">{children}</div>
      <div className="mt-8 text-sm text-[var(--color-fg-muted)]">{footer}</div>
    </div>
  );
}
