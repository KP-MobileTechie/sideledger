import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db),
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    }),
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  session: { strategy: "database" },
});

/**
 * Returns the authenticated user's id, or throws if there is no session.
 *
 * With the database session strategy + Drizzle adapter, `session.user.id` is
 * populated at runtime by the adapter even though the installed `@auth/core`
 * types declare `user.id` as optional (`string | undefined`). The guard below
 * narrows the type and enforces authentication for callers (server actions,
 * dashboard loaders, etc.).
 */
export async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHENTICATED");
  return session.user.id;
}
