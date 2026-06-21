// Who counts as a Capto admin. Admins get the /admin panel, full (ultra) access,
// and the data exports. Add more emails here (or via the ADMIN_EMAILS env var,
// comma-separated) without touching the gates.
const BUILTIN_ADMINS = ["trycapto@gmail.com", "augustas.armalis@aiacquisition.com"];

export const ADMIN_EMAILS: string[] = Array.from(
  new Set(
    [...BUILTIN_ADMINS, ...(process.env.ADMIN_EMAILS ?? "").split(",")]
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  ),
);

export function isAdmin(email?: string | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}
