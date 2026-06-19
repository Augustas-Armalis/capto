"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";

// App surfaces that should NOT run smooth scroll (precision tools / no long
// marketing scroll). The editor especially needs its full frame budget.
const NO_SMOOTH = ["/editor", "/dashboard", "/settings", "/billing", "/onboarding"];

/**
 * Lenis smooth scroll on marketing routes only. Disabled when the OS prefers
 * reduced motion or on app/editor surfaces.
 */
export function SmoothScroll() {
  const pathname = usePathname();
  const enabled = !NO_SMOOTH.some((p) => pathname === p || pathname.startsWith(p + "/"));

  React.useEffect(() => {
    if (!enabled) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({
      duration: 1.05,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.5,
    });

    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    // Smooth in-page anchor jumps too
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement)?.closest?.('a[href^="#"]') as HTMLAnchorElement | null;
      if (!a) return;
      const id = a.getAttribute("href");
      if (!id || id === "#") return;
      const el = document.querySelector(id);
      if (el) {
        e.preventDefault();
        lenis.scrollTo(el as HTMLElement, { offset: -80 });
      }
    };
    document.addEventListener("click", onClick);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("click", onClick);
      lenis.destroy();
    };
  }, [enabled]);

  return null;
}
