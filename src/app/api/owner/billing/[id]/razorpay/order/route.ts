import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { HttpError } from "@/lib/http/errors";
import {
  attachRazorpayOrderToInvoice,
  createRazorpayOrderForOwnerInvoice,
} from "@/server/gym-owner/manage-plan.service";
import {
  createRazorpayOrder,
  getRazorpayPublicConfig,
} from "@/server/integrations/razorpay";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "gym_owner") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  try {
    const invoice = await createRazorpayOrderForOwnerInvoice(session.user.id, id);
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

    await attachRazorpayOrderToInvoice(session.user.id, id, order.id);
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
