import { randomUUID } from "crypto";

import type { MemberBillingDuration } from "@/generated/prisma/client";
import { Prisma } from "@/generated/prisma/client";
import { MEMBER_BILLING_DURATION_OPTIONS } from "@/lib/constants/billing";
import { HttpError } from "@/lib/http/errors";
import { prisma } from "@/lib/prisma";
import { memberScope, ownerMembershipPlanScope } from "@/lib/tenant/scope";

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

export type CreateMembershipPlanInput = {
  name: string;
  category?: string | null;
  description?: string | null;
  benefits: string[];
  prices: { duration: MemberBillingDuration; priceInr: string }[];
};

export type UpdateMembershipPlanInput = {
  name?: string;
  category?: string | null;
  description?: string | null;
  benefits?: string[];
  prices?: { duration: MemberBillingDuration; priceInr: string }[];
};

function normalizePlanName(name: string) {
  return name.trim();
}

function validatePrices(prices: { duration: MemberBillingDuration; priceInr: string }[]) {
  if (prices.length === 0) {
    throw new HttpError(400, "Add at least one duration price.");
  }

  const seen = new Set<MemberBillingDuration>();
  for (const p of prices) {
    if (seen.has(p.duration)) {
      throw new HttpError(400, "Each duration can appear only once per plan.");
    }
    seen.add(p.duration);

    const n = Number(p.priceInr);
    if (!Number.isFinite(n) || n < 0) {
      throw new HttpError(400, "Each price must be a non-negative number.");
    }
  }
}

function validateBenefits(benefits: string[]) {
  if (benefits.length === 0) {
    throw new HttpError(400, "Add at least one benefit.");
  }
  if (benefits.length > 20) {
    throw new HttpError(400, "A plan can have at most 20 benefits.");
  }
}

async function assertUniquePlanName(
  adminUserId: string,
  name: string,
  excludePlanId?: string,
) {
  const existing = await prisma.gymMembershipPlan.findFirst({
    where: {
      ...ownerMembershipPlanScope(adminUserId),
      name: { equals: name, mode: "insensitive" },
      ...(excludePlanId ? { id: { not: excludePlanId } } : {}),
    },
    select: { id: true },
  });

  if (existing) {
    throw new HttpError(409, "A plan with this name already exists.");
  }
}

function mapPlanPrices(
  rows: { duration: MemberBillingDuration; priceInr: Prisma.Decimal }[],
): MembershipPlanPriceRow[] {
  const byDuration = new Map(
    rows.map((r) => [r.duration, r.priceInr.toString()] as const),
  );

  return MEMBER_BILLING_DURATION_OPTIONS.map(({ value }) => ({
    duration: value,
    priceInr: byDuration.get(value) ?? null,
  }));
}

async function toPlanDto(
  plan: {
    id: string;
    name: string;
    category: string | null;
    description: string | null;
    sortOrder: number;
    benefits: { id: string; label: string; sortOrder: number }[];
    prices: { duration: MemberBillingDuration; priceInr: Prisma.Decimal }[];
  },
  activeMemberCount: number,
): Promise<MembershipPlanDto> {
  return {
    id: plan.id,
    name: plan.name,
    category: plan.category,
    description: plan.description,
    sortOrder: plan.sortOrder,
    benefits: plan.benefits,
    prices: mapPlanPrices(plan.prices),
    activeMemberCount,
  };
}

const planInclude = {
  benefits: {
    where: { deletedAt: null },
    orderBy: { sortOrder: "asc" as const },
    select: { id: true, label: true, sortOrder: true },
  },
  prices: {
    where: { deletedAt: null },
    select: { duration: true, priceInr: true },
  },
} as const;

export async function listMembershipPlansForOwner(
  adminUserId: string,
): Promise<MembershipPlanDto[]> {
  const plans = await prisma.gymMembershipPlan.findMany({
    where: ownerMembershipPlanScope(adminUserId),
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: planInclude,
  });

  const memberCounts = await prisma.member.groupBy({
    by: ["membershipPlanId"],
    where: {
      ...memberScope(adminUserId),
      membershipPlanId: { in: plans.map((p) => p.id) },
    },
    _count: { _all: true },
  });

  const countByPlan = new Map(
    memberCounts.map((row) => [row.membershipPlanId, row._count._all]),
  );

  return Promise.all(
    plans.map((plan) =>
      toPlanDto(plan, countByPlan.get(plan.id) ?? 0),
    ),
  );
}

