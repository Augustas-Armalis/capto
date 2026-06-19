"use client";

import * as React from "react";

/**
 * A tiny crisp circle that trails the cursor and cycles brand colors. Over
 * interactive elements it eases up to a larger, softer, translucent ring.
 * Marketing pages only. Hidden on touch / reduced-motion.
 */
export function CursorGlow() {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(hover: none)").matches) return;
    const el = ref.current;
    if (!el) return;

    let raf = 0;
    let tx = 0;
    let ty = 0;
    let x = 0;
    let y = 0;
    let scale = 1;
    let targetScale = 1;
    let alpha = 0;
    let targetAlpha = 0;
    let seeded = false;

    const isInteractive = (t: EventTarget | null) =>
      !!(
        t instanceof Element &&
        t.closest('a, button, [role="button"], input, textarea, select, label, summary, .cursor-grow')
      );

    const onMove = (e: MouseEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      if (!seeded) {
        x = tx;
        y = ty;
        seeded = true;
      }
      const hover = isInteractive(e.target);
      targetScale = hover ? 2.8 : 1;
      targetAlpha = hover ? 0.4 : 1;
      el.dataset.hover = hover ? "1" : "0";
    };
    const onLeave = () => {
      targetAlpha = 0;
    };

    const loop = () => {
      // Lower factor = more delay / smoother trail.
      x += (tx - x) * 0.16;
      y += (ty - y) * 0.16;
      scale += (targetScale - scale) * 0.18;
      alpha += (targetAlpha - alpha) * 0.2;
      el.style.transform = `translate3d(${x - 6}px, ${y - 6}px, 0) scale(${scale.toFixed(3)})`;
      el.style.opacity = alpha.toFixed(3);
      raf = requestAnimationFrame(loop);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseleave", onLeave);
    raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="cursor-dot pointer-events-none fixed left-0 top-0 z-[60] size-3 rounded-full opacity-0"
    />
  );
}
