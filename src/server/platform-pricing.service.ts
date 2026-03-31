import type { OwnerSubscriptionPlan } from "@/generated/prisma/client";
import { OWNER_PLAN_FALLBACK_PRICE_INR } from "@/lib/constants/billing";
import { prisma } from "@/lib/prisma";

export async function getPlatformPlanPriceMap() {
  const rows = await prisma.platformPlanPrice.findMany({
    select: { plan: true, priceInr: true },
  });

  const byPlan = new Map<OwnerSubscriptionPlan, string>();
  for (const row of rows) byPlan.set(row.plan, row.priceInr.toString());

  return {
    TRIAL: byPlan.get("TRIAL") ?? OWNER_PLAN_FALLBACK_PRICE_INR.TRIAL,
    STARTER: byPlan.get("STARTER") ?? OWNER_PLAN_FALLBACK_PRICE_INR.STARTER,
    PRO: byPlan.get("PRO") ?? OWNER_PLAN_FALLBACK_PRICE_INR.PRO,
  } as const;
}

export async function upsertPlatformPlanPrice(plan: OwnerSubscriptionPlan, priceInr: string) {
  return prisma.platformPlanPrice.upsert({
    where: { plan },
    update: { priceInr },
    create: { plan, priceInr },
  });
}
