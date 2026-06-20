import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Editor",
  description: "Drop a video, caption it, ship it.",
};

export const dynamic = "force-dynamic";

// The editor IS the original Subby app (home + editor), served verbatim from
// /public/studio and wired to Capto's web backend by capto-bridge.js. We mount
// it full-screen in an iframe so Subby's CSS/JS run untouched and isolated from
// the Capto marketing/app styles. Auth is enforced by the (editor) layout.
export default function EditorRoute() {
  return (
    <iframe
      src="/studio/index.html"
      title="Capto editor"
      className="block h-[100dvh] w-full border-0"
      allow="clipboard-write; fullscreen"
    />
  );
}
