"use client";

import * as React from "react";

/**
 * Site-wide scroll reveal (fly up + blur + fade). Server components opt in with
 * `data-reveal` (optionally `style={{ "--d": n }}` to stagger by n × 70ms), or
 * `data-reveal-stagger` on a parent to cascade its direct children.
 *
 * Progressive: nothing is hidden until this mounts and adds `html.js-reveal`,
 * and anything already on screen at that moment is marked in instantly, so
 * there's no flash and no-JS / SEO see everything. Uses a `data-in` attribute
 * (not a class) so React re-renders never strip it.
 */
const SEL = "[data-reveal],[data-reveal-stagger]";

export function RevealObserver() {
  React.useEffect(() => {
    const root = document.documentElement;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            (e.target as HTMLElement).dataset.in = "";
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );

    const seen = new WeakSet<Element>();
    const track = (el: Element, instant: boolean) => {
      if (seen.has(el)) return;
      seen.add(el);
      if (instant) {
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) {
          (el as HTMLElement).dataset.in = "";
          return;
        }
      }
      io.observe(el);
    };

    document.querySelectorAll(SEL).forEach((el) => track(el, true));
    root.classList.add("js-reveal");

    // Client-side navigations mount new sections: pick them up (these animate in).
    const mo = new MutationObserver((muts) => {
      for (const m of muts) {
        m.addedNodes.forEach((n) => {
          if (!(n instanceof Element)) return;
          if (n.matches(SEL)) track(n, false);
          n.querySelectorAll(SEL).forEach((el) => track(el, false));
        });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);

  return null;
}
