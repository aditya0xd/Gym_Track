import type {
  MemberBillingDuration,
  PaymentStatus,
} from "@/generated/prisma/client";
import { Prisma } from "@/generated/prisma/client";
import {
  addCalendarDaysUtc,
  calendarDaysBetweenUtc,
  membershipEndDateInclusive,
  utcDayStart,
} from "@/lib/billing/membership-dates";
import { HttpError } from "@/lib/http/errors";
import { prisma } from "@/lib/prisma";
import { memberScope, ownerDurationPriceScope } from "@/lib/tenant/scope";

export async function listMembersForOwner(adminUserId: string) {
  return prisma.member.findMany({
    where: memberScope(adminUserId),
    orderBy: { startDate: "desc" },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      billingDuration: true,
      planPrice: true,
      discountInr: true,
      paymentStatus: true,
      memberPhoto: true,
      upiScreenshot: true,
      startDate: true,
      endDate: true,
      membershipStatus: true,
      pausedAt: true,
      whatsappEnabled: true,
    },
  });
}

export async function getMemberForOwner(adminUserId: string, memberId: string) {
  return prisma.member.findFirst({
    where: { id: memberId, ...memberScope(adminUserId) },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      billingDuration: true,
      planPrice: true,
      discountInr: true,
      paymentStatus: true,
      memberPhoto: true,
      upiScreenshot: true,
      startDate: true,
      endDate: true,
      membershipStatus: true,
      pausedAt: true,
      whatsappEnabled: true,
      createdAt: true,
      updatedAt: true,
      reminders: {
        orderBy: { sentAt: "desc" },
        take: 10,
        select: {
          id: true,
          channel: true,
          status: true,
          sentAt: true,
          message: true,
        },
      },
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
  /** INR off the list price for this duration; default 0. */
  discountInr?: string;
};

function parseDiscountInr(raw: string | undefined): Prisma.Decimal {
  const s = raw?.trim() ?? "";
  if (s === "") return new Prisma.Decimal(0);
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) {
    throw new HttpError(400, "Discount must be zero or a positive number.");
  }
  return new Prisma.Decimal(s);
}

export async function createMemberForOwner(
  adminUserId: string,
  input: CreateMemberInput,
) {
  const priceRow = await prisma.gymOwnerDurationPrice.findFirst({
    where: {
      ...ownerDurationPriceScope(adminUserId),
      duration: input.billingDuration,
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

  const listPrice = new Prisma.Decimal(priceRow.priceInr.toString());
  const discountInr = parseDiscountInr(input.discountInr);
  if (discountInr.gt(listPrice)) {
    throw new HttpError(
      400,
      "Discount cannot be greater than the list price for this membership duration.",
    );
  }
  const planPrice = listPrice.minus(discountInr);

  return prisma.member.create({
    data: {
      fullName: input.fullName.trim(),
      email: input.email?.trim() ? input.email.trim().toLowerCase() : null,
      phone: input.phone.trim(),
      billingDuration: input.billingDuration,
      planPrice,
      discountInr,
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

export async function pauseMembershipForOwner(adminUserId: string, memberId: string) {
  const member = await prisma.member.findFirst({
    where: { id: memberId, ...memberScope(adminUserId) },
    select: { id: true, membershipStatus: true, endDate: true },
  });
  if (!member) throw new HttpError(404, "Member not found.");
  if (member.membershipStatus === "PAUSED") {
    throw new HttpError(400, "Membership is already paused.");
  }
  const today = utcDayStart(new Date());
  if (member.endDate < today) {
    throw new HttpError(400, "Cannot pause an expired membership.");
  }

  return prisma.member.update({
    where: { id: memberId },
    data: { membershipStatus: "PAUSED", pausedAt: new Date() },
    select: {
      id: true,
      membershipStatus: true,
      pausedAt: true,
      endDate: true,
    },
  });
}

export async function resumeMembershipForOwner(adminUserId: string, memberId: string) {
  const member = await prisma.member.findFirst({
    where: { id: memberId, ...memberScope(adminUserId) },
    select: { id: true, membershipStatus: true, endDate: true, pausedAt: true },
  });
  if (!member) throw new HttpError(404, "Member not found.");
  if (member.membershipStatus !== "PAUSED" || !member.pausedAt) {
    throw new HttpError(400, "Membership is not paused.");
  }

  const today = utcDayStart(new Date());
  const pauseDay = utcDayStart(member.pausedAt);
  const daysFrozen = calendarDaysBetweenUtc(pauseDay, today);
  const newEndDate = addCalendarDaysUtc(member.endDate, daysFrozen);

  return prisma.member.update({
    where: { id: memberId },
    data: {
      membershipStatus: "ACTIVE",
      pausedAt: null,
      endDate: newEndDate,
    },
    select: {
      id: true,
      membershipStatus: true,
      pausedAt: true,
      endDate: true,
    },
  });
}
