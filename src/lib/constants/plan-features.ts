import type { OwnerSubscriptionPlan, PlanFeatureKey } from "@/generated/prisma/client";

export const PLAN_FEATURE_KEYS: PlanFeatureKey[] = [
  "ANALYTICS",
  "BULK_IMPORT_EXPORT",
  "SCHEDULED_EXPIRY_REMINDERS",
  "MANUAL_MEMBER_REMINDERS",
  "CUSTOM_MEMBERSHIP_PRICING",
];

/** Short labels for superadmin UI and docs. */
export const PLAN_FEATURE_LABELS: Record<PlanFeatureKey, string> = {
  ANALYTICS: "Analytics dashboard",
  BULK_IMPORT_EXPORT: "Bulk member import & export",
  SCHEDULED_EXPIRY_REMINDERS: "Scheduled expiry reminders (cron)",
  MANUAL_MEMBER_REMINDERS: "Manual WhatsApp / SMS reminders",
  CUSTOM_MEMBERSHIP_PRICING: "Custom INR pricing per membership duration",
};

/**
 * Baseline when no row exists in `PlatformPlanFeature` (superadmin overrides merge on top).
 */
export function defaultPlanFeatureMatrix(): Record<
  OwnerSubscriptionPlan,
  Record<PlanFeatureKey, boolean>
> {
  return {
    TRIAL: {
      ANALYTICS: false,
      BULK_IMPORT_EXPORT: false,
      SCHEDULED_EXPIRY_REMINDERS: true,
      MANUAL_MEMBER_REMINDERS: true,
      CUSTOM_MEMBERSHIP_PRICING: true,
    },
    STARTER: {
      ANALYTICS: true,
      BULK_IMPORT_EXPORT: true,
      SCHEDULED_EXPIRY_REMINDERS: true,
      MANUAL_MEMBER_REMINDERS: true,
      CUSTOM_MEMBERSHIP_PRICING: true,
    },
    PRO: {
      ANALYTICS: true,
      BULK_IMPORT_EXPORT: true,
      SCHEDULED_EXPIRY_REMINDERS: true,
      MANUAL_MEMBER_REMINDERS: true,
      CUSTOM_MEMBERSHIP_PRICING: true,
    },
  };
}
