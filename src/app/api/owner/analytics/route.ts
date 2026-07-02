import { NextResponse } from "next/server";

import { withGymOwnerFeature } from "@/lib/api-auth";
import { getOwnerAnalytics } from "@/server/gym-owner/analytics.service";

async function GETHandler(_request: Request, userId: string) {
  const analytics = await getOwnerAnalytics(userId);
  return NextResponse.json(analytics);
}

export const GET = withGymOwnerFeature("ANALYTICS", GETHandler);
