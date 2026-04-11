import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { decode as decodeJWT, encode as encodeJWT } from "next-auth/jwt";

import type { OwnerSubscriptionPlan } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/** Browser cookie max-age ceiling; JWT lifetime is enforced in jwt.encode below. */
const REMEMBER_MAX_AGE_SEC = 60 * 60 * 24 * 30;
const SESSION_MAX_AGE_SEC = 60 * 60 * 24;

function jwtMaxAgeSeconds(token: Record<string, unknown> | undefined): number {
  if (token?.rememberMe === true) return REMEMBER_MAX_AGE_SEC;
  if (token?.rememberMe === false) return SESSION_MAX_AGE_SEC;
  // Tokens issued before rememberMe existed: keep prior ~30d behavior.
  return REMEMBER_MAX_AGE_SEC;
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET ?? "dev-auth-secret",
  session: {
    strategy: "jwt",
    maxAge: REMEMBER_MAX_AGE_SEC,
  },
  jwt: {
    encode: async ({ token, secret, salt }) =>
      encodeJWT({
        token,
        secret,
        salt,
        maxAge: jwtMaxAgeSeconds(token),
      }),
    decode: decodeJWT,
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        rememberMe: { label: "Remember me", type: "text" },
      },
      async authorize(credentials) {
        const email =
          typeof credentials?.email === "string"
            ? credentials.email.toLowerCase().trim()
            : "";
        const password =
          typeof credentials?.password === "string" ? credentials.password : "";
        const rememberMe = credentials?.rememberMe === "true";

        if (!email || !password) {
          return null;
        }

        const superUser = await prisma.superAdminUser.findUnique({
          where: { email },
        });
        if (superUser) {
          const ok = await compare(password, superUser.passwordHash);
          if (!ok) return null;
          return {
            id: superUser.id,
            name: superUser.name,
            email: superUser.email,
            role: "superadmin" as const,
            rememberMe,
          };
        }

        const owner = await prisma.adminUser.findFirst({
          where: { email, deletedAt: null },
        });
        if (!owner) return null;
        const ok = await compare(password, owner.passwordHash);
        if (!ok) return null;
        return {
          id: owner.id,
          name: owner.name,
          email: owner.email,
          role: "gym_owner" as const,
          rememberMe,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role === "superadmin" ? "superadmin" : "gym_owner";
        token.rememberMe = Boolean(user.rememberMe);
      }
      const ownerId =
        typeof user?.id === "string"
          ? user.id
          : typeof token.sub === "string"
            ? token.sub
            : undefined;
      if (token.role === "gym_owner" && ownerId) {
        const owner = await prisma.adminUser.findFirst({
          where: { id: ownerId, deletedAt: null },
          select: { subscriptionPlan: true, trialEndsAt: true },
        });
        if (!owner) {
          token.accountInvalid = true;
        } else {
          token.accountInvalid = false;
          token.subscriptionPlan = owner.subscriptionPlan;
          token.trialEndsAt = owner.trialEndsAt?.toISOString() ?? null;
        }
      } else {
        token.accountInvalid = false;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = typeof token.sub === "string" ? token.sub : "";
        session.user.role =
          token.role === "superadmin" ? "superadmin" : "gym_owner";
        session.user.accountInvalid = token.accountInvalid === true;
        if (session.user.role === "gym_owner") {
          session.user.subscriptionPlan =
            typeof token.subscriptionPlan === "string"
              ? (token.subscriptionPlan as OwnerSubscriptionPlan)
              : "TRIAL";
          session.user.trialEndsAt =
            typeof token.trialEndsAt === "string" || token.trialEndsAt === null
              ? (token.trialEndsAt as string | null)
              : null;
        }
      }
      const maxAgeMs = jwtMaxAgeSeconds(token as Record<string, unknown>) * 1000;
      session.expires = new Date(Date.now() + maxAgeMs).toISOString();
      return session;
    },
  },
};
