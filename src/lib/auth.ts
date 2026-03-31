import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";

import { AUTH_PORTALS } from "@/lib/constants/billing";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET ?? "dev-auth-secret",
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/owner/login",
  },
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        portal: { label: "Portal", type: "text" },
      },
      async authorize(credentials) {
        const email =
          typeof credentials?.email === "string"
            ? credentials.email.toLowerCase().trim()
            : "";
        const password =
          typeof credentials?.password === "string" ? credentials.password : "";
        const portalRaw =
          typeof credentials?.portal === "string" ? credentials.portal.trim() : "";
        const portal =
          portalRaw === AUTH_PORTALS.SUPERADMIN
            ? AUTH_PORTALS.SUPERADMIN
            : AUTH_PORTALS.GYM_OWNER;

        if (!email || !password) {
          return null;
        }

        if (portal === AUTH_PORTALS.SUPERADMIN) {
          const user = await prisma.superAdminUser.findUnique({ where: { email } });
          if (!user) return null;
          const ok = await compare(password, user.passwordHash);
          if (!ok) return null;
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: "superadmin",
          };
        }

        const user = await prisma.adminUser.findUnique({ where: { email } });
        if (!user) return null;
        const ok = await compare(password, user.passwordHash);
        if (!ok) return null;
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: "gym_owner",
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role === "superadmin" ? "superadmin" : "gym_owner";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = typeof token.sub === "string" ? token.sub : "";
        session.user.role =
          token.role === "superadmin" ? "superadmin" : "gym_owner";
      }
      return session;
    },
  },
};
