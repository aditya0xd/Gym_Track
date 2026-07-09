import { NextResponse } from "next/server";

import { withSuperAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

async function GETHandler() {
  const invoices = await prisma.ownerBillingInvoice.findMany({
    where: { deletedAt: null },
    include: {
      adminUser: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({
    invoices: invoices.map((inv) => ({
      id: inv.id,
      adminUserId: inv.adminUserId,
      ownerName: inv.adminUser.name,
      ownerEmail: inv.adminUser.email,
      plan: inv.plan,
      amountInr: inv.amountInr.toString(),
      status: inv.status,
      dueDate: inv.dueDate.toISOString().slice(0, 10),
      paidAt: inv.paidAt?.toISOString() ?? null,
      createdAt: inv.createdAt.toISOString(),
    })),
  });
}

export const GET = withSuperAdmin(GETHandler);
