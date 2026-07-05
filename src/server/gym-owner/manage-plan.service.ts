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
  // Create invoice with target plan, but don't update subscription plan yet
  // Plan will be updated only after payment is successful
  await prisma.ownerBillingInvoice.create({
    data: {
      adminUserId,
      plan: nextPlan,
      amountInr,
      status: "PENDING",
      dueDate: addDays(now, 3),
    },
  });

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
    select: { id: true, status: true, plan: true },
  });
  if (!invoice) throw new HttpError(404, "Invoice not found.");
  if (invoice.status !== "PENDING") {
    throw new HttpError(400, "Only pending invoices can be paid.");
  }

  // Update both invoice status and subscription plan when payment is made
  await prisma.$transaction([
    prisma.ownerBillingInvoice.update({
      where: { id: invoiceId },
      data: { status: "PAID", paidAt: new Date() },
    }),
    prisma.adminUser.update({
      where: { id: adminUserId },
      data: { subscriptionPlan: invoice.plan },
    }),
  ]);

  // Invalidate cache so next JWT callback fetches fresh data
  await invalidateCachedOwner(adminUserId);

  return {
    id: invoice.id,
    status: "PAID" as const,
    paidAt: new Date(),
  };
}

// Superadmin function to approve an invoice (manual payment approval)
export async function approveInvoiceBySuperAdmin(invoiceId: string) {
  const invoice = await prisma.ownerBillingInvoice.findUnique({
    where: { id: invoiceId },
    select: { id: true, status: true, plan: true, adminUserId: true },
  });
  if (!invoice) throw new HttpError(404, "Invoice not found.");
  if (invoice.status !== "PENDING") {
    throw new HttpError(400, "Only pending invoices can be approved.");
  }

  // Update both invoice status and subscription plan when approved
  await prisma.$transaction([
    prisma.ownerBillingInvoice.update({
      where: { id: invoiceId },
      data: { status: "PAID", paidAt: new Date(), provider: "MANUAL" },
    }),
    prisma.adminUser.update({
      where: { id: invoice.adminUserId },
      data: { subscriptionPlan: invoice.plan },
    }),
  ]);

  // Invalidate cache so next JWT callback fetches fresh data
  await invalidateCachedOwner(invoice.adminUserId);

  return {
    id: invoice.id,
    status: "PAID" as const,
    paidAt: new Date(),
  };
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
    select: { id: true, status: true, plan: true },
  });
  if (!invoice) throw new HttpError(404, "Invoice not found for Razorpay order.");
  if (invoice.status === "PAID") return invoice;
  if (invoice.status !== "PENDING") throw new HttpError(400, "Invoice is not payable.");

  // Update both invoice status and subscription plan when payment is made
  await prisma.$transaction([
    prisma.ownerBillingInvoice.update({
      where: { id: input.invoiceId },
      data: {
        status: "PAID",
        paidAt: new Date(),
        provider: "RAZORPAY",
        razorpayPaymentId: input.razorpayPaymentId,
        razorpaySignature: input.razorpaySignature,
      },
    }),
    prisma.adminUser.update({
      where: { id: input.adminUserId },
      data: { subscriptionPlan: invoice.plan },
    }),
  ]);

  // Invalidate cache so next JWT callback fetches fresh data
  await invalidateCachedOwner(input.adminUserId);

  return {
    id: invoice.id,
    status: "PAID" as const,
  };
}

interface RazorpayWebhookPayload {
  payload: {
    payment: {
      entity: {
        order_id?: string;
        id: string;
      };
    };
  };
}

export async function handleRazorpayWebhookEvent(event: string, payload: RazorpayWebhookPayload) {
  if (event !== "payment.captured" && event !== "payment.failed") {
    return;
  }

  const payment = payload.payload.payment.entity;
  const razorpayOrderId = payment.order_id;
  const razorpayPaymentId = payment.id;

  if (!razorpayOrderId) return;

  const invoice = await prisma.ownerBillingInvoice.findUnique({
    where: { razorpayOrderId },
    select: { id: true, status: true },
  });

  if (!invoice) {
    console.warn(`[Webhook] No invoice found for Razorpay order: ${razorpayOrderId}`);
    return;
  }

  if (invoice.status !== "PENDING") {
    // Already processed
    return;
  }

  if (event === "payment.captured") {
    await prisma.ownerBillingInvoice.update({
      where: { id: invoice.id },
      data: {
        status: "PAID",
        paidAt: new Date(),
        provider: "RAZORPAY",
        razorpayPaymentId,
      },
    });
  } else if (event === "payment.failed") {
    await prisma.ownerBillingInvoice.update({
      where: { id: invoice.id },
      data: {
        status: "FAILED",
        provider: "RAZORPAY",
        razorpayPaymentId,
      },
    });
  }
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
