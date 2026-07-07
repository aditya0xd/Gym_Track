import { NextResponse } from "next/server";
import { verifyRazorpayWebhookSignature } from "@/server/integrations/razorpay";
import { handleRazorpayWebhookEvent } from "@/server/gym-owner/manage-plan.service";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    try {
      const isValid = verifyRazorpayWebhookSignature(rawBody, signature);
      if (!isValid) {
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 400 },
        );
      }
    } catch (err: any) {
      if (err.message === "RAZORPAY_WEBHOOK_SECRET is missing.") {
        console.error("Razorpay Webhook Secret not configured.");
        return NextResponse.json(
          { error: "Webhook not configured" },
          { status: 500 },
        );
      }
      throw err;
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;

    await handleRazorpayWebhookEvent(event, payload);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Razorpay webhook error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
