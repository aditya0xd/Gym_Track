import { NextResponse } from "next/server";

import { HttpError } from "@/lib/http/errors";
import { withGymOwner } from "@/lib/api-auth";
import { payInvoice } from "@/server/gym-owner/manage-plan.service";

async function POSTHandler(_request: Request, userId: string, context?: unknown) {
  const { id } = await (context as { params: Promise<{ id: string }> }).params;
  try {
    const invoice = await payInvoice(userId, id);
    return NextResponse.json({
      invoice: {
        ...invoice,
        paidAt: invoice.paidAt?.toISOString() ?? null,
      },
    });
  } catch (e) {
    if (e instanceof HttpError) {
      return NextResponse.json({ message: e.message }, { status: e.status });
    }
    throw e;
  }
}

export const POST = withGymOwner(POSTHandler);
