import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({
  className,
  glass: glassy = false,
  hover = false,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { glass?: boolean; hover?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-xl)]",
        glassy ? "glass" : "border border-white/[0.06] bg-white/[0.02]",
        hover && "transition-colors duration-[var(--dur-base)] ease-[var(--ease-out)] hover:bg-white/[0.04] hover:border-white/[0.1]",
        className,
      )}
      {...rest}
    />
  );
}
