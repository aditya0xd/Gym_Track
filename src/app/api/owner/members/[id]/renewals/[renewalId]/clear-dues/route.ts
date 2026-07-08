import { NextResponse } from "next/server";
import { z } from "zod";

import { withGymOwner } from "@/lib/api-auth";
import { HttpError } from "@/lib/http/errors";
import { prisma } from "@/lib/prisma";
import { parseRequestBody, paymentStatusSchema } from "@/lib/validation";

const clearDuesSchema = z.object({
  paymentStatus: paymentStatusSchema,
});

async function PATCHHandler(request: Request, userId: string, context?: unknown) {
  const { id, renewalId } = await (context as { params: Promise<{ id: string; renewalId: string }> }).params;
  const { data, error } = await parseRequestBody(request, clearDuesSchema);
  if (error || !data) {
    return NextResponse.json(error || { message: "Invalid request" }, { status: error?.status ?? 400 });
  }

  try {
    if (renewalId === "initial") {
      const member = await prisma.member.findUnique({ where: { id } });
      if (!member) throw new HttpError(404, "Member not found");
      if (member.adminUserId !== userId) throw new HttpError(403, "Unauthorized");
      if (member.paymentStatus === "DONE") throw new HttpError(400, "Payment already completed");

      const updatedMember = await prisma.member.update({
        where: { id },
        data: {
          paymentStatus: data.paymentStatus,
          amountPaid: member.planPrice,
        },
      });

      // Try to find the corresponding initial renewal to update it as well
      const initialRenewal = await prisma.membershipRenewal.findFirst({
        where: { memberId: id },
        orderBy: { createdAt: "asc" },
      });

      if (initialRenewal && initialRenewal.paymentStatus !== "DONE") {
        await prisma.membershipRenewal.update({
          where: { id: initialRenewal.id },
          data: {
            paymentStatus: data.paymentStatus,
            amountPaid: initialRenewal.planPrice,
            paidAt: new Date(),
          },
        });
      }

      return NextResponse.json({
        message: "Payment cleared successfully",
        renewal: {
          id: "initial",
          paymentStatus: updatedMember.paymentStatus,
          amountPaid: updatedMember.amountPaid.toString(),
          paidAt: new Date().toISOString().slice(0, 10),
        },
      });
    }

    const renewal = await prisma.membershipRenewal.findUnique({
      where: { id: renewalId },
      include: { member: true },
    });

    if (!renewal) {
      throw new HttpError(404, "Renewal not found");
    }

    if (renewal.member.adminUserId !== userId) {
      throw new HttpError(403, "Unauthorized");
    }

    if (renewal.paymentStatus === "DONE") {
      throw new HttpError(400, "Payment already completed");
    }

    const updatedRenewal = await prisma.membershipRenewal.update({
      where: { id: renewalId },
      data: {
        paymentStatus: data.paymentStatus,
        amountPaid: renewal.planPrice,
        paidAt: new Date(),
      },
    });

    // If this is the latest renewal, also update the member's payment status
    if (renewal.periodStart.getTime() === renewal.member.startDate.getTime()) {
      await prisma.member.update({
        where: { id },
        data: {
          paymentStatus: data.paymentStatus,
          amountPaid: renewal.planPrice,
        },
      });
    }

    return NextResponse.json({
      message: "Payment cleared successfully",
      renewal: {
        id: updatedRenewal.id,
        paymentStatus: updatedRenewal.paymentStatus,
        amountPaid: updatedRenewal.amountPaid.toString(),
        paidAt: updatedRenewal.paidAt?.toISOString().slice(0, 10),
      },
    });
  } catch (e) {
    if (e instanceof HttpError) {
      return NextResponse.json({ message: e.message }, { status: e.status });
    }
    throw e;
  }
}

export const PATCH = withGymOwner(PATCHHandler);
