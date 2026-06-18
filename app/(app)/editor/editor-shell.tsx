"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Monitor, Smartphone, ExternalLink, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PoweredByContles } from "@/components/marketing/powered-by-contles";

export function EditorShell() {
  const [isNarrow, setIsNarrow] = React.useState(false);
  const [proceedMobile, setProceedMobile] = React.useState(false);

  React.useEffect(() => {
    const check = () => setIsNarrow(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (isNarrow && !proceedMobile) {
    return (
      <div className="min-h-screen flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-md rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-7 text-center">
          <div className="mx-auto inline-flex size-14 items-center justify-center rounded-2xl bg-[var(--color-brand)]/15 text-[var(--color-brand)]">
            <Monitor className="size-7" />
          </div>
          <h1 className="heading mt-5 text-2xl ">
            Best on desktop.
          </h1>
          <p className="mt-3 text-sm text-[var(--color-fg-muted)] leading-relaxed">
            The Capto editor is built for a real timeline, drag, trim, multi-row,
            millisecond precision. It works on phones, but you'll have a much better time on a
            laptop or desktop.
          </p>
          <div className="mt-7 space-y-2">
            <Button
              onClick={() => setProceedMobile(true)}
              variant="secondary"
              size="md"
              className="w-full"
            >
              <Smartphone className="size-4" />
              Continue on mobile anyway
            </Button>
            <Button href="/dashboard" variant="ghost" size="md" className="w-full">
              <ArrowLeft className="size-4" />
              Back to dashboard
            </Button>
          </div>
          <div className="mt-5 flex items-center justify-center">
            <PoweredByContles variant="chip" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-0px)] flex flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-bg)]/80 backdrop-blur-xl px-4 py-2">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-elev)]"
          >
            <ArrowLeft className="size-4" />
            Back
          </Link>
          <Badge variant="brand">Editor · Beta</Badge>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/_editor/index.html"
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-1.5 text-xs text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
          >
            Open standalone
            <ExternalLink className="size-3" />
          </a>
          <PoweredByContles variant="chip" />
        </div>
      </div>
      <div className="flex items-center gap-2 border-b border-[var(--color-warning)]/20 bg-[var(--color-warning)]/10 px-4 py-2 text-xs text-[var(--color-warning)]">
        <Info className="size-3.5 shrink-0" />
        <span>
          Preview build, the captioning backend (upload, transcribe, export) isn't connected on
          the web yet. The UI is fully clickable; processing lands in the next release. For the
          fully-working version today, run the desktop app in{" "}
          <code className="rounded bg-[var(--color-warning)]/15 px-1">legacy/</code>.
        </span>
      </div>
      <div className="relative flex-1 bg-[var(--color-bg)]">
        <iframe
          src="/_editor/index.html"
          title="Capto editor"
          className="absolute inset-0 size-full border-0"
          allow="clipboard-read; clipboard-write; fullscreen"
        />
      </div>
    </div>
  );
}
