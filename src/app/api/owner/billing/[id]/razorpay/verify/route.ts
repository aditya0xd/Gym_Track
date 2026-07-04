import { NextResponse } from "next/server";
import { z } from "zod";

import { HttpError } from "@/lib/http/errors";
import { withGymOwner } from "@/lib/api-auth";
import { parseRequestBody } from "@/lib/validation";
import { verifyRazorpaySignature } from "@/server/integrations/razorpay";
import { markInvoicePaidFromRazorpay } from "@/server/gym-owner/manage-plan.service";

const razorpayVerifySchema = z.object({
  razorpayOrderId: z.string().min(1, "razorpayOrderId is required"),
  razorpayPaymentId: z.string().min(1, "razorpayPaymentId is required"),
  razorpaySignature: z.string().min(1, "razorpaySignature is required"),
});

async function POSTHandler(request: Request, userId: string, context?: unknown) {
  const { id } = await (context as { params: Promise<{ id: string }> }).params;
  const { data, error } = await parseRequestBody(request, razorpayVerifySchema);
  if (error || !data) {
    return NextResponse.json(error || { message: "Invalid request" }, { status: 400 });
  }

  try {
    const ok = verifyRazorpaySignature({
      razorpayOrderId: data.razorpayOrderId,
      razorpayPaymentId: data.razorpayPaymentId,
      razorpaySignature: data.razorpaySignature,
    });
    if (!ok) {
      return NextResponse.json({ message: "Invalid payment signature." }, { status: 400 });
    }

    await markInvoicePaidFromRazorpay({
      adminUserId: userId,
      invoiceId: id,
      razorpayOrderId: data.razorpayOrderId,
      razorpayPaymentId: data.razorpayPaymentId,
      razorpaySignature: data.razorpaySignature,
    });

    return NextResponse.json({ message: "Payment verified and invoice marked paid." });
  } catch (e) {
    if (e instanceof HttpError) {
      return NextResponse.json({ message: e.message }, { status: e.status });
    }
    throw e;
  }
}

export const POST = withGymOwner(POSTHandler);
