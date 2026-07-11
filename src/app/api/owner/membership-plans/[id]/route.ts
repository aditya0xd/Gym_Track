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
  getMembershipPlanForOwner,
  softDeleteMembershipPlanForOwner,
  updateMembershipPlanForOwner,
} from "@/server/gym-owner/membership-plan.service";

const planPriceSchema = z.object({
  duration: memberBillingDurationSchema,
  priceInr: priceInrSchema,
});

const updatePlanSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  category: z.string().trim().max(40).nullable().optional(),
  description: z.string().trim().max(500).nullable().optional(),
  benefits: z
    .array(z.string().trim().min(1).max(200))
    .min(1)
    .max(20)
    .optional(),
  prices: z.array(planPriceSchema).min(1).optional(),
});

async function GETHandler(
  _request: Request,
  userId: string,
  context?: unknown,
) {
  const { id } = await (context as { params: Promise<{ id: string }> }).params;
  try {
    const plan = await getMembershipPlanForOwner(userId, id);
    return NextResponse.json({ plan });
  } catch (e) {
    if (e instanceof HttpError) {
      return NextResponse.json({ message: e.message }, { status: e.status });
    }
    throw e;
  }
}

async function PATCHHandler(
  request: Request,
  userId: string,
  context?: unknown,
) {
  const { id } = await (context as { params: Promise<{ id: string }> }).params;
  const { data, error } = await parseRequestBody(request, updatePlanSchema);
  if (error || !data) {
    return NextResponse.json(error || { message: "Invalid request" }, { status: error?.status ?? 400 });
  }

  try {
    const plan = await updateMembershipPlanForOwner(userId, id, data);
    return NextResponse.json({ plan });
  } catch (e) {
    if (e instanceof HttpError) {
      return NextResponse.json({ message: e.message }, { status: e.status });
    }
    throw e;
  }
}

async function DELETEHandler(
  _request: Request,
  userId: string,
  context?: unknown,
) {
  const { id } = await (context as { params: Promise<{ id: string }> }).params;
  try {
    await softDeleteMembershipPlanForOwner(userId, id);
    return NextResponse.json({ message: "Plan deleted." });
  } catch (e) {
    if (e instanceof HttpError) {
      return NextResponse.json({ message: e.message }, { status: e.status });
    }
    throw e;
  }
}

export const GET = withGymOwnerFeature("CUSTOM_MEMBERSHIP_PRICING", GETHandler);
export const PATCH = withGymOwnerFeature("CUSTOM_MEMBERSHIP_PRICING", PATCHHandler);
export const DELETE = withGymOwnerFeature("CUSTOM_MEMBERSHIP_PRICING", DELETEHandler);
