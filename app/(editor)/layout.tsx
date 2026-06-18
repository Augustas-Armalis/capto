import * as React from "react";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/session";
import { isConfigured } from "@/lib/env";

// The editor runs full-screen, without the app shell's side nav, so the
// timeline + preview get the whole viewport. Same server-side auth gate as the
// rest of the app (OpenNext can't run edge middleware).
export default async function EditorLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentSession();
  if (isConfigured.auth() && isConfigured.db() && !session?.user) {
    redirect("/signin");
  }
  return <div className="min-h-screen bg-[var(--color-bg)]">{children}</div>;
}
