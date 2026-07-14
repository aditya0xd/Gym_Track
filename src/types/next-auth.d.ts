import type { DefaultSession } from "next-auth";

import type { OwnerSubscriptionPlan } from "@/generated/prisma/client";

export type AppRole = "gym_owner" | "superadmin";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: AppRole;
      accountInvalid?: boolean;
      subscriptionPlan?: OwnerSubscriptionPlan;
      trialEndsAt?: string | null;
      gymName?: string | null;
      onboardingComplete?: boolean;
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
    accountInvalid?: boolean;
    subscriptionPlan?: string;
    trialEndsAt?: string | null;
    gymName?: string | null;
    onboardingComplete?: boolean;
  }
}
