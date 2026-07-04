import { z } from "zod";
import { MEMBER_BILLING_DURATION_OPTIONS, OWNER_SUBSCRIPTION_PLAN_OPTIONS } from "./constants/billing";
import type { MemberBillingDuration, OwnerSubscriptionPlan, PaymentStatus } from "@/generated/prisma/client";

/**
 * Helper to parse request body with Zod and return validation error if invalid
 */
export async function parseRequestBody<T>(request: Request, schema: z.ZodSchema<T>): Promise<{
  data?: T;
  error?: { message: string };
}> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);
    if (!result.success) {
      const message = result.error.issues.map((e: z.ZodIssue) => e.message).join(", ");
      return { error: { message } };
    }
    return { data: result.data };
  } catch {
    return { error: { message: "Invalid JSON body" } };
  }
}

/**
 * Common Zod schemas
 */

// Date string in YYYY-MM-DD format
export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
  message: "Date must be in YYYY-MM-DD format",
});

// Email with normalization
export const emailSchema = z.string()
  .trim()
  .toLowerCase()
  .email("Invalid email address");

// Member billing duration enum
export const memberBillingDurationSchema = z.enum(
  MEMBER_BILLING_DURATION_OPTIONS.map(o => o.value) as [MemberBillingDuration, ...MemberBillingDuration[]]
);

// Owner subscription plan enum
export const ownerSubscriptionPlanSchema = z.enum(
  OWNER_SUBSCRIPTION_PLAN_OPTIONS.map(o => o.value) as [OwnerSubscriptionPlan, ...OwnerSubscriptionPlan[]]
);

// Payment status enum
export const paymentStatusSchema = z.enum(["DONE", "NOT_DONE"] as [PaymentStatus, ...PaymentStatus[]]);

// Price in INR (accepts string or number, normalizes to string)
export const priceInrSchema = z.union([
  z.string().trim(),
  z.number(),
]).transform(val => String(val));

// Optional string that trims and converts empty to null
export const optionalStringToNullSchema = z.string()
  .trim()
  .transform(val => val === "" ? null : val)
  .nullable()
  .optional();
