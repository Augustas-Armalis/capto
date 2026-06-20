import type { Metadata } from "next";
import { JoinClient } from "./join-client";

export const metadata: Metadata = { title: "Join a team" };
export const dynamic = "force-dynamic";

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return <JoinClient token={token ?? ""} />;
}
