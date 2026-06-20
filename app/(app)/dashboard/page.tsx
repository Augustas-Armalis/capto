import { redirect } from "next/navigation";

// The home + project library now live inside the Subby editor app (served at
// /editor). Send the old dashboard route straight there so there's a single,
// Subby-faithful home — drop a video and you're in the editor with it.
export const dynamic = "force-dynamic";

export default function DashboardPage() {
  redirect("/editor");
}
