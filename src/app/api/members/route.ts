import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function GET() {
  const members = await prisma.member.findMany({
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
    members.map((m) => ({
      ...m,
      planPrice: m.planPrice.toString(),
      startDate: m.startDate.toISOString().slice(0, 10),
      endDate: m.endDate.toISOString().slice(0, 10),
    })),
  );
}

