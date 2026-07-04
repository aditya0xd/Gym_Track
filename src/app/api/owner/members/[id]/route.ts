import { NextResponse } from "next/server";

import { withGymOwner } from "@/lib/api-auth";
import { getMemberForOwner } from "@/server/gym-owner/member.service";

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
    startDate: member.startDate.toISOString(),
    endDate: member.endDate.toISOString(),
    pausedAt: member.pausedAt?.toISOString() ?? null,
    createdAt: member.createdAt.toISOString(),
    updatedAt: member.updatedAt.toISOString(),
    reminders: member.reminders.map((r) => ({
      ...r,
      sentAt: r.sentAt.toISOString(),
    })),
  });
}

export const GET = withGymOwner(GETHandler);