export async function getMembershipPlanForOwner(
  adminUserId: string,
  planId: string,
): Promise<MembershipPlanDto> {
  const plan = await prisma.gymMembershipPlan.findFirst({
    where: { id: planId, ...ownerMembershipPlanScope(adminUserId) },
    include: planInclude,
  });

  if (!plan) {
    throw new HttpError(404, "Membership plan not found.");
  }

  const activeMemberCount = await prisma.member.count({
    where: {
      ...memberScope(adminUserId),
      membershipPlanId: plan.id,
    },
  });

  return toPlanDto(plan, activeMemberCount);
}

export async function createMembershipPlanForOwner(
  adminUserId: string,
  input: CreateMembershipPlanInput,
) {
  const name = normalizePlanName(input.name);
  if (!name) {
    throw new HttpError(400, "Plan name is required.");
  }

  validateBenefits(input.benefits);
  validatePrices(input.prices);
  await assertUniquePlanName(adminUserId, name);

  const planId = randomUUID();
  const benefitRows = input.benefits.map((label, index) => ({
    id: randomUUID(),
    label: label.trim(),
    sortOrder: index,
  }));

  if (benefitRows.some((b) => !b.label)) {
    throw new HttpError(400, "Benefit labels cannot be empty.");
  }

  await prisma.$transaction(async (tx) => {
    const maxSort = await tx.gymMembershipPlan.aggregate({
      where: ownerMembershipPlanScope(adminUserId),
      _max: { sortOrder: true },
    });

    await tx.gymMembershipPlan.create({
      data: {
        id: planId,
        adminUserId,
        name,
        category: input.category?.trim() || null,
        description: input.description?.trim() || null,
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
        benefits: { create: benefitRows },
        prices: {
          create: input.prices.map((p) => ({
            id: randomUUID(),
            duration: p.duration,
            priceInr: new Prisma.Decimal(p.priceInr),
          })),
        },
      },
    });
  });

  return getMembershipPlanForOwner(adminUserId, planId);
}

export async function updateMembershipPlanForOwner(
  adminUserId: string,
  planId: string,
  input: UpdateMembershipPlanInput,
) {
  const existing = await prisma.gymMembershipPlan.findFirst({
    where: { id: planId, ...ownerMembershipPlanScope(adminUserId) },
    select: { id: true, name: true },
  });

  if (!existing) {
    throw new HttpError(404, "Membership plan not found.");
  }

  if (input.name !== undefined) {
    const name = normalizePlanName(input.name);
    if (!name) {
      throw new HttpError(400, "Plan name is required.");
    }
    await assertUniquePlanName(adminUserId, name, planId);
  }

  if (input.benefits) {
    validateBenefits(input.benefits);
  }

  if (input.prices) {
    validatePrices(input.prices);
  }

  await prisma.$transaction(async (tx) => {
    await tx.gymMembershipPlan.update({
      where: { id: planId },
      data: {
        ...(input.name !== undefined
          ? { name: normalizePlanName(input.name) }
          : {}),
        ...(input.category !== undefined
          ? { category: input.category?.trim() || null }
          : {}),
        ...(input.description !== undefined
          ? { description: input.description?.trim() || null }
          : {}),
      },
    });

    if (input.benefits) {
      const now = new Date();
      await tx.gymMembershipPlanBenefit.updateMany({
        where: { planId, deletedAt: null },
        data: { deletedAt: now },
      });

      await tx.gymMembershipPlanBenefit.createMany({
        data: input.benefits.map((label, index) => ({
          id: randomUUID(),
          planId,
          label: label.trim(),
          sortOrder: index,
        })),
      });
    }

    if (input.prices) {
      for (const p of input.prices) {
        await tx.gymMembershipPlanDurationPrice.upsert({
          where: {
            planId_duration: {
              planId,
              duration: p.duration,
            },
          },
          create: {
            id: randomUUID(),
            planId,
            duration: p.duration,
            priceInr: new Prisma.Decimal(p.priceInr),
          },
          update: {
            priceInr: new Prisma.Decimal(p.priceInr),
            deletedAt: null,
          },
        });
      }
    }
  });

  return getMembershipPlanForOwner(adminUserId, planId);
}

