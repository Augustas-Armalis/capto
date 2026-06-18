import type { Metadata } from "next";
import { SettingsClient } from "./settings-client";
import { getCurrentSession } from "@/lib/session";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const session = await getCurrentSession();
  return (
    <SettingsClient
      name={session?.user?.name || ""}
      email={session?.user?.email || ""}
    />
  );
}
