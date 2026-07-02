import { NextResponse } from "next/server";
import type { Session } from "next-auth";

import type { PlanFeatureKey } from "@/generated/prisma/client";
import { planHasFeature } from "@/server/platform-plan-features.service";

/**
 * Returns a JSON error response if the gym owner session cannot use this capability.
 */
export async function guardGymOwnerPlanFeature(
  session: Session | null,
  feature: PlanFeatureKey,
): Promise<NextResponse | null> {
  if (!session?.user?.id || session.user.role !== "gym_owner") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const plan = session.user.subscriptionPlan ?? "TRIAL";
  if (!(await planHasFeature(plan, feature))) {
    return NextResponse.json(
      { error: "This action is not included in your subscription plan." },
      { status: 403 },
    );
  }
  return null;
}

/**
 * Server-side helper for checking if a gym owner has access to a feature.
 * Returns true if the feature is available, false otherwise.
 * Use this in server components to conditionally render UI elements.
 */
export async function hasGymOwnerPlanFeature(
  session: Session | null,
  feature: PlanFeatureKey,
): Promise<boolean> {
  if (!session?.user?.id || session.user.role !== "gym_owner") {
    return false;
  }
  const plan = session.user.subscriptionPlan ?? "TRIAL";
  return await planHasFeature(plan, feature);
}
