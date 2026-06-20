"use client";

import * as React from "react";

// A reel clip that only decodes/plays while it's near the viewport. The marquee
// renders many duplicated copies for a seamless loop; without this, every copy
// would autoplay at once and stutter. IntersectionObserver keeps only the
// on-screen handful playing, so it stays smooth even with lots of clips.
export function VideoReel({ src }: { src: string }) {
  const ref = React.useRef<HTMLVideoElement | null>(null);

  React.useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const p = v.play();
            if (p && typeof p.catch === "function") p.catch(() => {});
          } else {
            v.pause();
          }
        }
      },
      { rootMargin: "150px" },
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);

  return (
    <div className="relative h-[360px] w-[208px] shrink-0 overflow-hidden rounded-[var(--radius-lg)] border border-white/[0.08] bg-black">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        ref={ref}
        src={`/videos/${src}`}
        muted
        loop
        playsInline
        preload="metadata"
        disablePictureInPicture
        tabIndex={-1}
        className="absolute inset-0 size-full object-cover [transform:translateZ(0)] [backface-visibility:hidden]"
      />
    </div>
  );
}
