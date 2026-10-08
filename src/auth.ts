import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { db, schema } from "@/lib/db";

// PRD "Privacy, security and data handling" — Access: sign-in restricted to
// company accounts, two roles in v1 (operator, reader).
const ALLOWED_DOMAIN = process.env.ALLOWED_GOOGLE_DOMAIN ?? "elevatepay.com";
const OPERATOR_EMAILS = (process.env.OPERATOR_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export type Role = "operator" | "reader";

function roleFor(email: string): Role {
  return OPERATOR_EMAILS.includes(email.toLowerCase()) ? "operator" : "reader";
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [Google],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      const email = user.email.toLowerCase();
      const domain = email.split("@")[1];
      if (domain !== ALLOWED_DOMAIN.toLowerCase()) return false;

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
