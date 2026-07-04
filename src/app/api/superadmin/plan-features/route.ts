import { NextResponse } from "next/server";
import { z } from "zod";

import type { PlanFeatureKey } from "@/generated/prisma/client";
import { OWNER_SUBSCRIPTION_PLAN_OPTIONS } from "@/lib/constants/billing";
import { PLAN_FEATURE_KEYS } from "@/lib/constants/plan-features";
import { withSuperAdmin } from "@/lib/api-auth";
import { parseRequestBody } from "@/lib/validation";
import {
  getMergedPlanFeatures,
  replacePlanFeatures,
  type PlanFeatureMatrix,
} from "@/server/platform-plan-features.service";

const featureRowSchema = z.record(
  z.enum(PLAN_FEATURE_KEYS as [PlanFeatureKey, ...PlanFeatureKey[]]),
  z.boolean()
);

const planFeaturesSchema = z.object(
  Object.fromEntries(
    OWNER_SUBSCRIPTION_PLAN_OPTIONS.map(opt => [opt.value, featureRowSchema])
  )
);

async function GETHandler(_request: Request, _userId: string) {
  const features = await getMergedPlanFeatures();
  return NextResponse.json({ features });
}

async function PUTHandler(request: Request, _userId: string) {
  const { data, error } = await parseRequestBody(request, planFeaturesSchema);
  if (error || !data) {
    return NextResponse.json(
      {
        message:
          "Invalid body. Send { TRIAL: { ANALYTICS: boolean, ... }, STARTER: { ... }, PRO: { ... } } with all feature keys.",
      },
      { status: 400 },
    );
  }

  await replacePlanFeatures(data as PlanFeatureMatrix);
  const features = await getMergedPlanFeatures();
  return NextResponse.json({ features });
}

export const GET = withSuperAdmin(GETHandler);
export const PUT = withSuperAdmin(PUTHandler);
