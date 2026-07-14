import { NextResponse } from "next/server";
import { z } from "zod";

import { withGymOwnerFeature } from "@/lib/api-auth";
import { HttpError } from "@/lib/http/errors";
import {
  memberBillingDurationSchema,
  parseRequestBody,
  priceInrSchema,
} from "@/lib/validation";
import {
  createMembershipPlanForOwner,
  listMembershipPlansForOwner,
} from "@/server/gym-owner/membership-plan.service";

const planPriceSchema = z.object({
  duration: memberBillingDurationSchema,
  priceInr: priceInrSchema,
});

const createPlanSchema = z.object({
  name: z.string().trim().min(1, "Plan name is required").max(80),
  category: z.string().trim().max(40).nullable().optional().transform((v) => v ?? null),
  description: z.string().trim().max(500).nullable().optional().transform((v) => v ?? null),
  benefits: z
    .array(z.string().trim().min(1, "Benefit cannot be empty").max(200))
    .min(1, "Add at least one benefit")
    .max(20),
  prices: z.array(planPriceSchema).min(1, "Add at least one duration price"),
});

async function GETHandler(_request: Request, userId: string) {
  const plans = await listMembershipPlansForOwner(userId);
  return NextResponse.json({ plans });
}

async function POSTHandler(request: Request, userId: string) {
  const { data, error } = await parseRequestBody(request, createPlanSchema);
  if (error || !data) {
    return NextResponse.json(error || { message: "Invalid request" }, { status: error?.status ?? 400 });
  }

  try {
    const plan = await createMembershipPlanForOwner(userId, data);
    return NextResponse.json({ plan }, { status: 201 });
  } catch (e) {
    if (e instanceof HttpError) {
      return NextResponse.json({ message: e.message }, { status: e.status });
    }
    throw e;
  }
}

export const GET = withGymOwnerFeature("CUSTOM_MEMBERSHIP_PRICING", GETHandler);
export const POST = withGymOwnerFeature("CUSTOM_MEMBERSHIP_PRICING", POSTHandler);