export async function softDeleteMembershipPlanForOwner(
  adminUserId: string,
  planId: string,
) {
  const plan = await prisma.gymMembershipPlan.findFirst({
    where: { id: planId, ...ownerMembershipPlanScope(adminUserId) },
    select: { id: true },
  });

  if (!plan) {
    throw new HttpError(404, "Membership plan not found.");
  }

  const activeMemberCount = await prisma.member.count({
    where: {
      ...memberScope(adminUserId),
      membershipPlanId: planId,
    },
  });

  if (activeMemberCount > 0) {
    throw new HttpError(
      400,
      "Cannot delete a plan while members are still assigned to it.",
    );
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.gymMembershipPlan.update({
      where: { id: planId },
      data: { deletedAt: now },
    }),
    prisma.gymMembershipPlanBenefit.updateMany({
      where: { planId, deletedAt: null },
      data: { deletedAt: now },
    }),
    prisma.gymMembershipPlanDurationPrice.updateMany({
      where: { planId, deletedAt: null },
      data: { deletedAt: now },
    }),
  ]);
}

export async function getPlanPriceForEnrollment(
  adminUserId: string,
  planId: string,
  duration: MemberBillingDuration,
) {
  const plan = await prisma.gymMembershipPlan.findFirst({
    where: { id: planId, ...ownerMembershipPlanScope(adminUserId) },
    select: {
      id: true,
      name: true,
      prices: {
        where: { duration, deletedAt: null },
        select: { priceInr: true },
        take: 1,
      },
    },
  });

  if (!plan) {
    throw new HttpError(404, "Membership plan not found.");
  }

  const priceRow = plan.prices[0];
  if (!priceRow) {
    throw new HttpError(
      400,
      "No INR price configured for this plan and duration. Add it under Pricing first.",
    );
  }

  return {
    planId: plan.id,
    planName: plan.name,
    listPrice: new Prisma.Decimal(priceRow.priceInr.toString()),
  };
}

export async function resolvePlanByNameForOwner(
  adminUserId: string,
  planName: string,
) {
  const name = normalizePlanName(planName);
  if (!name) {
    throw new HttpError(400, "membershipPlanName is required.");
  }

  const plan = await prisma.gymMembershipPlan.findFirst({
    where: {
      ...ownerMembershipPlanScope(adminUserId),
      name: { equals: name, mode: "insensitive" },
    },
    select: { id: true, name: true },
  });

  if (!plan) {
    throw new HttpError(404, `Membership plan "${name}" not found.`);
  }

  return plan;
}

/** Default INR prices for new gym owners. */
const DEFAULT_INR_BY_DURATION: Record<MemberBillingDuration, string> = {
  ONE_MONTH: "999.00",
  THREE_MONTHS: "2699.00",
  SIX_MONTHS: "4999.00",
  TWELVE_MONTHS: "8999.00",
};

const DEFAULT_BENEFITS = [
  "Full gym access",
  "Locker facility",
];

export async function seedDefaultMembershipPlanForOwner(adminUserId: string) {
  const existing = await prisma.gymMembershipPlan.findFirst({
    where: ownerMembershipPlanScope(adminUserId),
    select: { id: true },
  });

  if (existing) return existing.id;

  const planId = randomUUID();
  const prices = Object.entries(DEFAULT_INR_BY_DURATION) as [
    MemberBillingDuration,
    string,
  ][];

  await prisma.gymMembershipPlan.create({
    data: {
      id: planId,
      adminUserId,
      name: "Standard",
      description: "Default membership plan",
      sortOrder: 0,
      benefits: {
        create: DEFAULT_BENEFITS.map((label, index) => ({
          id: randomUUID(),
          label,
          sortOrder: index,
        })),
      },
      prices: {
        create: prices.map(([duration, priceInr]) => ({
          id: randomUUID(),
          duration,
          priceInr: new Prisma.Decimal(priceInr),
        })),
      },
    },
  });

  return planId;
}
