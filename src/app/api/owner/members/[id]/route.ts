import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { getMemberForOwner } from "@/server/gym-owner/member.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "gym_owner") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const member = await getMemberForOwner(session.user.id, id);
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
