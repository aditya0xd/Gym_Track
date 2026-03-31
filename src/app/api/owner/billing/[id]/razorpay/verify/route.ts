import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { HttpError } from "@/lib/http/errors";
import { verifyRazorpaySignature } from "@/server/integrations/razorpay";
import { markInvoicePaidFromRazorpay } from "@/server/gym-owner/manage-plan.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "gym_owner") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = (await request.json()) as Record<string, unknown>;
  const razorpayOrderId =
    typeof body.razorpayOrderId === "string" ? body.razorpayOrderId : "";
  const razorpayPaymentId =
    typeof body.razorpayPaymentId === "string" ? body.razorpayPaymentId : "";
  const razorpaySignature =
    typeof body.razorpaySignature === "string" ? body.razorpaySignature : "";

  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    return NextResponse.json(
      { message: "Missing Razorpay verification payload." },
      { status: 400 },
    );
  }

  try {
    const ok = verifyRazorpaySignature({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });
    if (!ok) {
      return NextResponse.json({ message: "Invalid payment signature." }, { status: 400 });
    }

    await markInvoicePaidFromRazorpay({
      adminUserId: session.user.id,
      invoiceId: id,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });

    return NextResponse.json({ message: "Payment verified and invoice marked paid." });
  } catch (e) {
    if (e instanceof HttpError) {
      return NextResponse.json({ message: e.message }, { status: e.status });
    }
    throw e;
  }
}
