import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { listGymOwnersWithStats } from "@/server/superadmin/gym-owner.service";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "superadmin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
