import * as React from "react";
import { redirect } from "next/navigation";
import { AppNav, MobileTopBar, MobileBottomNav } from "@/components/app/app-nav";
import { getCurrentSession } from "@/lib/session";
import { isConfigured } from "@/lib/env";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentSession();
  // Server-side auth gate (replaces edge middleware, which OpenNext can't run).
  // Only enforce once auth is actually configured, so local dev without a DB
  // can still open these routes.
  if (isConfigured.auth() && isConfigured.db() && !session?.user) {
    redirect("/signin");
  }
  const userName = session?.user?.name || undefined;
  const userEmail = session?.user?.email || undefined;
  const userImage = session?.user?.image || undefined;

  return (
    <div className="min-h-screen flex">
      <AppNav userName={userName} userEmail={userEmail} userImage={userImage} />
      <div className="flex-1 flex flex-col min-w-0">
        <MobileTopBar userName={userName} />
        <main className="flex-1 pb-20 lg:pb-0">{children}</main>
        <MobileBottomNav />
      </div>
    </div>
  );
}
