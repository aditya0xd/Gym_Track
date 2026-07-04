import { NextResponse } from "next/server";
import { z } from "zod";

import { HttpError } from "@/lib/http/errors";
import { withSuperAdmin } from "@/lib/api-auth";
import { parseRequestBody, ownerSubscriptionPlanSchema } from "@/lib/validation";
import { updateGymOwnerSubscription } from "@/server/superadmin/gym-owner.service";
import type { OwnerSubscriptionPlan } from "@/generated/prisma/client";

const updateGymOwnerSchema = z.object({
  subscriptionPlan: ownerSubscriptionPlanSchema.optional(),
  trialEndsAt: z.union([
    z.string().datetime("trialEndsAt must be a valid ISO date string"),
    z.null(),
  ]).optional(),
}).refine(data => data.subscriptionPlan !== undefined || data.trialEndsAt !== undefined, {
  message: "Provide subscriptionPlan and/or trialEndsAt",
});

async function PATCHHandler(request: Request, _userId: string, context?: unknown) {
  const { id } = await (context as { params: Promise<{ id: string }> }).params;
  const { data, error } = await parseRequestBody(request, updateGymOwnerSchema);
  if (error || !data) {
    return NextResponse.json(error || { message: "Invalid request" }, { status: 400 });
  }

  const patch: {
    subscriptionPlan?: OwnerSubscriptionPlan;
    trialEndsAt?: Date | null;
  } = {};

  if (data.subscriptionPlan !== undefined) {
    patch.subscriptionPlan = data.subscriptionPlan as OwnerSubscriptionPlan;
  }

  if (data.trialEndsAt !== undefined) {
    patch.trialEndsAt = data.trialEndsAt === null ? null : new Date(data.trialEndsAt);
  }

  try {
    const updated = await updateGymOwnerSubscription(id, patch);

    return NextResponse.json({
      gymOwner: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        subscriptionPlan: updated.subscriptionPlan,
        trialEndsAt: updated.trialEndsAt?.toISOString() ?? null,
        memberCount: updated._count.members,
      },
    });
  } catch (e) {
    if (e instanceof HttpError) {
      return NextResponse.json({ message: e.message }, { status: e.status });
    }
    throw e;
  }
}

export const PATCH = withSuperAdmin(PATCHHandler);
