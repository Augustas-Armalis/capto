import { headers } from "next/headers";
import { getAuth } from "./auth";
import { isConfigured } from "./env";

export async function getCurrentSession() {
  if (!isConfigured.db() || !isConfigured.auth()) return null;
  try {
    const auth = getAuth();
    const hdrs = await headers();
    const session = await auth.api.getSession({ headers: hdrs });
    return session;
  } catch {
    return null;
  }
}
