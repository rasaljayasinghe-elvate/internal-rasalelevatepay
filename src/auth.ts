import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db, schema } from "@/lib/db";

// Company-domain emails only; operators listed in OPERATOR_EMAILS.
const ALLOWED_DOMAIN = process.env.ALLOWED_EMAIL_DOMAIN ??
  process.env.ALLOWED_GOOGLE_DOMAIN ??
  "elevatepay.com";
const OPERATOR_EMAILS = (process.env.OPERATOR_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export type Role = "operator" | "reader";

function roleFor(email: string): Role {
  return OPERATOR_EMAILS.includes(email.toLowerCase()) ? "operator" : "reader";
}

function isAllowedEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  const domain = normalized.split("@")[1];
  return Boolean(domain && domain === ALLOWED_DOMAIN.toLowerCase());
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        const password = String(credentials?.password ?? "");
        const expected = process.env.AUTH_PASSWORD;

        if (!email || !password || !expected) return null;
        if (!isAllowedEmail(email)) return null;
        if (password !== expected) return null;

        const name = email.split("@")[0] ?? email;
        return { id: email, email, name };
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email || !isAllowedEmail(user.email)) return false;

      const email = user.email.toLowerCase();
      const role = roleFor(email);
      await db
        .insert(schema.operators)
        .values({ id: email, email, name: user.name, role })
        .onConflictDoUpdate({
          target: schema.operators.id,
          set: { name: user.name, role },
        });
      return true;
    },
    async session({ session }) {
      if (session.user?.email) {
        (session.user as typeof session.user & { role: Role }).role = roleFor(session.user.email);
      }
      return session;
    },
  },
  pages: {
    signIn: "/sign-in",
  },
});

export async function getSessionUser() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return null;
  return { email: email.toLowerCase(), name: session.user?.name ?? null, role: roleFor(email) };
}

/** Readers (manager, engineering) can view everything but not change it. */
export async function requireOperator() {
  const user = await getSessionUser();
  if (!user || user.role !== "operator") {
    throw new Error("Only operators can do this.");
  }
  return user;
}
