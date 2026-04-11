import type { OwnerSubscriptionPlan, PlanFeatureKey } from "@/generated/prisma/client";
import { OWNER_SUBSCRIPTION_PLAN_OPTIONS } from "@/lib/constants/billing";
import {
  defaultPlanFeatureMatrix,
  PLAN_FEATURE_KEYS,
} from "@/lib/constants/plan-features";
import { prisma } from "@/lib/prisma";

export type PlanFeatureMatrix = Record<
  OwnerSubscriptionPlan,
  Record<PlanFeatureKey, boolean>
>;

function cloneDefaults(): PlanFeatureMatrix {
  const d = defaultPlanFeatureMatrix();
  return structuredClone(d);
}

/** Defaults merged with rows from `PlatformPlanFeature` (DB wins). */
export async function getMergedPlanFeatures(): Promise<PlanFeatureMatrix> {
  const merged = cloneDefaults();
  const rows = await prisma.platformPlanFeature.findMany({
    select: { plan: true, featureKey: true, enabled: true },
  });
  for (const r of rows) {
    merged[r.plan][r.featureKey] = r.enabled;
  }
  return merged;
}

export async function replacePlanFeatures(matrix: PlanFeatureMatrix): Promise<void> {
  await prisma.$transaction(
    OWNER_SUBSCRIPTION_PLAN_OPTIONS.flatMap(({ value: plan }) =>
      PLAN_FEATURE_KEYS.map((featureKey) =>
        prisma.platformPlanFeature.upsert({
          where: {
            plan_featureKey: { plan, featureKey },
          },
          create: { plan, featureKey, enabled: matrix[plan][featureKey] },
          update: { enabled: matrix[plan][featureKey] },
        }),
      ),
    ),
  );
}

export async function planHasFeature(
  plan: OwnerSubscriptionPlan,
  feature: PlanFeatureKey,
): Promise<boolean> {
  const merged = await getMergedPlanFeatures();
  return merged[plan][feature];
}
