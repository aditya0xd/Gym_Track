import type { OwnerSubscriptionPlan } from "@/generated/prisma/client";
import { HttpError } from "@/lib/http/errors";
import { prisma } from "@/lib/prisma";
import { getPlatformPlanPriceMap } from "@/server/platform-pricing.service";

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export async function getOwnerManagePlanData(adminUserId: string) {
  const owner = await prisma.adminUser.findUnique({
    where: { id: adminUserId },
    select: { id: true, subscriptionPlan: true, trialEndsAt: true },
  });
  if (!owner) throw new HttpError(404, "Gym owner not found.");

  const prices = await getPlatformPlanPriceMap();
  const invoices = await prisma.ownerBillingInvoice.findMany({
    where: { adminUserId },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      plan: true,
      amountInr: true,
      status: true,
      dueDate: true,
      paidAt: true,
      createdAt: true,
    },
  });

  return {
    currentPlan: owner.subscriptionPlan,
    trialEndsAt: owner.trialEndsAt,
    planPrices: prices,
    invoices,
  };
}

export async function changeOwnerPlan(adminUserId: string, nextPlan: OwnerSubscriptionPlan) {
  const owner = await prisma.adminUser.findUnique({
    where: { id: adminUserId },
    select: { id: true, subscriptionPlan: true },
  });
  if (!owner) throw new HttpError(404, "Gym owner not found.");

  const prices = await getPlatformPlanPriceMap();
  const amountInr = prices[nextPlan];

  const now = new Date();
  await prisma.$transaction([
    prisma.adminUser.update({
      where: { id: adminUserId },
      data: { subscriptionPlan: nextPlan },
    }),
    prisma.ownerBillingInvoice.create({
      data: {
        adminUserId,
        plan: nextPlan,
        amountInr,
        status: "PENDING",
        dueDate: addDays(now, 3),
      },
    }),
  ]);
}

export async function payInvoice(adminUserId: string, invoiceId: string) {
  const invoice = await prisma.ownerBillingInvoice.findFirst({
    where: { id: invoiceId, adminUserId },
    select: { id: true, status: true },
  });
  if (!invoice) throw new HttpError(404, "Invoice not found.");
  if (invoice.status !== "PENDING") {
    throw new HttpError(400, "Only pending invoices can be paid.");
  }

  return prisma.ownerBillingInvoice.update({
    where: { id: invoiceId },
    data: { status: "PAID", paidAt: new Date() },
    select: {
      id: true,
      status: true,
      paidAt: true,
    },
  });
}
