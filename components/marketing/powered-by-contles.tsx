import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { CONTLES_URL } from "@/lib/utils";

export function PoweredByContles({ variant = "footer" }: { variant?: "footer" | "inline" | "chip" }) {
  if (variant === "chip") {
    return (
      <a
        href={CONTLES_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="group inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] border border-white/10 bg-white/[0.04] py-1 pl-2 pr-2.5 text-xs font-medium text-[var(--color-fg-muted)] backdrop-blur-md transition-all duration-[var(--dur-fast)] hover:border-white/20 hover:bg-white/[0.07] hover:text-white"
      >
        <Image src="/contles.png" alt="" width={13} height={13} className="shrink-0" />
        <span>Powered by <span className="font-semibold text-white">Contles</span></span>
        <ArrowUpRight className="size-3 opacity-50 transition-all group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </a>
    );
  }

  if (variant === "inline") {
    return (
      <a
        href={CONTLES_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="group inline-flex items-center gap-1 text-xs text-[var(--color-fg-subtle)] transition-colors hover:text-[var(--color-fg-muted)]"
      >
        Built &amp; powered by{" "}
        <span className="font-medium text-[var(--color-fg-muted)] underline-offset-2 group-hover:text-white group-hover:underline">
          Contles
        </span>
      </a>
    );
  }

  // footer, a proper clickable pill
  return (
    <a
      href={CONTLES_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="group inline-flex items-center gap-2 rounded-[var(--radius-pill)] border border-white/10 bg-white/[0.03] py-1.5 pl-2.5 pr-3 text-sm text-[var(--color-fg-muted)] transition-all duration-[var(--dur-fast)] hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
    >
      <Image src="/contles.png" alt="" width={15} height={15} className="shrink-0" />
      <span>Powered by <span className="font-semibold text-white">Contles</span></span>
      <ArrowUpRight className="size-3.5 opacity-50 transition-all group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </a>
  );
}
