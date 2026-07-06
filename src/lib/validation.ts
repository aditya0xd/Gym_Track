import { z } from "zod";
import { Buffer } from "node:buffer";
import { MEMBER_BILLING_DURATION_OPTIONS, OWNER_SUBSCRIPTION_PLAN_OPTIONS } from "./constants/billing";
import type { MemberBillingDuration, OwnerSubscriptionPlan, PaymentStatus } from "@/generated/prisma/client";

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function hasMatchingImageSignature(bytes: Buffer, mime: string) {
  if (mime === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }

  if (mime === "image/png") {
    const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    return bytes.length >= png.length && png.every((byte, index) => bytes[index] === byte);
  }

  if (mime === "image/webp") {
    return bytes.length >= 12
      && bytes.subarray(0, 4).toString("ascii") === "RIFF"
      && bytes.subarray(8, 12).toString("ascii") === "WEBP";
  }

  return false;
}

export function imageDataUrlSchema(label: string, maxBytes = MAX_IMAGE_BYTES) {
  const maxEncodedBytes = Math.ceil(maxBytes / 3) * 4;

  return z.preprocess(
    (value) => typeof value === "string" ? value.trim() || null : value,
    z.string().superRefine((value, ctx) => {
      if (value.length > "data:image/jpeg;base64,".length + maxEncodedBytes) {
        ctx.addIssue({
          code: "custom",
          message: `${label} must be under ${Math.floor(maxBytes / 1024 / 1024)}MB.`,
        });
        return;
      }

      const commaIndex = value.indexOf(",");
      if (commaIndex <= 0) {
        ctx.addIssue({ code: "custom", message: `${label} must be a valid image data URL.` });
        return;
      }

      const metadata = value.slice(0, commaIndex).toLowerCase();
      if (!metadata.startsWith("data:") || !metadata.endsWith(";base64")) {
        ctx.addIssue({ code: "custom", message: `${label} must be a base64 image data URL.` });
        return;
      }

      const mime = metadata.slice("data:".length, -";base64".length);
      if (!IMAGE_MIME_TYPES.has(mime)) {
        ctx.addIssue({ code: "custom", message: `${label} must be a JPEG, PNG, or WebP image.` });
        return;
      }

      const encoded = value.slice(commaIndex + 1);
      if (encoded.length === 0 || encoded.length > maxEncodedBytes || encoded.length % 4 !== 0) {
        ctx.addIssue({ code: "custom", message: `${label} must be under ${Math.floor(maxBytes / 1024 / 1024)}MB.` });
        return;
      }

      if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) {
        ctx.addIssue({ code: "custom", message: `${label} contains invalid base64 data.` });
        return;
      }

      const bytes = Buffer.from(encoded, "base64");
      if (bytes.length > maxBytes || !hasMatchingImageSignature(bytes, mime)) {
        ctx.addIssue({ code: "custom", message: `${label} does not match its declared image type.` });
      }
    }).nullable().optional(),
  ).transform((value) => value ?? null);
}

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
