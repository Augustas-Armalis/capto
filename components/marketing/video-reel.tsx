"use client";

import * as React from "react";

// A reel clip that loads once and then just loops — no pause/resume churn.
//   • preload="metadata" + start playing the FIRST time it nears the viewport,
//     then stop observing, so it never gets paused → reloaded → restarted
//     (that black-out-and-replay was the bug on hover/scroll).
//   • muted + loop so autoplay is allowed and it runs forever.
//   • onError → soft gradient fallback (e.g. AV1 on Safari) instead of a broken
//     black box that breaks the row.
export function VideoReel({ src, index = 0 }: { src: string; index?: number }) {
  const ref = React.useRef<HTMLVideoElement | null>(null);
  const [broken, setBroken] = React.useState(false);

  React.useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const p = v.play();
            if (p && typeof p.catch === "function") p.catch(() => {});
            io.unobserve(v); // started — leave it looping, never pause/restart it
          }
        }
      },
      { rootMargin: "400px" },
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);

  const grad = [
    "from-[#2a1840] to-[#0c0612]",
    "from-[#0f2a3a] to-[#04101a]",
    "from-[#1c1840] to-[#0a0818]",
    "from-[#241a06] to-[#0c0a04]",
  ][index % 4];

  return (
    <div
      className={`relative h-[360px] w-[208px] shrink-0 overflow-hidden rounded-[var(--radius-lg)] border border-white/[0.08] bg-gradient-to-b ${grad}`}
    >
      {!broken && (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video
          ref={ref}
          src={`/videos/${src}`}
          muted
          loop
          playsInline
          preload="metadata"
          disablePictureInPicture
          tabIndex={-1}
          onError={() => setBroken(true)}
          className="absolute inset-0 size-full object-cover [backface-visibility:hidden]"
        />
      )}
    </div>
  );
}
