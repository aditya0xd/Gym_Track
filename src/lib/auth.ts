import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { decode as decodeJWT, encode as encodeJWT } from "next-auth/jwt";

import type { OwnerSubscriptionPlan } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getCachedOwner,
  setCachedOwner,
  invalidateCachedOwner,
  type CachedOwner,
} from "@/lib/auth-cache";

const REMEMBER_MAX_AGE_SEC = 60 * 60 * 24 * 30; // 30 days
const SESSION_MAX_AGE_SEC = 60 * 60 * 24; // 24 hours

function jwtMaxAge(rememberMe: boolean | undefined): number {
  return rememberMe === false ? SESSION_MAX_AGE_SEC : REMEMBER_MAX_AGE_SEC;
}

export const authOptions: NextAuthOptions = {
  secret:
    process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET ?? "dev-auth-secret",

  session: {
    strategy: "jwt",
    maxAge: REMEMBER_MAX_AGE_SEC,
  },

  cookies: {
    sessionToken: {
      name: "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "strict",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        maxAge: REMEMBER_MAX_AGE_SEC, // cookie ceiling; JWT exp is the real enforcer
      },
    },
  },

  jwt: {
    encode: async ({ token, secret, salt }) => {
      const nowSec = Math.floor(Date.now() / 1000);
      const existingExp = typeof token?.exp === "number" ? token.exp : null;
      // Preserve exp locked at login; never stretch it on re-encode
      const maxAge = existingExp
        ? Math.max(existingExp - nowSec, 1)
        : jwtMaxAge(token?.rememberMe as boolean | undefined);
      return encodeJWT({ token, secret, salt, maxAge });
    },
    decode: decodeJWT,
  },

  pages: { signIn: "/login" },

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

        if (!email || !password) return null;

        // Superadmin check
        const superUser = await prisma.superAdminUser.findUnique({
          where: { email },
        });
        if (superUser) {
          if (!(await compare(password, superUser.passwordHash))) return null;
          return {
            id: superUser.id,
            name: superUser.name,
            email: superUser.email,
            role: "superadmin" as const,
            rememberMe,
          };
        }

        // Gym owner check
        const owner = await prisma.adminUser.findFirst({
          where: { email, deletedAt: null },
        });
        if (!owner) return null;
        if (!(await compare(password, owner.passwordHash))) return null;
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
      // ── Fresh login: lock exp now, never recalculate ────────────────────
      if (user) {
        token.role = user.role === "superadmin" ? "superadmin" : "gym_owner";
        token.rememberMe = Boolean(user.rememberMe);
        token.exp = Math.floor(Date.now() / 1000) + jwtMaxAge(token.rememberMe);
      }

      // ── Gym owner: Redis cache → DB fallback ────────────────────────────
      const ownerId =
        typeof user?.id === "string"
          ? user.id
          : typeof token.sub === "string"
            ? token.sub
            : undefined;

      if (token.role === "gym_owner" && ownerId) {
        // 1. Try Redis first (hot path — no DB on most requests)
        const cached = await getCachedOwner(ownerId);

        if (cached) {
          // Cache hit: hydrate token directly, zero DB calls
          token.accountInvalid = cached.accountInvalid;
          token.subscriptionPlan = cached.subscriptionPlan;
          token.trialEndsAt = cached.trialEndsAt;
        } else {
          // Cache miss: hit DB and repopulate Redis
          const owner = await prisma.adminUser.findFirst({
            where: { id: ownerId, deletedAt: null },
            select: { subscriptionPlan: true, trialEndsAt: true },
          });

          const data: CachedOwner = owner
            ? {
                accountInvalid: false,
                subscriptionPlan: owner.subscriptionPlan,
                trialEndsAt: owner.trialEndsAt?.toISOString() ?? null,
              }
            : {
                accountInvalid: true,
                subscriptionPlan: "TRIAL",
                trialEndsAt: null,
              };

          await setCachedOwner(ownerId, data);

          token.accountInvalid = data.accountInvalid;
          token.subscriptionPlan = data.subscriptionPlan;
          token.trialEndsAt = data.trialEndsAt;
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

      // Derive session.expires from the locked JWT exp
      const expMs =
        typeof token.exp === "number"
          ? token.exp * 1000
          : Date.now() +
            jwtMaxAge(token.rememberMe as boolean | undefined) * 1000;
      session.expires = new Date(expMs).toISOString();

      return session;
    },
  },
};
