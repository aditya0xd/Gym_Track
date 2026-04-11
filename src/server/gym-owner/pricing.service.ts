import { randomUUID } from "crypto";

import type { MemberBillingDuration } from "@/generated/prisma/client";
import { Prisma } from "@/generated/prisma/client";
import { MEMBER_BILLING_DURATION_OPTIONS } from "@/lib/constants/billing";
import { HttpError } from "@/lib/http/errors";
import { prisma } from "@/lib/prisma";
import { ownerDurationPriceScope } from "@/lib/tenant/scope";

export type DurationPriceRow = {
  duration: MemberBillingDuration;
  priceInr: string | null;
};

export async function listDurationPricesForOwner(
  adminUserId: string,
): Promise<DurationPriceRow[]> {
  const rows = await prisma.gymOwnerDurationPrice.findMany({
    where: ownerDurationPriceScope(adminUserId),
  });
  const byDuration = new Map(
    rows.map((r) => [r.duration, r.priceInr.toString()] as const),
  );

  return MEMBER_BILLING_DURATION_OPTIONS.map(({ value }) => ({
    duration: value,
    priceInr: byDuration.get(value) ?? null,
  }));
}

export async function upsertDurationPricesForOwner(
  adminUserId: string,
  prices: { duration: MemberBillingDuration; priceInr: string }[],
) {
  for (const p of prices) {
    const n = Number(p.priceInr);
    if (!Number.isFinite(n) || n < 0) {
      throw new HttpError(400, "Each price must be a non‑negative number.");
    }
  }

  await prisma.$transaction(
    prices.map((p) =>
      prisma.gymOwnerDurationPrice.upsert({
        where: {
          adminUserId_duration: {
            adminUserId,
            duration: p.duration,
          },
        },
        create: {
          id: randomUUID(),
          adminUserId,
          duration: p.duration,
          priceInr: new Prisma.Decimal(p.priceInr),
        },
        update: {
          priceInr: new Prisma.Decimal(p.priceInr),
          deletedAt: null,
        },
      }),
    ),
  );
}
