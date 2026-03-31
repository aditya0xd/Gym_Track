import { DefaultSession } from "next-auth";

export type AppRole = "gym_owner" | "superadmin";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: AppRole;
    };
  }

  interface User {
    role?: AppRole;
    rememberMe?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: AppRole;
    rememberMe?: boolean;
  }
}
