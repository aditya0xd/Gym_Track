import { NextResponse } from "next/server";
import { z } from "zod";

import { MEMBER_BILLING_DURATION_OPTIONS } from "@/lib/constants/billing";
import { HttpError } from "@/lib/http/errors";
import { withGymOwnerFeature } from "@/lib/api-auth";
import { parseRequestBody, memberBillingDurationSchema, priceInrSchema } from "@/lib/validation";
import {
  listDurationPricesForOwner,
  upsertDurationPricesForOwner,
} from "@/server/gym-owner/pricing.service";

const pricingItemSchema = z.object({
  duration: memberBillingDurationSchema,
  priceInr: priceInrSchema,
});

const updatePricingSchema = z.object({
  prices: z.array(pricingItemSchema).refine(
    (items) => items.length === MEMBER_BILLING_DURATION_OPTIONS.length,
    { message: `Submit all ${MEMBER_BILLING_DURATION_OPTIONS.length} durations with priceInr.` }
  ).refine(
    (items) => {
      const durations = new Set(items.map(i => i.duration));
      return durations.size === MEMBER_BILLING_DURATION_OPTIONS.length;
    },
    { message: "Each duration must appear exactly once." }
  ),
});

async function GETHandler(_request: Request, userId: string) {
  const prices = await listDurationPricesForOwner(userId);
  return NextResponse.json({ prices });
}

async function PUTHandler(request: Request, userId: string) {
  const { data, error } = await parseRequestBody(request, updatePricingSchema);
  if (error || !data) {
    return NextResponse.json(error || { message: "Invalid request" }, { status: 400 });
  }

  try {
    await upsertDurationPricesForOwner(userId, data.prices);
    const prices = await listDurationPricesForOwner(userId);
    return NextResponse.json({ prices });
  } catch (e) {
    if (e instanceof HttpError) {
      return NextResponse.json({ message: e.message }, { status: e.status });
    }
    throw e;
  }
}

export const GET = withGymOwnerFeature("CUSTOM_MEMBERSHIP_PRICING", GETHandler);
export const PUT = withGymOwnerFeature("CUSTOM_MEMBERSHIP_PRICING", PUTHandler);
