import { NextResponse } from "next/server";
import { z } from "zod";

import { HttpError } from "@/lib/http/errors";
import { withGymOwner } from "@/lib/api-auth";
import { parseRequestBody, dateSchema, imageDataUrlSchema, memberBillingDurationSchema, paymentStatusSchema, priceInrSchema } from "@/lib/validation";
import {
  createMemberForOwner,
  listMembersForOwner,
} from "@/server/gym-owner/member.service";

const MAX_MEMBER_CREATE_BODY_BYTES = 10 * 1024 * 1024;

const createMemberSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required"),
  email: z.string().trim().toLowerCase().email().nullable().optional().transform(v => v ?? null),
  phone: z.string().trim().min(1, "Phone is required"),
  billingDuration: memberBillingDurationSchema,
  whatsappEnabled: z.boolean().default(true),
  paymentStatus: paymentStatusSchema.default("NOT_DONE"),
  memberPhoto: imageDataUrlSchema("Member photo"),
  upiScreenshot: imageDataUrlSchema("UPI screenshot"),
  discountInr: priceInrSchema.optional().transform(v => v ?? undefined),
  startDate: dateSchema,
}).refine(data => {
  if (data.paymentStatus === "DONE" && !data.upiScreenshot) {
    return false;
  }
  return true;
}, {
  message: "UPI screenshot is required when payment is marked done",
  path: ["upiScreenshot"],
});

async function GETHandler(_request: Request, userId: string) {
  const members = await listMembersForOwner(userId);
  return NextResponse.json(
    members.map((m) => ({
      ...m,
      planPrice: m.planPrice.toString(),
      discountInr: m.discountInr.toString(),
      startDate: m.startDate.toISOString().slice(0, 10),
      endDate: m.endDate.toISOString().slice(0, 10),
      pausedAt: m.pausedAt?.toISOString() ?? null,
    })),
  );
}

async function POSTHandler(request: Request, userId: string) {
  const { data, error } = await parseRequestBody(request, createMemberSchema, {
    maxBytes: MAX_MEMBER_CREATE_BODY_BYTES,
  });
  if (error || !data) {
    return NextResponse.json(error || { message: "Invalid request" }, { status: error?.status ?? 400 });
  }

  const startParts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data.startDate);
  if (!startParts) {
    return NextResponse.json(
      { message: "startDate must be YYYY-MM-DD." },
      { status: 400 },
    );
  }

  const startDate = new Date(
    Date.UTC(
      Number(startParts[1]),
      Number(startParts[2]) - 1,
      Number(startParts[3]),
    ),
  );

  try {
    const member = await createMemberForOwner(userId, {
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      billingDuration: data.billingDuration,
      startDate,
      whatsappEnabled: data.whatsappEnabled,
      paymentStatus: data.paymentStatus,
      memberPhoto: data.memberPhoto,
      upiScreenshot: data.upiScreenshot,
      discountInr: data.discountInr,
    });

    return NextResponse.json(
      {
        id: member.id,
        fullName: member.fullName,
        email: member.email,
        phone: member.phone,
        billingDuration: member.billingDuration,
        planPrice: member.planPrice.toString(),
        discountInr: member.discountInr.toString(),
        paymentStatus: member.paymentStatus,
        memberPhoto: member.memberPhoto,
        upiScreenshot: member.upiScreenshot,
        startDate: member.startDate.toISOString().slice(0, 10),
        endDate: member.endDate.toISOString().slice(0, 10),
        whatsappEnabled: member.whatsappEnabled,
      },
      { status: 201 },
    );
  } catch (e) {
    if (e instanceof HttpError) {
      return NextResponse.json({ message: e.message }, { status: e.status });
    }
    throw e;
  }
}

export const GET = withGymOwner(GETHandler);
export const POST = withGymOwner(POSTHandler);
