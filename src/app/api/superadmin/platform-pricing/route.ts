import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { OWNER_SUBSCRIPTION_PLAN_OPTIONS } from "@/lib/constants/billing";
import { getPlatformPlanPriceMap, upsertPlatformPlanPrice } from "@/server/platform-pricing.service";
import type { OwnerSubscriptionPlan } from "@/generated/prisma/client";

function isPlan(v: unknown): v is OwnerSubscriptionPlan {
  return OWNER_SUBSCRIPTION_PLAN_OPTIONS.some((o) => o.value === v);
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "superadmin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const prices = await getPlatformPlanPriceMap();
  return NextResponse.json({ prices });
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "superadmin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const entries = Object.entries(body);
  if (entries.length === 0) {
    return NextResponse.json({ message: "Provide at least one plan price." }, { status: 400 });
  }

  for (const [plan, price] of entries) {
    if (!isPlan(plan)) {
      return NextResponse.json({ message: `Invalid plan: ${plan}` }, { status: 400 });
    }
    if (typeof price !== "string" || !/^\d+(\.\d{1,2})?$/.test(price)) {
      return NextResponse.json(
        { message: `Invalid price for ${plan}. Use decimal string like 1499 or 1499.00.` },
        { status: 400 },
      );
    }
  }

  await Promise.all(
    entries.map(([plan, price]) =>
      upsertPlatformPlanPrice(plan as OwnerSubscriptionPlan, price as string),
    ),
  );

  const prices = await getPlatformPlanPriceMap();
  return NextResponse.json({ prices });
}
