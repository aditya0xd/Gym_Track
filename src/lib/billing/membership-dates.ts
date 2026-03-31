import type { MemberBillingDuration } from "@/generated/prisma/client";

const DURATION_MONTHS: Record<MemberBillingDuration, number> = {
  ONE_MONTH: 1,
  THREE_MONTHS: 3,
  SIX_MONTHS: 6,
  TWELVE_MONTHS: 12,
};

/** Inclusive end date: e.g. 1‑month starting 2026-03-01 ends 2026-03-31 (UTC date parts). */
export function membershipEndDateInclusive(
  startDate: Date,
  duration: MemberBillingDuration,
): Date {
  const months = DURATION_MONTHS[duration];
  const d = new Date(
    Date.UTC(
      startDate.getUTCFullYear(),
      startDate.getUTCMonth(),
      startDate.getUTCDate(),
    ),
  );
  d.setUTCMonth(d.getUTCMonth() + months);
  d.setUTCDate(d.getUTCDate() - 1);
  return d;
}

export function monthsForDuration(duration: MemberBillingDuration): number {
  return DURATION_MONTHS[duration];
}
