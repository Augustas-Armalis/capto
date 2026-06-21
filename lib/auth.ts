import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { eq } from "drizzle-orm";
import { getDb, user as userTable } from "./db";
import { env, isConfigured } from "./env";
import { isAdmin } from "./admin";

function buildAuth() {
  return betterAuth({
    database: drizzleAdapter(getDb(), { provider: "pg" }),
    baseURL: env.authUrl,
    secret: env.authSecret,
    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
      minPasswordLength: 8,
    },
    user: {
      // Let users change their own email from Settings (direct change — no
      // verification step, since Capto's pay-first accounts start unverified).
      changeEmail: { enabled: true },
    },
    databaseHooks: {
      user: {
        create: {
          // Admin accounts get full (Ultra) access automatically, so the founder
          // login is "everything unlocked" the moment it's created.
          after: async (u: { id: string; email?: string | null }) => {
            try {
              if (isAdmin(u.email)) {
                await getDb().update(userTable).set({ plan: "ultra" }).where(eq(userTable.id, u.id));
              }
            } catch { /* non-fatal */ }
          },
        },
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
    },
  });
}

let _auth: ReturnType<typeof buildAuth> | null = null;

export function getAuth() {
  if (_auth) return _auth;
  if (!isConfigured.db() || !isConfigured.auth()) {
    throw new Error(
      "Auth not configured. Set DATABASE_URL and BETTER_AUTH_SECRET in .env (see .env.example).",
    );
  }
  _auth = buildAuth();
  return _auth;
}

export type Auth = ReturnType<typeof buildAuth>;
