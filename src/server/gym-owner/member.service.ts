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
import {
  getCachedOwnerMembersListJson,
  invalidateOwnerMembersListCache,
  setCachedOwnerMembersListJson,
} from "@/lib/cache/owner-members-list";
import { HttpError } from "@/lib/http/errors";
import { prisma } from "@/lib/prisma";
import { memberScope, ownerDurationPriceScope } from "@/lib/tenant/scope";

const memberListSelect = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
  billingDuration: true,
  planPrice: true,
  discountInr: true,
  amountPaid: true,
  paymentStatus: true,
  memberPhoto: true,
  startDate: true,
  endDate: true,
  membershipStatus: true,
  pausedAt: true,
  whatsappEnabled: true,
} as const;

type OwnerMemberListItem = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string;
  billingDuration: MemberBillingDuration;
  planPrice: Prisma.Decimal;
  discountInr: Prisma.Decimal;
  amountPaid: Prisma.Decimal;
  paymentStatus: PaymentStatus;
  memberPhoto: string | null;
  startDate: Date;
  endDate: Date;
  membershipStatus: "ACTIVE" | "PAUSED";
  pausedAt: Date | null;
  whatsappEnabled: boolean;
};

type CachedMemberListRow = {
  startDate: string;
  endDate: string;
  pausedAt: string | null;
  planPrice: string;
  discountInr: string;
  amountPaid?: string;
} & Omit<
  OwnerMemberListItem,
  "startDate" | "endDate" | "pausedAt" | "planPrice" | "discountInr" | "amountPaid"
>;

function reviveOwnerMemberList(json: string): OwnerMemberListItem[] {
  const rows = JSON.parse(json) as CachedMemberListRow[];
  return rows.map((row) => {
    const safeRow = {
      ...row,
    } as CachedMemberListRow & { upiScreenshot?: unknown };
    delete safeRow.upiScreenshot;

    return {
      ...safeRow,
      startDate: new Date(row.startDate),
      endDate: new Date(row.endDate),
      pausedAt: row.pausedAt ? new Date(row.pausedAt) : null,
      planPrice: new Prisma.Decimal(row.planPrice),
      discountInr: new Prisma.Decimal(row.discountInr),
      amountPaid: new Prisma.Decimal(
        row.amountPaid ?? (row.paymentStatus === "DONE" ? row.planPrice : "0"),
      ),
    };
  });
}

async function queryMembersForOwner(adminUserId: string): Promise<OwnerMemberListItem[]> {
  return prisma.member.findMany({
    where: memberScope(adminUserId),
    orderBy: { startDate: "desc" },
    select: memberListSelect,
  });
}

export async function listMembersForOwner(adminUserId: string) {
  const cached = await getCachedOwnerMembersListJson(adminUserId);
  if (cached) {
    return reviveOwnerMemberList(cached);
  }

  const members = await queryMembersForOwner(adminUserId);
  await setCachedOwnerMembersListJson(adminUserId, JSON.stringify(members));
  return members;
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
      amountPaid: true,
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
      renewals: {
        orderBy: { createdAt: "desc" },
        take: 25,
        select: {
          id: true,
          billingDuration: true,
          planPrice: true,
          discountInr: true,
          amountPaid: true,
          periodStart: true,
          periodEnd: true,
          paymentStatus: true,
          paymentProvider: true,
          paidAt: true,
          createdAt: true,
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
  /** INR already collected from the member; defaults from paymentStatus when omitted. */
  amountPaid?: string;
};

export type RenewMemberInput = {
  billingDuration: MemberBillingDuration;
  periodStart: Date;
  paymentStatus: PaymentStatus;
  upiScreenshot: string | null;
  discountInr?: string;
  amountPaid?: string;
};

function parseMoney(raw: string | undefined, label: string): Prisma.Decimal {
  const s = raw?.trim() ?? "";
  if (s === "") return new Prisma.Decimal(0);
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) {
    throw new HttpError(400, `${label} must be zero or a positive number.`);
  }
  return new Prisma.Decimal(s);
}

function isUniqueConstraintError(err: unknown) {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002"
  );
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
  const discountInr = parseMoney(input.discountInr, "Discount");
  if (discountInr.gt(listPrice)) {
    throw new HttpError(
      400,
      "Discount cannot be greater than the list price for this membership duration.",
    );
  }
  const planPrice = listPrice.minus(discountInr);
  const requestedAmountPaid =
    input.amountPaid === undefined
      ? input.paymentStatus === "DONE"
        ? planPrice
        : new Prisma.Decimal(0)
      : parseMoney(input.amountPaid, "Amount paid");

  if (requestedAmountPaid.gt(planPrice)) {
    throw new HttpError(400, "Amount paid cannot be greater than the final membership amount.");
  }

  const paymentStatus: PaymentStatus = requestedAmountPaid.eq(0)
    ? "NOT_DONE"
    : requestedAmountPaid.eq(planPrice)
      ? "DONE"
      : "PARTIAL";

  let member;
  try {
    member = await prisma.$transaction(async (tx) => {
      const createdMember = await tx.member.create({
        data: {
          fullName: input.fullName.trim(),
          email: input.email?.trim() ? input.email.trim().toLowerCase() : null,
          phone: input.phone.trim(),
          billingDuration: input.billingDuration,
          planPrice,
          discountInr,
          amountPaid: requestedAmountPaid,
          paymentStatus,
          memberPhoto: input.memberPhoto,
          upiScreenshot: input.upiScreenshot,
          startDate: start,
          endDate: endDate,
          whatsappEnabled: input.whatsappEnabled,
          adminUser: { connect: { id: adminUserId } },
        },
      });

      await tx.membershipRenewal.create({
        data: {
          memberId: createdMember.id,
          billingDuration: input.billingDuration,
          planPrice,
          discountInr,
          amountPaid: requestedAmountPaid,
          periodStart: start,
          periodEnd: endDate,
          paymentStatus,
          paymentProvider: "MANUAL",
          upiScreenshot: input.upiScreenshot,
          paidAt: requestedAmountPaid.gt(0) ? new Date() : null,
        },
      });

      return createdMember;
    });
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      throw new HttpError(409, "A member with this email already exists.");
    }
    throw err;
  }

  await invalidateOwnerMembersListCache(adminUserId);
  return member;
}

