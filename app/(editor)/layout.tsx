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
  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {/* Display fonts for the caption Style tab (canvas renders these directly,
          so they must be loadable). Mirrors the original Subby font set. */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Anton&family=Archivo+Black&family=Bebas+Neue&family=Inter:wght@400;500;600;700;800;900&family=Lato:wght@400;700;900&family=Montserrat:wght@400;600;700;800;900&family=Oswald:wght@400;600;700&family=Poppins:wght@400;500;600;700;800&display=swap"
      />
      {children}
    </div>
  );
}
