import { NextResponse } from "next/server";
import { z } from "zod";

import { HttpError } from "@/lib/http/errors";
import { withGymOwnerFeature } from "@/lib/api-auth";
import { parseRequestBody } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";
import {
  sendReminderForOwnerMember,
  type ReminderType,
} from "@/server/gym-owner/reminder.service";

const reminderSchema = z.object({
  reminderType: z.enum(["MEMBERSHIP_EXPIRY", "PAYMENT_DUE"] as [ReminderType, ...ReminderType[]]).default("MEMBERSHIP_EXPIRY"),
  message: z.string().trim().optional(),
});

async function POSTHandler(request: Request, userId: string, context?: unknown) {
  const { id } = await (context as { params: Promise<{ id: string }> }).params;
  const { data, error } = await parseRequestBody(request, reminderSchema);
  if (error || !data) {
    return NextResponse.json(error || { message: "Invalid request" }, { status: 400 });
  }

  // Rate limit: 3 reminders per member per minute
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const rateLimitResult = await rateLimit(`reminder:${userId}:${id}:${ip}`, { limit: 3, interval: 60 });
  if (!rateLimitResult.success) {
    return NextResponse.json({ message: "Too many requests. Please try again later." }, { status: 429 });
  }

  try {
    const log = await sendReminderForOwnerMember(userId, id, {
      reminderType: data.reminderType,
      message: data.message,
    });
    return NextResponse.json({
      reminder: {
        id: log.id,
        channel: log.channel,
        status: log.status,
        sentAt: log.sentAt.toISOString(),
        reminderType: data.reminderType,
      },
    });
  } catch (e) {
    if (e instanceof HttpError) {
      return NextResponse.json({ message: e.message }, { status: e.status });
    }
    throw e;
  }
}

export const POST = withGymOwnerFeature("MANUAL_MEMBER_REMINDERS", POSTHandler);
