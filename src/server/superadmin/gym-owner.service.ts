import type { OwnerSubscriptionPlan } from "@/generated/prisma/client";
import { HttpError } from "@/lib/http/errors";
import { prisma } from "@/lib/prisma";

export async function listGymOwnersWithStats() {
  return prisma.adminUser.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      subscriptionPlan: true,
      trialEndsAt: true,
      createdAt: true,
      _count: { select: { members: true } },
    },
  });
}

export async function updateGymOwnerSubscription(
  gymOwnerId: string,
  patch: {
    subscriptionPlan?: OwnerSubscriptionPlan;
    trialEndsAt?: Date | null;
  },
) {
  const existing = await prisma.adminUser.findUnique({ where: { id: gymOwnerId } });
  if (!existing) {
    throw new HttpError(404, "Gym owner not found.");
  }

  return prisma.adminUser.update({
    where: { id: gymOwnerId },
    data: {
      ...(patch.subscriptionPlan !== undefined && {
        subscriptionPlan: patch.subscriptionPlan,
      }),
      ...(patch.trialEndsAt !== undefined && { trialEndsAt: patch.trialEndsAt }),
    },
    select: {
      id: true,
      name: true,
      email: true,
      subscriptionPlan: true,
      trialEndsAt: true,
      _count: { select: { members: true } },
    },
  });
}
