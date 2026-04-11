import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import type { PlanFeatureKey } from "@/generated/prisma/client";
import { authOptions } from "@/lib/auth";
import { OWNER_SUBSCRIPTION_PLAN_OPTIONS } from "@/lib/constants/billing";
import { PLAN_FEATURE_KEYS } from "@/lib/constants/plan-features";
import {
  getMergedPlanFeatures,
  replacePlanFeatures,
  type PlanFeatureMatrix,
} from "@/server/platform-plan-features.service";

function parseMatrix(body: unknown): PlanFeatureMatrix | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  const matrix = {} as PlanFeatureMatrix;
  for (const { value: plan } of OWNER_SUBSCRIPTION_PLAN_OPTIONS) {
    const section = o[plan];
    if (!section || typeof section !== "object") return null;
    const s = section as Record<string, unknown>;
    const row = {} as Record<PlanFeatureKey, boolean>;
    for (const key of PLAN_FEATURE_KEYS) {
      if (typeof s[key] !== "boolean") return null;
      row[key] = s[key];
    }
    matrix[plan] = row;
  }
  return matrix;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "superadmin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const features = await getMergedPlanFeatures();
  return NextResponse.json({ features });
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "superadmin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const matrix = parseMatrix(body);
  if (!matrix) {
    return NextResponse.json(
      {
        message:
          "Invalid body. Send { TRIAL: { ANALYTICS: boolean, ... }, STARTER: { ... }, PRO: { ... } } with all feature keys.",
      },
      { status: 400 },
    );
  }

  await replacePlanFeatures(matrix);
  const features = await getMergedPlanFeatures();
  return NextResponse.json({ features });
}
