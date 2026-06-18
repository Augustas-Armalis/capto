"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Wraps a card so a soft brand glow follows the cursor inside it.
 * Pure CSS vars + the `.spotlight` rule in globals, cheap, no re-renders.
 */
export function Spotlight({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  };
  return (
    <div onMouseMove={onMove} className={cn("spotlight", className)} {...rest}>
      {children}
    </div>
  );
}
