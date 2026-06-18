import * as React from "react";
import { cn } from "@/lib/utils";

export function Container({
  className,
  children,
  size = "default",
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { size?: "narrow" | "default" | "wide" }) {
  const sizes = {
    narrow: "max-w-3xl",
    default: "max-w-6xl",
    wide: "max-w-7xl",
  };
  return (
    <div className={cn("mx-auto w-full px-5 sm:px-6 lg:px-8", sizes[size], className)} {...rest}>
      {children}
    </div>
  );
}
