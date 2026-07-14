import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";

import { withSuperAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { parseRequestBody } from "@/lib/validation";

// GET /api/superadmin/gym-owners/[id]/members
async function GETHandler(
  _request: Request,
  _userId: string,
  context: unknown,
) {
  const { id: ownerId } = (context as { params: { id: string } }).params;

  const members = await prisma.member.findMany({
    where: { adminUserId: ownerId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      fullName: true,
      phone: true,
      email: true,
      billingDuration: true,
      membershipPlanName: true,
      planPrice: true,
      discountInr: true,
      startDate: true,
      endDate: true,
      membershipStatus: true,
      paymentStatus: true,
      whatsappEnabled: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    members: members.map((m) => ({
      ...m,
      planPrice: m.planPrice.toString(),
      discountInr: m.discountInr.toString(),
      startDate: m.startDate.toISOString(),
      endDate: m.endDate.toISOString(),
      createdAt: m.createdAt.toISOString(),
    })),
  });
}

const addMemberSchema = z.object({
  fullName: z.string().trim().min(1, "Name is required"),
  phone: z.string().trim().min(6, "Phone is required"),
  email: z.string().trim().email().optional().or(z.literal("")).transform(v => v || null),
  billingDuration: z.enum(["ONE_MONTH", "THREE_MONTHS", "SIX_MONTHS", "TWELVE_MONTHS"]),
  planPrice: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid price"),
  startDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  endDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
});

// POST /api/superadmin/gym-owners/[id]/members
async function POSTHandler(
  request: Request,
  _userId: string,
  context: unknown,
) {
  const { id: ownerId } = (context as { params: { id: string } }).params;

  const owner = await prisma.adminUser.findUnique({ where: { id: ownerId, deletedAt: null } });
  if (!owner) {
    return NextResponse.json({ message: "Gym owner not found" }, { status: 404 });
  }

  const { data, error } = await parseRequestBody(request, addMemberSchema);
  if (error || !data) {
    return NextResponse.json(error || { message: "Invalid request" }, { status: 400 });
  }

  const toDate = (s: string) => new Date(s.includes("T") ? s : `${s}T00:00:00.000Z`);

  const member = await prisma.member.create({
    data: {
      id: randomUUID(),
      adminUserId: ownerId,
      fullName: data.fullName,
      phone: data.phone,
      email: data.email ?? null,
      billingDuration: data.billingDuration,
      planPrice: data.planPrice,
      startDate: toDate(data.startDate),
      endDate: toDate(data.endDate),
    },
  });

  return NextResponse.json({ message: "Member added", id: member.id }, { status: 201 });
}

export const GET = withSuperAdmin(GETHandler);
export const POST = withSuperAdmin(POSTHandler);
