import { NextResponse } from "next/server";

import { HttpError } from "@/lib/http/errors";
import { withSuperAdmin } from "@/lib/api-auth";
import { approveInvoiceBySuperAdmin } from "@/server/gym-owner/manage-plan.service";

async function POSTHandler(
  _request: Request,
  _userId: string,
  context?: unknown,
) {
  const { invoiceId } = await (
    context as { params: Promise<{ invoiceId: string }> }
  ).params;

  try {
    const result = await approveInvoiceBySuperAdmin(invoiceId);
    return NextResponse.json({
      message: "Invoice approved and plan updated.",
      ...result,
    });
  } catch (e) {
    if (e instanceof HttpError) {
      return NextResponse.json({ message: e.message }, { status: e.status });
    }
    throw e;
  }
}

export const POST = withSuperAdmin(POSTHandler);
