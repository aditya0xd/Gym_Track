import { NextResponse } from "next/server";

import { HttpError } from "@/lib/http/errors";
import { withGymOwner } from "@/lib/api-auth";
import {
  attachRazorpayOrderToInvoice,
  createRazorpayOrderForOwnerInvoice,
} from "@/server/gym-owner/manage-plan.service";
import {
  createRazorpayOrder,
  getRazorpayPublicConfig,
} from "@/server/integrations/razorpay";

async function POSTHandler(_request: Request, userId: string, context?: unknown) {
  const { id } = await (context as { params: Promise<{ id: string }> }).params;
  try {
    const invoice = await createRazorpayOrderForOwnerInvoice(userId, id);
    const amountInPaise = Math.round(Number(invoice.amountInr) * 100);
    const order = await createRazorpayOrder({
      amountInPaise,
      receipt: `invoice_${invoice.id}`,
      notes: {
        invoiceId: invoice.id,
        adminUserId: invoice.adminUserId,
        plan: invoice.plan,
      },
    });

    await attachRazorpayOrderToInvoice(userId, id, order.id);
    const { keyId } = getRazorpayPublicConfig();

    return NextResponse.json({
      keyId,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      invoiceId: invoice.id,
    });
  } catch (e) {
    if (e instanceof HttpError) {
      return NextResponse.json({ message: e.message }, { status: e.status });
    }
    return NextResponse.json(
      { message: "Unable to initialize Razorpay order." },
      { status: 500 },
    );
  }
}

export const POST = withGymOwner(POSTHandler);
