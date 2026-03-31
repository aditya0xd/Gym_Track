import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { MEMBER_BILLING_DURATION_OPTIONS } from "@/lib/constants/billing";
import { HttpError } from "@/lib/http/errors";
import {
  createMemberForOwner,
  listMembersForOwner,
} from "@/server/gym-owner/member.service";
import type {
  MemberBillingDuration,
  PaymentStatus,
} from "@/generated/prisma/client";

function isDuration(v: unknown): v is MemberBillingDuration {
  return MEMBER_BILLING_DURATION_OPTIONS.some((o) => o.value === v);
}

function isPaymentStatus(v: unknown): v is PaymentStatus {
  return v === "DONE" || v === "NOT_DONE";
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "gym_owner") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const members = await listMembersForOwner(session.user.id);
  return NextResponse.json(
    members.map((m) => ({
      ...m,
      planPrice: m.planPrice.toString(),
      startDate: m.startDate.toISOString().slice(0, 10),
      endDate: m.endDate.toISOString().slice(0, 10),
    })),
  );
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "gym_owner") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as Record<string, unknown>;

  const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
  const emailRaw = typeof body.email === "string" ? body.email.trim() : "";
  const email = emailRaw === "" ? null : emailRaw.toLowerCase();
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const billingDuration = body.billingDuration;
  const whatsappEnabled =
    typeof body.whatsappEnabled === "boolean" ? body.whatsappEnabled : true;
  const paymentStatusRaw = body.paymentStatus;
  const paymentStatus: PaymentStatus = isPaymentStatus(paymentStatusRaw)
    ? paymentStatusRaw
    : "NOT_DONE";
  const memberPhoto =
    typeof body.memberPhoto === "string" && body.memberPhoto.trim()
      ? body.memberPhoto
      : null;
  const upiScreenshot =
    typeof body.upiScreenshot === "string" && body.upiScreenshot.trim()
      ? body.upiScreenshot
      : null;
  const startDateRaw = typeof body.startDate === "string" ? body.startDate : "";

  if (!fullName || !phone || !isDuration(billingDuration) || !startDateRaw) {
    return NextResponse.json(
      { message: "fullName, phone, billingDuration, and startDate are required." },
      { status: 400 },
    );
  }

  if (paymentStatus === "DONE" && !upiScreenshot) {
    return NextResponse.json(
      { message: "UPI screenshot is required when payment is marked done." },
      { status: 400 },
    );
  }

  const startParts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(startDateRaw);
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
    const member = await createMemberForOwner(session.user.id, {
      fullName,
      email,
      phone,
      billingDuration,
      startDate,
      whatsappEnabled,
      paymentStatus,
      memberPhoto,
      upiScreenshot,
    });

    return NextResponse.json(
      {
        id: member.id,
        fullName: member.fullName,
        email: member.email,
        phone: member.phone,
        billingDuration: member.billingDuration,
        planPrice: member.planPrice.toString(),
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
