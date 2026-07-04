import type { OwnerSubscriptionPlan } from "@/generated/prisma/client";
import { HttpError } from "@/lib/http/errors";
import { invalidateCachedOwner } from "@/lib/auth-cache";
import { prisma } from "@/lib/prisma";

export async function listGymOwnersWithStats() {
  return prisma.adminUser.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      subscriptionPlan: true,
      trialEndsAt: true,
      createdAt: true,
      _count: {
        select: {
          members: { where: { deletedAt: null } },
        },
      },
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
  const existing = await prisma.adminUser.findFirst({
    where: { id: gymOwnerId, deletedAt: null },
  });
  if (!existing) {
    throw new HttpError(404, "Gym owner not found.");
  }

  const updated = await prisma.adminUser.update({
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

  // Invalidate cache so next JWT callback fetches fresh data
  await invalidateCachedOwner(gymOwnerId);

  return updated;
}
