"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "up" | "fade" | "blur" | "left" | "right";

/**
 * Scroll-into-view reveal (fade / blur / fly-in). Uses a one-shot
 * IntersectionObserver + CSS transitions instead of a JS animation library, so
 * it adds the motion the landing wants without the bundle weight that made the
 * page feel heavy on load. Respects prefers-reduced-motion.
 */
export function Reveal({
  children,
  variant = "up",
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  variant?: Variant;
  delay?: number;
  className?: string;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [shown, setShown] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -6% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn("reveal", `reveal-${variant}`, shown && "reveal-in", className)}
      style={{ transitionDelay: shown ? `${delay}ms` : "0ms" }}
    >
      {children}
    </div>
  );
}
