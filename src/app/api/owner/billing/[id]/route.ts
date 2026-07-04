import { NextResponse } from "next/server";

import { HttpError } from "@/lib/http/errors";
import { withGymOwner } from "@/lib/api-auth";
import { deleteOwnerInvoice } from "@/server/gym-owner/manage-plan.service";

async function DELETEHandler(_request: Request, userId: string, context?: unknown) {
  const { id } = await (context as { params: Promise<{ id: string }> }).params;
  try {
    await deleteOwnerInvoice(userId, id);
    return NextResponse.json({ message: "Invoice removed." });
  } catch (e) {
    if (e instanceof HttpError) {
      return NextResponse.json({ message: e.message }, { status: e.status });
    }
    throw e;
  }
}

export const DELETE = withGymOwner(DELETEHandler);
