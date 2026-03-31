import type { MemberBillingDuration } from "@/generated/prisma/client";
import type { OwnerSubscriptionPlan } from "@/generated/prisma/client";

export const MEMBER_BILLING_DURATION_OPTIONS: {
  value: MemberBillingDuration;
  label: string;
}[] = [
  { value: "ONE_MONTH", label: "1 month" },
  { value: "THREE_MONTHS", label: "3 months" },
  { value: "SIX_MONTHS", label: "6 months" },
  { value: "TWELVE_MONTHS", label: "12 months" },
];

export const OWNER_SUBSCRIPTION_PLAN_OPTIONS: {
  value: OwnerSubscriptionPlan;
  label: string;
}[] = [
  { value: "TRIAL", label: "Trial" },
  { value: "STARTER", label: "Starter" },
  { value: "PRO", label: "Pro" },
];

export const AUTH_PORTALS = {
  GYM_OWNER: "gym_owner",
  SUPERADMIN: "superadmin",
} as const;

export type AuthPortal = (typeof AUTH_PORTALS)[keyof typeof AUTH_PORTALS];
