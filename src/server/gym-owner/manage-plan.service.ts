import type { OwnerSubscriptionPlan } from "@/generated/prisma/client";
import { HttpError } from "@/lib/http/errors";
import { invalidateCachedOwner } from "@/lib/auth-cache";
import { prisma } from "@/lib/prisma";
import { activeOwnerWhere, ownerInvoiceScope } from "@/lib/tenant/scope";
import { getPlatformPlanPriceMap } from "@/server/platform-pricing.service";

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export async function getOwnerManagePlanData(adminUserId: string) {
  const owner = await prisma.adminUser.findUnique({
    where: activeOwnerWhere(adminUserId),
    select: { id: true, subscriptionPlan: true, trialEndsAt: true },
  });
  if (!owner) throw new HttpError(404, "Gym owner not found.");

  const prices = await getPlatformPlanPriceMap();
  const invoices = await prisma.ownerBillingInvoice.findMany({
    where: ownerInvoiceScope(adminUserId),
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
    where: activeOwnerWhere(adminUserId),
    select: { id: true, subscriptionPlan: true },
  });
  if (!owner) throw new HttpError(404, "Gym owner not found.");

  if (owner.subscriptionPlan === nextPlan) {
    return { changed: false as const };
  }

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

  // Invalidate cache so next JWT callback fetches fresh data
  await invalidateCachedOwner(adminUserId);

  return { changed: true as const };
}

export async function deleteOwnerInvoice(adminUserId: string, invoiceId: string) {
  const invoice = await prisma.ownerBillingInvoice.findFirst({
    where: { id: invoiceId, ...ownerInvoiceScope(adminUserId) },
    select: { id: true, status: true },
  });
  if (!invoice) throw new HttpError(404, "Invoice not found.");
  if (invoice.status !== "PENDING") {
    throw new HttpError(400, "Only pending invoices can be deleted.");
  }

  await prisma.ownerBillingInvoice.update({
    where: { id: invoiceId },
    data: { deletedAt: new Date() },
  });
}

export async function payInvoice(adminUserId: string, invoiceId: string) {
  const invoice = await prisma.ownerBillingInvoice.findFirst({
    where: { id: invoiceId, ...ownerInvoiceScope(adminUserId) },
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

export async function createRazorpayOrderForOwnerInvoice(adminUserId: string, invoiceId: string) {
  const invoice = await prisma.ownerBillingInvoice.findFirst({
    where: { id: invoiceId, ...ownerInvoiceScope(adminUserId) },
    select: { id: true, amountInr: true, status: true, adminUserId: true, plan: true },
  });
  if (!invoice) throw new HttpError(404, "Invoice not found.");
  if (invoice.status !== "PENDING") {
    throw new HttpError(400, "Only pending invoices can be paid.");
  }
  return invoice;
}

export async function attachRazorpayOrderToInvoice(
  adminUserId: string,
  invoiceId: string,
  razorpayOrderId: string,
) {
  return prisma.ownerBillingInvoice.updateMany({
    where: { id: invoiceId, ...ownerInvoiceScope(adminUserId), status: "PENDING" },
    data: { razorpayOrderId, provider: "RAZORPAY" },
  });
}

export async function markInvoicePaidFromRazorpay(input: {
  adminUserId: string;
  invoiceId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}) {
  const invoice = await prisma.ownerBillingInvoice.findFirst({
    where: {
      id: input.invoiceId,
      ...ownerInvoiceScope(input.adminUserId),
      razorpayOrderId: input.razorpayOrderId,
    },
    select: { id: true, status: true },
  });
  if (!invoice) throw new HttpError(404, "Invoice not found for Razorpay order.");
  if (invoice.status === "PAID") return invoice;
  if (invoice.status !== "PENDING") throw new HttpError(400, "Invoice is not payable.");

  return prisma.ownerBillingInvoice.update({
    where: { id: input.invoiceId },
    data: {
      status: "PAID",
      paidAt: new Date(),
      provider: "RAZORPAY",
      razorpayPaymentId: input.razorpayPaymentId,
      razorpaySignature: input.razorpaySignature,
    },
    select: { id: true, status: true },
  });
}

export async function getInvoiceReceiptForOwner(adminUserId: string, invoiceId: string) {
  const invoice = await prisma.ownerBillingInvoice.findFirst({
    where: { id: invoiceId, ...ownerInvoiceScope(adminUserId) },
    select: {
      id: true,
      plan: true,
      amountInr: true,
      status: true,
      dueDate: true,
      paidAt: true,
      createdAt: true,
      adminUser: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  if (!invoice) throw new HttpError(404, "Invoice not found.");
  return invoice;
}
