import type {
  MemberBillingDuration,
  PaymentStatus,
} from "@/generated/prisma/client";
import { membershipEndDateInclusive } from "@/lib/billing/membership-dates";
import { HttpError } from "@/lib/http/errors";
import { prisma } from "@/lib/prisma";

export async function listMembersForOwner(adminUserId: string) {
  return prisma.member.findMany({
    where: { adminUserId },
    orderBy: { startDate: "desc" },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      billingDuration: true,
      planPrice: true,
      paymentStatus: true,
      memberPhoto: true,
      upiScreenshot: true,
      startDate: true,
      endDate: true,
      whatsappEnabled: true,
    },
  });
}

export async function getMemberForOwner(adminUserId: string, memberId: string) {
  return prisma.member.findFirst({
    where: { id: memberId, adminUserId },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      billingDuration: true,
      planPrice: true,
      paymentStatus: true,
      memberPhoto: true,
      upiScreenshot: true,
      startDate: true,
      endDate: true,
      whatsappEnabled: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export type CreateMemberInput = {
  fullName: string;
  email: string | null;
  phone: string;
  billingDuration: MemberBillingDuration;
  startDate: Date;
  whatsappEnabled: boolean;
  paymentStatus: PaymentStatus;
  memberPhoto: string | null;
  upiScreenshot: string | null;
};

export async function createMemberForOwner(
  adminUserId: string,
  input: CreateMemberInput,
) {
  const priceRow = await prisma.gymOwnerDurationPrice.findUnique({
    where: {
      adminUserId_duration: {
        adminUserId,
        duration: input.billingDuration,
      },
    },
  });

  if (!priceRow) {
    throw new HttpError(
      400,
      "No INR price configured for this duration. Add it under Pricing first.",
    );
  }

  const start = new Date(
    Date.UTC(
      input.startDate.getUTCFullYear(),
      input.startDate.getUTCMonth(),
      input.startDate.getUTCDate(),
    ),
  );

  const endDate = membershipEndDateInclusive(start, input.billingDuration);

  return prisma.member.create({
    data: {
      fullName: input.fullName.trim(),
      email: input.email?.trim() ? input.email.trim().toLowerCase() : null,
      phone: input.phone.trim(),
      billingDuration: input.billingDuration,
      planPrice: priceRow.priceInr,
      paymentStatus: input.paymentStatus,
      memberPhoto: input.memberPhoto,
      upiScreenshot: input.upiScreenshot,
      startDate: start,
      endDate: endDate,
      whatsappEnabled: input.whatsappEnabled,
      adminUser: { connect: { id: adminUserId } },
    },
  });
}