export async function renewMemberForOwner(
  adminUserId: string,
  memberId: string,
  input: RenewMemberInput,
) {
  const member = await prisma.member.findFirst({
    where: { id: memberId, ...memberScope(adminUserId) },
    select: { id: true, endDate: true, membershipStatus: true },
  });
  if (!member) throw new HttpError(404, "Member not found.");

  const today = utcDayStart(new Date());
  if (member.endDate >= today) {
    throw new HttpError(400, "Only expired memberships can be renewed from here.");
  }
  if (member.membershipStatus === "PAUSED") {
    throw new HttpError(400, "Resume the paused membership before renewing.");
  }

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

  const periodStart = utcDayStart(input.periodStart);
  if (periodStart <= member.endDate) {
    throw new HttpError(
      400,
      "Renewal start date must be after the current membership end date.",
    );
  }

  const periodEnd = membershipEndDateInclusive(periodStart, input.billingDuration);
  const listPrice = new Prisma.Decimal(priceRow.priceInr.toString());
  const discountInr = parseMoney(input.discountInr, "Discount");
  if (discountInr.gt(listPrice)) {
    throw new HttpError(
      400,
      "Discount cannot be greater than the list price for this membership duration.",
    );
  }

  const planPrice = listPrice.minus(discountInr);
  const requestedAmountPaid =
    input.amountPaid === undefined
      ? input.paymentStatus === "DONE"
        ? planPrice
        : new Prisma.Decimal(0)
      : parseMoney(input.amountPaid, "Amount paid");

  if (requestedAmountPaid.gt(planPrice)) {
    throw new HttpError(400, "Amount paid cannot be greater than the final renewal amount.");
  }

  const paymentStatus: PaymentStatus = requestedAmountPaid.eq(0)
    ? "NOT_DONE"
    : requestedAmountPaid.eq(planPrice)
      ? "DONE"
      : "PARTIAL";

  const result = await prisma.$transaction(async (tx) => {
    const renewal = await tx.membershipRenewal.create({
      data: {
        memberId,
        billingDuration: input.billingDuration,
        planPrice,
        discountInr,
        amountPaid: requestedAmountPaid,
        periodStart,
        periodEnd,
        paymentStatus,
        paymentProvider: "MANUAL",
        upiScreenshot: input.upiScreenshot,
        paidAt: requestedAmountPaid.gt(0) ? new Date() : null,
      },
    });

    const updatedMember = await tx.member.update({
      where: { id: memberId },
      data: {
        billingDuration: input.billingDuration,
        planPrice,
        discountInr,
        amountPaid: requestedAmountPaid,
        paymentStatus,
        upiScreenshot: input.upiScreenshot,
        startDate: periodStart,
        endDate: periodEnd,
        membershipStatus: "ACTIVE",
        pausedAt: null,
      },
      select: {
        id: true,
        billingDuration: true,
        planPrice: true,
        discountInr: true,
        amountPaid: true,
        paymentStatus: true,
        upiScreenshot: true,
        startDate: true,
        endDate: true,
        membershipStatus: true,
      },
    });

    return { renewal, member: updatedMember };
  });

  await invalidateOwnerMembersListCache(adminUserId);
  return result;
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

  const updated = await prisma.member.update({
    where: { id: memberId },
    data: { membershipStatus: "PAUSED", pausedAt: new Date() },
    select: {
      id: true,
      membershipStatus: true,
      pausedAt: true,
      endDate: true,
    },
  });
  await invalidateOwnerMembersListCache(adminUserId);
  return updated;
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

  const updated = await prisma.member.update({
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
  await invalidateOwnerMembersListCache(adminUserId);
  return updated;
}
