import { NextResponse } from "next/server";

import { withSuperAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

// DELETE /api/superadmin/gym-owners/[id]/members/[memberId]
async function DELETEHandler(
  _request: Request,
  _userId: string,
  context: unknown,
) {
  const { id: ownerId, memberId } = await (context as { params: Promise<{ id: string; memberId: string }> }).params;

  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: { id: true, adminUserId: true },
  });

  if (!member) {
    return NextResponse.json({ message: "Member not found" }, { status: 404 });
  }

  if (member.adminUserId !== ownerId) {
    return NextResponse.json({ message: "Member does not belong to this gym" }, { status: 403 });
  }

  // Soft delete the member
  await prisma.member.update({
    where: { id: memberId },
    data: { deletedAt: new Date() },
  });

  return NextResponse.json({ message: "Member deleted" });
}

export const DELETE = withSuperAdmin(DELETEHandler);
