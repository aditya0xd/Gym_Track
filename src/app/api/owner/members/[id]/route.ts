import { NextResponse } from "next/server";
import { z } from "zod";

import { withGymOwner } from "@/lib/api-auth";
import { parseRequestBody } from "@/lib/validation";
import { getMemberForOwner, updateMemberForOwner } from "@/server/gym-owner/member.service";

async function GETHandler(_request: Request, userId: string, context?: unknown) {
  const { id } = await (context as { params: Promise<{ id: string }> }).params;
  const member = await getMemberForOwner(userId, id);
  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...member,
    planPrice: member.planPrice.toString(),
    discountInr: member.discountInr.toString(),
    amountPaid: member.amountPaid.toString(),
    startDate: member.startDate.toISOString(),
    endDate: member.endDate.toISOString(),
    pausedAt: member.pausedAt?.toISOString() ?? null,
    createdAt: member.createdAt.toISOString(),
    updatedAt: member.updatedAt.toISOString(),
    reminders: member.reminders.map((r) => ({
      ...r,
      sentAt: r.sentAt.toISOString(),
    })),
    renewals: member.renewals.map((r) => ({
      ...r,
      planPrice: r.planPrice.toString(),
      discountInr: r.discountInr.toString(),
      amountPaid: r.amountPaid.toString(),
      periodStart: r.periodStart.toISOString().slice(0, 10),
      periodEnd: r.periodEnd.toISOString().slice(0, 10),
      paidAt: r.paidAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    })),
  });
}

const updateMemberSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email().nullable().optional().or(z.literal("")),
  phone: z.string().min(10, "Valid phone number required"),
  whatsappEnabled: z.boolean(),
  memberPhoto: z.string().nullable().optional(),
});

async function PATCHHandler(request: Request, userId: string, context?: unknown) {
  const { id } = await (context as { params: Promise<{ id: string }> }).params;
  const { data, error } = await parseRequestBody(request, updateMemberSchema);
  
  if (error || !data) {
    return NextResponse.json(error || { message: "Invalid request" }, { status: error?.status ?? 400 });
  }

  try {
    const payload: any = {
      fullName: data.fullName,
      email: data.email && data.email !== "" ? data.email : null,
      phone: data.phone,
      whatsappEnabled: data.whatsappEnabled,
    };
    
    if (data.memberPhoto !== undefined) {
      payload.memberPhoto = data.memberPhoto;
    }

    const updatedMember = await updateMemberForOwner(userId, id, payload);
    
    return NextResponse.json({ message: "Member updated successfully", member: updatedMember });
  } catch (e: any) {
    return NextResponse.json(
      { message: e.message || "Failed to update member" },
      { status: e.status || 500 }
    );
  }
}

export const GET = withGymOwner(GETHandler);
export const PATCH = withGymOwner(PATCHHandler);
