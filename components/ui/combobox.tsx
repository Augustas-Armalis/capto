"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export type ComboOption = { value: string; label: string; hint?: string };

/**
 * Capto's custom dropdown — a styled, searchable, keyboard-navigable select.
 * Replaces native <select> everywhere for a consistent look. No external deps.
 */
export function Combobox({
  value,
  onChange,
  options,
  placeholder = "Select…",
  searchable = true,
  className,
  size = "md",
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  options: ComboOption[];
  placeholder?: string;
  searchable?: boolean;
  className?: string;
  size?: "sm" | "md";
  ariaLabel?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [active, setActive] = React.useState(0);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value);
  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q));
  }, [options, query]);

  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  React.useEffect(() => {
    if (open) {
      setQuery("");
      setActive(Math.max(0, options.findIndex((o) => o.value === value)));
      if (searchable) setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open, searchable, options, value]);

  const choose = (v: string) => {
    onChange(v);
    setOpen(false);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(filtered.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[active]) choose(filtered[active].value);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const trigger = size === "sm" ? "px-2.5 py-1.5 text-xs" : "px-3 py-2.5 text-sm";

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-[var(--radius-md)] border border-white/10 bg-white/[0.03] text-left text-white outline-none transition-colors hover:border-white/20 focus:border-white/25",
          trigger,
        )}
      >
        <span className={cn("truncate", !selected && "text-[var(--color-fg-subtle)]")}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronsUpDown className="size-3.5 shrink-0 text-[var(--color-fg-subtle)]" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1.5 w-full overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elev)] shadow-[var(--shadow-pop)]">
          {searchable && (
            <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-3 py-2">
              <Search className="size-3.5 shrink-0 text-[var(--color-fg-subtle)]" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                onKeyDown={onKey}
                placeholder="Search…"
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-[var(--color-fg-subtle)]"
              />
            </div>
          )}
          <div className="max-h-60 overflow-y-auto p-1" role="listbox">
            {filtered.length === 0 && (
              <div className="px-3 py-3 text-center text-xs text-[var(--color-fg-subtle)]">No matches</div>
            )}
            {filtered.map((o, i) => {
              const isSel = o.value === value;
              return (
                <button
                  key={o.value}
                  type="button"
                  role="option"
                  aria-selected={isSel}
                  onClick={() => choose(o.value)}
                  onMouseEnter={() => setActive(i)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-[var(--radius-sm)] px-2.5 py-2 text-left text-sm transition-colors",
                    i === active ? "bg-white/[0.06] text-white" : "text-[var(--color-fg-muted)]",
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">
                    {o.label}
                    {o.hint && <span className="ml-2 text-xs text-[var(--color-fg-subtle)]">{o.hint}</span>}
                  </span>
                  {isSel && <Check className="size-4 shrink-0 text-[var(--color-brand)]" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
