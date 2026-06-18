import * as React from "react";
import { cn } from "@/lib/utils";

const fieldBase =
  "w-full rounded-[var(--radius-md)] border border-white/[0.12] bg-white/[0.06] text-[15px] text-[var(--color-fg)] placeholder:text-[var(--color-fg-subtle)] outline-none transition-colors duration-[var(--dur-fast)] hover:bg-white/[0.08] focus:border-white/30 focus:bg-white/[0.08] focus:ring-2 focus:ring-white/10";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return <input ref={ref} className={cn(fieldBase, "h-11 px-3.5", className)} {...rest} />;
  },
);

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...rest }, ref) {
    return <textarea ref={ref} className={cn(fieldBase, "min-h-[100px] px-3.5 py-3 resize-y", className)} {...rest} />;
  },
);
