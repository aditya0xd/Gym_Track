import { NextResponse } from "next/server";
import { z } from "zod";

import { OWNER_SUBSCRIPTION_PLAN_OPTIONS } from "@/lib/constants/billing";
import { withSuperAdmin } from "@/lib/api-auth";
import { parseRequestBody, ownerSubscriptionPlanSchema } from "@/lib/validation";
import { getPlatformPlanPriceMap, upsertPlatformPlanPrice } from "@/server/platform-pricing.service";
import type { OwnerSubscriptionPlan } from "@/generated/prisma/client";

const platformPricingSchema = z.record(
  ownerSubscriptionPlanSchema,
  z.string().regex(/^\d+(\.\d{1,2})?$/, { message: "Price must be a decimal string like 1499 or 1499.00" })
).refine(data => Object.keys(data).length > 0, {
  message: "Provide at least one plan price",
});

async function GETHandler(_request: Request, _userId: string) {
  const prices = await getPlatformPlanPriceMap();
  return NextResponse.json({ prices });
}

async function PUTHandler(request: Request, _userId: string) {
  const { data, error } = await parseRequestBody(request, platformPricingSchema);
  if (error || !data) {
    return NextResponse.json(error || { message: "Invalid request" }, { status: 400 });
  }

  await Promise.all(
    Object.entries(data).map(([plan, price]) =>
      upsertPlatformPlanPrice(plan as OwnerSubscriptionPlan, price),
    ),
  );

  const prices = await getPlatformPlanPriceMap();
  return NextResponse.json({ prices });
}

export const GET = withSuperAdmin(GETHandler);
export const PUT = withSuperAdmin(PUTHandler);
