import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { guardGymOwnerPlanFeature } from "@/lib/plan-features/guard";
import { getOwnerAnalytics } from "@/server/gym-owner/analytics.service";

export async function GET() {
  const session = await getServerSession(authOptions);
  const denied = await guardGymOwnerPlanFeature(session, "ANALYTICS");
  if (denied) return denied;

  const analytics = await getOwnerAnalytics(session!.user!.id);
  return NextResponse.json(analytics);
}
