import type { Metadata } from "next";
import { EditorShell } from "./editor-shell";

export const metadata: Metadata = {
  title: "Editor",
  description: "Drop a video, caption it, ship it.",
};

export default function EditorRoute() {
  return <EditorShell />;
}
