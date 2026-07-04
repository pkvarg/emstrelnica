import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import argon2 from "argon2";

declare module "next-auth" {
  interface User {
    role: "admin" | "member";
    status: string;
    locale: string;
  }
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: "admin" | "member";
      status: string;
      locale: string;
    };
  }
}

/**
 * Shared credential validator. Used by both the credentials provider's
 * `authorize` callback and by the admin-OTP flow so the "verified password +
 * eligible user" check lives in exactly one place.
 */
export async function validateAdminCredentials(
  login: string,
  password: string,
): Promise<{
  id: string;
  email: string;
  name: string;
  role: "admin" | "member";
  status: string;
  locale: string;
} | null> {
  const [user] = await db
    .select()
    .from(users)
    .where(or(eq(users.email, login), eq(users.phoneE164, login)))
    .limit(1);

  if (!user) return null;
  if (!user.passwordHash) return null;
  if (user.status !== "active" && user.status !== "pending_verification")
    return null;

  const valid = await argon2.verify(user.passwordHash, password);
  if (!valid) return null;

  return {
    id: user.id,
    email: user.email,
    name: `${user.firstName} ${user.lastName}`,
    role: user.role as "admin" | "member",
    status: user.status,
    locale: user.locale,
  };
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        login: { label: "Email or phone", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const login = credentials?.login as string | undefined;
        const password = credentials?.password as string | undefined;

        if (!login || !password) return null;

        return await validateAdminCredentials(login, password);
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60,
  },
  pages: {
    signIn: "/prihlasenie",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.status = user.status;
        token.locale = user.locale;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as "admin" | "member";
      session.user.status = token.status as string;
      session.user.locale = token.locale as string;
      return session;
    },
  },
});
