import * as React from "react";
import { AppNav, MobileTopBar, MobileBottomNav } from "@/components/app/app-nav";
import { getCurrentSession } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentSession();
  const userName = session?.user?.name || undefined;
  const userEmail = session?.user?.email || undefined;

  return (
    <div className="min-h-screen flex">
      <AppNav userName={userName} userEmail={userEmail} />
      <div className="flex-1 flex flex-col min-w-0">
        <MobileTopBar userName={userName} />
        <main className="flex-1 pb-20 lg:pb-0">{children}</main>
        <MobileBottomNav />
      </div>
    </div>
  );
}
