import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { getOwnerAnalytics } from "@/server/gym-owner/analytics.service";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "gym_owner") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const analytics = await getOwnerAnalytics(session.user.id);
  return NextResponse.json(analytics);
}
