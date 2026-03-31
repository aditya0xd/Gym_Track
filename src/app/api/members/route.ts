import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const members = await prisma.member.findMany({
    where: { adminUserId: session.user.id },
    take: 50,
    orderBy: { startDate: "desc" },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      planType: true,
      planPrice: true,
      startDate: true,
      endDate: true,
      whatsappEnabled: true,
    },
  });

  return NextResponse.json(
    members.map((m: (typeof members)[number]) => ({
      ...m,
      planPrice: m.planPrice.toString(),
      startDate: m.startDate.toISOString().slice(0, 10),
      endDate: m.endDate.toISOString().slice(0, 10),
    })),
  );
}

