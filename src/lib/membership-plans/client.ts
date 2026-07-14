import { MEMBER_BILLING_DURATION_OPTIONS } from "@/lib/constants/billing";
import type { MemberBillingDuration } from "@/generated/prisma/client";

export type MembershipPlanPriceRow = {
  duration: MemberBillingDuration;
  priceInr: string | null;
};

export type MembershipPlanDto = {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  sortOrder: number;
  benefits: { id: string; label: string; sortOrder: number }[];
  prices: MembershipPlanPriceRow[];
  activeMemberCount: number;
};

export function durationLabel(value: MemberBillingDuration | string) {
  const label =
    MEMBER_BILLING_DURATION_OPTIONS.find((o) => o.value === value)?.label ??
    value;
  return label.toLowerCase() === "12 months" ? "1 Year" : label;
}

export function pricedDurations(plan: MembershipPlanDto): MembershipPlanPriceRow[] {
  return plan.prices.filter((p) => p.priceInr && Number(p.priceInr) > 0);
}

export function priceForDuration(
  plan: MembershipPlanDto,
  duration: MemberBillingDuration,
) {
  return plan.prices.find((p) => p.duration === duration)?.priceInr ?? null;
}
