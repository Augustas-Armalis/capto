"use client";

import * as React from "react";

// A reel clip for the "Made with Capto" marquee.
//   • Light H.264 MP4 (hardware-decoded → many can run at once) + a poster JPG,
//     so a not-yet-loaded or paused clip shows a still frame, never a black box.
//   • PLAY only while near the viewport, PAUSE when it scrolls away. Pausing a
//     loaded <video> just freezes the current frame — no reload/black-out (that
//     bug came from REMOUNTING, which the stateless Marquee no longer does).
//     This caps how many clips decode at once, so the browser never evicts/blanks
//     one when the row is wide (the "randomly disappeared" symptom).
//   • muted + loop so autoplay is allowed and it runs forever.
//   • onError → soft gradient fallback instead of a broken box.
export function VideoReel({ src, index = 0 }: { src: string; index?: number }) {
  const ref = React.useRef<HTMLVideoElement | null>(null);
  const [broken, setBroken] = React.useState(false);
  const poster = `/videos/posters/${src.replace(/\.[^.]+$/, "")}.jpg`;

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
            v.pause(); // freezes on the current frame — no reload
          }
        }
      },
      { rootMargin: "150px" },
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
          poster={poster}
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
