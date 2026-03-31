import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";

import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET ?? "dev-auth-secret",
  session: {
    strategy: "jwt",
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
      },
      async authorize(credentials) {
        const email =
          typeof credentials?.email === "string"
            ? credentials.email.toLowerCase().trim()
            : "";
        const password =
          typeof credentials?.password === "string" ? credentials.password : "";

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
          };
        }

        const owner = await prisma.adminUser.findUnique({ where: { email } });
        if (!owner) return null;
        const ok = await compare(password, owner.passwordHash);
        if (!ok) return null;
        return {
          id: owner.id,
          name: owner.name,
          email: owner.email,
          role: "gym_owner" as const,
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
