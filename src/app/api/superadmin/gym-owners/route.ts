import { NextResponse } from "next/server";

import { withSuperAdmin } from "@/lib/api-auth";
import { listGymOwnersWithStats } from "@/server/superadmin/gym-owner.service";

async function GETHandler() {
  const rows = await listGymOwnersWithStats();
  return NextResponse.json({
    gymOwners: rows.map((g) => ({
      id: g.id,
      name: g.name,
      email: g.email,
      subscriptionPlan: g.subscriptionPlan,
      trialEndsAt: g.trialEndsAt?.toISOString() ?? null,
      memberCount: g._count.members,
      createdAt: g.createdAt.toISOString(),
    })),
  });
}

export const GET = withSuperAdmin(GETHandler);
