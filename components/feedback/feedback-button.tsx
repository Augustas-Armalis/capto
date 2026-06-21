"use client";

import * as React from "react";
import { MessageSquarePlus, Bug, Lightbulb, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Kind = "bug" | "idea";

type Props = {
  /** "fixed" renders a bottom-left floating pill (app pages); "inline" renders a quiet link. */
  variant?: "fixed" | "inline";
  /** Prefill the reply email (e.g. the signed-in account email). */
  userEmail?: string;
  className?: string;
};

export function FeedbackButton({ variant = "fixed", userEmail, className }: Props) {
  const [open, setOpen] = React.useState(false);

  const trigger =
    variant === "inline" ? (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex items-center gap-1.5 text-xs text-[var(--color-fg-subtle)] transition-colors hover:text-[var(--color-fg-muted)]",
          className,
        )}
      >
        <MessageSquarePlus className="size-3.5" />
        Leave feedback
      </button>
    ) : (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "fixed bottom-5 left-5 z-40 inline-flex items-center gap-2 rounded-[var(--radius-pill)] border border-white/[0.12] bg-[var(--color-bg-elev)]/90 px-4 py-2.5 text-[13px] font-medium text-[var(--color-fg-muted)] shadow-[0_8px_30px_-12px_rgba(0,0,0,0.6)] backdrop-blur transition-colors hover:border-white/25 hover:text-white",
          className,
        )}
        aria-haspopup="dialog"
      >
        <MessageSquarePlus className="size-4" />
        Leave feedback
      </button>
    );

  return (
    <>
      {trigger}
      {open ? <FeedbackDialog userEmail={userEmail} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function FeedbackDialog({ userEmail, onClose }: { userEmail?: string; onClose: () => void }) {
  const [kind, setKind] = React.useState<Kind>("bug");
  const [message, setMessage] = React.useState("");
  const [email, setEmail] = React.useState(userEmail ?? "");
  const [status, setStatus] = React.useState<"idle" | "sending" | "done" | "error">("idle");
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Focus the textarea on open and close on Escape.
  React.useEffect(() => {
    textareaRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Auto-close shortly after a successful send.
  React.useEffect(() => {
    if (status !== "done") return;
    const t = setTimeout(onClose, 1400);
    return () => clearTimeout(t);
  }, [status, onClose]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (message.trim().length < 5 || status === "sending") return;
    setStatus("sending");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind,
          message: message.trim(),
          email: email.trim() || undefined,
          page: typeof window !== "undefined" ? window.location.pathname : undefined,
        }),
      });
      if (!res.ok) throw new Error("failed");
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-start p-4 sm:items-end sm:justify-start"
      role="dialog"
      aria-modal="true"
      aria-label="Leave feedback"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close feedback"
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
      />

      <div className="relative w-full max-w-sm rounded-[var(--radius-xl)] border border-white/[0.1] bg-[var(--color-bg-elev)] p-5 shadow-[0_24px_70px_-20px_rgba(0,0,0,0.8)] sm:mb-4 sm:ml-2">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 inline-flex size-7 items-center justify-center rounded-[var(--radius-md)] text-[var(--color-fg-subtle)] transition-colors hover:bg-white/[0.06] hover:text-white"
        >
          <X className="size-4" />
        </button>

        {status === "done" ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <span className="inline-flex size-11 items-center justify-center rounded-full bg-[var(--color-success)]/15 text-[var(--color-success)]">
              <Check className="size-5" />
            </span>
            <p className="text-[15px] font-medium text-[var(--color-fg)]">Thanks — got it.</p>
            <p className="text-[13px] text-[var(--color-fg-muted)]">We read every note.</p>
          </div>
        ) : (
          <form onSubmit={submit}>
            <h2 className="text-[15px] font-semibold text-[var(--color-fg)]">Leave feedback</h2>
            <p className="mt-1 text-[13px] text-[var(--color-fg-muted)]">
              Found a bug or have an idea? Tell the founder directly.
            </p>

            {/* Segmented kind toggle */}
            <div
              role="radiogroup"
              aria-label="Feedback type"
              className="mt-4 grid grid-cols-2 gap-1.5 rounded-[var(--radius-md)] border border-white/[0.1] bg-white/[0.04] p-1"
            >
              <KindTab active={kind === "bug"} onClick={() => setKind("bug")} icon={<Bug className="size-3.5" />} label="Bug" />
              <KindTab
                active={kind === "idea"}
                onClick={() => setKind("idea")}
                icon={<Lightbulb className="size-3.5" />}
                label="Idea"
              />
            </div>

            <Textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={4000}
              placeholder="What's on your mind?"
              className="mt-3 min-h-[110px] text-sm"
              aria-label="Your message"
            />

            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email (optional, for a reply)"
              className="mt-2.5 h-10 text-sm"
              aria-label="Reply email"
            />

            {status === "error" ? (
              <p className="mt-2 text-[13px] text-[var(--color-danger)]">
                Couldn&apos;t send that — please try again.
              </p>
            ) : null}

            <div className="mt-4 flex items-center justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                loading={status === "sending"}
                disabled={message.trim().length < 5}
              >
                Send
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function KindTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-1.5 text-[13px] font-medium transition-colors",
        active
          ? "bg-white text-black"
          : "text-[var(--color-fg-muted)] hover:bg-white/[0.06] hover:text-white",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
