import { NextResponse } from "next/server";
import { z } from "zod";

import { withGymOwner } from "@/lib/api-auth";
import { HttpError } from "@/lib/http/errors";
import {
  dateSchema,
  imageDataUrlSchema,
  memberBillingDurationSchema,
  parseRequestBody,
  paymentStatusSchema,
  priceInrSchema,
} from "@/lib/validation";
import { renewMemberForOwner } from "@/server/gym-owner/member.service";

const MAX_RENEWAL_BODY_BYTES = 8 * 1024 * 1024;

const renewalSchema = z
  .object({
    membershipPlanId: z.string().uuid("Select a membership plan"),
    billingDuration: memberBillingDurationSchema,
    periodStart: dateSchema,
    paymentStatus: paymentStatusSchema.default("NOT_DONE"),
    discountInr: priceInrSchema.optional().transform((v) => v ?? undefined),
    amountPaid: priceInrSchema.optional().transform((v) => v ?? undefined),
    upiScreenshot: imageDataUrlSchema("UPI screenshot"),
  })
  .refine(
    (data) => {
      const amountPaid = data.amountPaid === undefined ? 0 : Number(data.amountPaid);
      if (data.paymentStatus === "PARTIAL" && amountPaid <= 0) return false;
      if (
        (data.paymentStatus === "DONE" ||
          data.paymentStatus === "PARTIAL" ||
          amountPaid > 0) &&
        !data.upiScreenshot
      ) {
        return false;
      }
      return true;
    },
    {
      message:
        "Partial payments need an amount paid, and recorded payments need a UPI screenshot.",
      path: ["paymentStatus"],
    },
  );

async function POSTHandler(request: Request, userId: string, context?: unknown) {
  const { id } = await (context as { params: Promise<{ id: string }> }).params;
  const { data, error } = await parseRequestBody(request, renewalSchema, {
    maxBytes: MAX_RENEWAL_BODY_BYTES,
  });
  if (error || !data) {
    return NextResponse.json(error || { message: "Invalid request" }, { status: error?.status ?? 400 });
  }

  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data.periodStart);
  if (!parts) {
    return NextResponse.json(
      { message: "periodStart must be YYYY-MM-DD." },
      { status: 400 },
    );
  }

  const periodStart = new Date(
    Date.UTC(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3])),
  );

  try {
    const result = await renewMemberForOwner(userId, id, {
      membershipPlanId: data.membershipPlanId,
      billingDuration: data.billingDuration,
      periodStart,
      paymentStatus: data.paymentStatus,
      discountInr: data.discountInr,
      amountPaid: data.amountPaid,
      upiScreenshot: data.upiScreenshot,
    });

    return NextResponse.json({
      message: "Membership renewed.",
      renewal: {
        id: result.renewal.id,
        membershipPlanId: result.renewal.membershipPlanId,
        membershipPlanName: result.renewal.membershipPlanName,
        billingDuration: result.renewal.billingDuration,
        planPrice: result.renewal.planPrice.toString(),
        discountInr: result.renewal.discountInr.toString(),
        amountPaid: result.renewal.amountPaid.toString(),
        paymentStatus: result.renewal.paymentStatus,
        periodStart: result.renewal.periodStart.toISOString().slice(0, 10),
        periodEnd: result.renewal.periodEnd.toISOString().slice(0, 10),
      },
      member: {
        id: result.member.id,
        membershipPlanId: result.member.membershipPlanId,
        membershipPlanName: result.member.membershipPlanName,
        billingDuration: result.member.billingDuration,
        planPrice: result.member.planPrice.toString(),
        discountInr: result.member.discountInr.toString(),
        amountPaid: result.member.amountPaid.toString(),
        paymentStatus: result.member.paymentStatus,
        startDate: result.member.startDate.toISOString().slice(0, 10),
        endDate: result.member.endDate.toISOString().slice(0, 10),
        membershipStatus: result.member.membershipStatus,
      },
    });
  } catch (e) {
    if (e instanceof HttpError) {
      return NextResponse.json({ message: e.message }, { status: e.status });
    }
    throw e;
  }
}

export const POST = withGymOwner(POSTHandler);
