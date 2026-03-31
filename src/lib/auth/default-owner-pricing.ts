import { randomUUID } from "crypto";

import type { MemberBillingDuration } from "@/generated/prisma/client";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/** Suggested INR defaults for new gym owners (editable under Pricing). */
const DEFAULT_INR_BY_DURATION: Record<MemberBillingDuration, string> = {
  ONE_MONTH: "999.00",
  THREE_MONTHS: "2699.00",
  SIX_MONTHS: "4999.00",
  TWELVE_MONTHS: "8999.00",
};

export async function seedDefaultDurationPricesForOwner(adminUserId: string) {
  const entries = Object.entries(DEFAULT_INR_BY_DURATION) as [
    MemberBillingDuration,
    string,
  ][];

  await prisma.$transaction(
    entries.map(([duration, priceInr]) =>
      prisma.gymOwnerDurationPrice.create({
        data: {
          id: randomUUID(),
          adminUserId,
          duration,
          priceInr: new Prisma.Decimal(priceInr),
        },
      }),
    ),
  );
}
